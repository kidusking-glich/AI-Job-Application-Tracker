import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';
import { VerificationService } from '../email/verification.service';
import {
  VERIFICATION_TTL_MS,
  generateVerificationToken,
  hashToken,
} from './verification.util';
import { User } from '@prisma/client';

const RESET_PASSWORD_TTL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private verificationService: VerificationService,
    private configService: ConfigService,
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
        isSuperAdmin: isFirstUser,
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

    // Anti-enumeration: always respond with the same generic message so the
    // endpoint cannot be used to discover which emails are registered.
    // The email is only actually sent when the account exists and is unverified.
    // Send failures are logged but never surfaced, so the response stays uniform.
    if (user && !user.emailVerifiedAt) {
      try {
        await this.verificationService.issueAndSendVerification(user);
      } catch (err) {
        this.logger.error(`Failed to send verification email to ${user.email}: ${err.message}`);
      }
    }

    return {
      message:
        'If that email is registered and not yet verified, a new verification email has been sent to your inbox.',
    };
  }

  /**
   * Request a password reset link. Anti-enumeration: always responds with the
   * same generic message whether or not the email is registered, and only
   * actually sends the email for a registered, email-verified account.
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (user && user.emailVerifiedAt) {
      const token = generateVerificationToken();
      const tokenHash = hashToken(token);
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: tokenHash,
          resetPasswordTokenExpiresAt: new Date(Date.now() + RESET_PASSWORD_TTL_MS),
        },
      });

      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

      if (this.emailService.isConfigured) {
        try {
          await this.emailService.sendPasswordResetEmail(user.email, resetUrl);
        } catch (err) {
          // Send failures are logged but never surfaced so the response stays uniform
          this.logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
        }
      } else {
        this.logger.warn('MAILERSEND_API_KEY not set — password reset email not sent');
      }
    }

    return {
      message:
        'If that email is registered and verified, a password reset link has been sent to your inbox.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;
    const tokenHash = hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: tokenHash, deletedAt: null },
    });

    if (!user || !user.resetPasswordTokenExpiresAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    if (user.resetPasswordTokenExpiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        // Bump the token version so all previously issued JWTs are invalidated.
        tokenVersion: { increment: 1 },
      },
    });

    return { message: 'Password reset successfully. You can now sign in.' };
  }

  private sanitizeUser(user: User) {
    const { password, verificationToken, verificationTokenExpiresAt, ...result } = user;
    return result;
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, version: user.tokenVersion };
    return this.jwtService.sign(payload);
  }
}
