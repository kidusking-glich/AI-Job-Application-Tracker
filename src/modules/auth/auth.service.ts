import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { EmailService } from '../email/email.service';
import { VerificationService } from '../email/verification.service';
import {
  VERIFICATION_TTL_MS,
  generateVerificationToken,
  hashToken,
} from './verification.util';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private verificationService: VerificationService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, name } = signupDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userCount = await this.prisma.user.count();
    const isFirstUser = userCount === 0;

    const verificationToken = generateVerificationToken();
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        isAdmin: isFirstUser,
        verificationToken: hashToken(verificationToken),
        verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      },
    });

    const result = this.sanitizeUser(user);

    // Send the verification email (non-fatal if email service is unavailable)
    const emailConfigured = this.emailService.isConfigured;

    if (emailConfigured) {
      try {
        await this.emailService.sendVerificationEmail(
          user.email,
          this.verificationService.buildVerificationUrl(verificationToken),
        );
        return {
          user: result,
          message: 'Account created. Please check your email to verify your account.',
        };
      } catch (err) {
        this.logger.error(`Failed to send verification email: ${err.message}`);
      }
    } else {
      this.logger.warn('MAILERSEND_API_KEY not set — verification email not sent');
    }

    // Dev convenience: only expose the verification link when email is NOT configured.
    // Never return it in production (email configured but send failed).
    if (!emailConfigured) {
      return {
        user: result,
        message: 'Account created. Please verify your email to activate your account.',
        devVerificationUrl: this.verificationService.buildVerificationUrl(verificationToken),
      };
    }

    return {
      user: result,
      message:
        'Account created, but the verification email could not be sent. Please request a new one from the login page.',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email before signing in. Check your inbox for the verification link.',
      );
    }

    const result = this.sanitizeUser(user);
    const token = this.generateToken(user);

    return {
      access_token: token,
      user: result,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const tokenHash = hashToken(verifyEmailDto.token);

    const user = await this.prisma.user.findFirst({
      where: { verificationToken: tokenHash, deletedAt: null },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });

    return {
      message: 'Email verified successfully. You can now sign in.',
      user: this.sanitizeUser(updated),
    };
  }

  async resendVerification(resendVerificationDto: ResendVerificationDto) {
    const { email } = resendVerificationDto;

    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      // Don't reveal whether the email exists for unverified users
      throw new NotFoundException('No account found for that email.');
    }

    if (user.emailVerifiedAt) {
      return { message: 'Your email is already verified. You can sign in now.' };
    }

    await this.verificationService.issueAndSendVerification(user);

    return { message: 'A new verification email has been sent. Please check your inbox.' };
  }

  private sanitizeUser(user: User) {
    const { password, verificationToken, verificationTokenExpiresAt, ...result } = user;
    return result;
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }
}
