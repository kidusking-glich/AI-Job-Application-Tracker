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
import { Verify2faDto } from './dto/verify-2fa.dto';
import { EmailService } from '../email/email.service';
import { SecurityLogService } from '../../core/security-log.service';
import { RateLimiter } from '../../core/rate-limiter';
import { buildTotpUri, generateTotpSecret, verifyTotpCode } from './totp.util';
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
  // Brute-force protection. In-memory sliding-window limiters (single-instance);
  // swap for Redis-backed limiters if the app is scaled horizontally.
  private readonly totpLimiter = new RateLimiter(
    5,
    15 * 60 * 1000,
    'Too many failed two-factor attempts. Please sign in again.',
  );
  private readonly loginLimiter = new RateLimiter(
    5,
    15 * 60 * 1000,
    'Too many failed login attempts. Please try again in a few minutes.',
  );
  private readonly loginIpLimiter = new RateLimiter(
    20,
    15 * 60 * 1000,
    'Too many failed login attempts from this address. Please try again later.',
  );

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private verificationService: VerificationService,
    private configService: ConfigService,
    private securityLogService: SecurityLogService,
  ) {}

  private loginKey(email: string, ip: string): string {
    return `${email.toLowerCase().trim()}|${ip}`;
  }

  async signup(signupDto: SignupDto) {
    const { email, password, name } = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
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
          message:
            'Account created. Please check your email to verify your account.',
        };
      } catch (err) {
        this.logger.error(`Failed to send verification email: ${err.message}`);
      }
    } else {
      this.logger.warn(
        'MAILERSEND_API_KEY not set — verification email not sent',
      );
    }

    // Dev convenience: only expose the verification link when email is NOT configured.
    // Never return it in production (email configured but send failed).
    if (!emailConfigured) {
      return {
        user: result,
        message:
          'Account created. Please verify your email to activate your account.',
        devVerificationUrl:
          this.verificationService.buildVerificationUrl(verificationToken),
      };
    }

    return {
      user: result,
      message:
        'Account created, but the verification email could not be sent. Please request a new one from the login page.',
    };
  }

  async login(
    loginDto: LoginDto,
    context?: { ip?: string; userAgent?: string },
  ) {
    const { email, password } = loginDto;
    const ip = context?.ip ?? 'unknown';
    const accountKey = this.loginKey(email, ip);

    // Throttle before any expensive work: rejected attempts never reach
    // bcrypt and never write a security-log row.
    this.loginLimiter.check(accountKey);
    this.loginIpLimiter.check(ip);

    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      this.loginLimiter.registerFailure(accountKey);
      this.loginIpLimiter.registerFailure(ip);
      await this.securityLogService.log({
        action: 'LOGIN_FAILED',
        email,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
        metadata: { reason: 'invalid_credentials' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.loginLimiter.registerFailure(accountKey);
      this.loginIpLimiter.registerFailure(ip);
      await this.securityLogService.log({
        action: 'LOGIN_FAILED',
        userId: user.id,
        email: user.email,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerifiedAt) {
      await this.securityLogService.log({
        action: 'LOGIN_FAILED',
        userId: user.id,
        email: user.email,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
        metadata: { reason: 'email_not_verified' },
      });
      throw new UnauthorizedException(
        'Please verify your email before signing in. Check your inbox for the verification link.',
      );
    }

    // If the user has 2FA enabled, do not issue a full session yet. Return a
    // short-lived MFA ticket that must be exchanged for a real token via
    // /auth/2fa/verify after proving the TOTP code.
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const mfaToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          mfa: true,
          version: user.tokenVersion,
        },
        { expiresIn: '5m' },
      );
      await this.securityLogService.log({
        action: 'LOGIN_MFA_REQUIRED',
        userId: user.id,
        email: user.email,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
      });
      // Password step proven — reset only the per-account throttle. The shared
      // per-IP counter is intentionally NOT cleared here: an MFA ticket only
      // requires a valid password (2FA not completed), so clearing the IP
      // counter would let an attacker reset it indefinitely. The per-IP
      // counter resets only on a fully completed login.
      this.loginLimiter.clear(accountKey);
      return {
        requiresTwoFactor: true,
        mfaToken,
      };
    }

    const result = this.sanitizeUser(user);
    const token = this.generateToken(user);

    await this.securityLogService.log({
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      email: user.email,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    });
    // Successful login resets the throttling counters. The per-IP clear here is
    // a deliberate tradeoff: it protects legitimate users behind shared NATs
    // from being blocked, at the cost of letting an attacker with one valid
    // credential reset the shared IP counter. The per-account limiter remains
    // the primary defense against credential stuffing on any single account.
    this.loginLimiter.clear(accountKey);
    this.loginIpLimiter.clear(ip);

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

    if (
      user.verificationTokenExpiresAt &&
      user.verificationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Verification token has expired. Please request a new one.',
      );
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
        this.logger.error(
          `Failed to send verification email to ${user.email}: ${err.message}`,
        );
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
          resetPasswordTokenExpiresAt: new Date(
            Date.now() + RESET_PASSWORD_TTL_MS,
          ),
        },
      });

      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:5173',
      );
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

      if (this.emailService.isConfigured) {
        try {
          await this.emailService.sendPasswordResetEmail(user.email, resetUrl);
        } catch (err) {
          // Send failures are logged but never surfaced so the response stays uniform
          this.logger.error(
            `Failed to send password reset email to ${user.email}: ${err.message}`,
          );
        }
      } else {
        this.logger.warn(
          'MAILERSEND_API_KEY not set — password reset email not sent',
        );
      }
    }

    return {
      message:
        'If that email is registered and verified, a password reset link has been sent to your inbox.',
    };
  }

  /** Generate a new TOTP secret for the user (2FA not enabled until verified). */
  async setupTwoFactor(
    user: User,
    context?: { ip?: string; userAgent?: string },
  ) {
    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      },
    });
    const otpauthUrl = buildTotpUri(secret, user.email);
    await this.securityLogService.log({
      action: 'TWO_FA_SETUP',
      userId: user.id,
      email: user.email,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    });
    return { secret, otpauthUrl };
  }

  /** Confirm the TOTP code and enable 2FA. */
  async enableTwoFactor(
    user: User,
    code: string,
    context?: { ip?: string; userAgent?: string },
  ) {
    if (!user.twoFactorSecret) {
      throw new BadRequestException('No 2FA secret found. Run setup first.');
    }
    this.totpLimiter.check(`2fa:${user.id}`);
    const valid = await verifyTotpCode(user.twoFactorSecret, code);
    if (!valid) {
      this.totpLimiter.registerFailure(`2fa:${user.id}`);
      throw new BadRequestException('Invalid two-factor code.');
    }
    this.totpLimiter.clear(`2fa:${user.id}`);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });
    await this.securityLogService.log({
      action: 'TWO_FA_ENABLED',
      userId: user.id,
      email: user.email,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    });
    return { message: 'Two-factor authentication enabled.' };
  }

  /** Verify the current TOTP code and disable 2FA. */
  async disableTwoFactor(
    user: User,
    code: string,
    context?: { ip?: string; userAgent?: string },
  ) {
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not set up.');
    }
    this.totpLimiter.check(`2fa:${user.id}`);
    const valid = await verifyTotpCode(user.twoFactorSecret, code);
    if (!valid) {
      this.totpLimiter.registerFailure(`2fa:${user.id}`);
      throw new BadRequestException('Invalid two-factor code.');
    }
    this.totpLimiter.clear(`2fa:${user.id}`);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: null, twoFactorEnabled: false },
    });
    await this.securityLogService.log({
      action: 'TWO_FA_DISABLED',
      userId: user.id,
      email: user.email,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    });
    return { message: 'Two-factor authentication disabled.' };
  }

  /** Exchange an MFA ticket + TOTP code for a real session token. */
  async verifyTwoFactor(
    verify2faDto: Verify2faDto,
    context?: { ip?: string; userAgent?: string },
  ) {
    const { mfaToken, code } = verify2faDto;
    let payload: { sub?: string; mfa?: boolean; version?: number };
    try {
      payload = this.jwtService.verify(mfaToken);
    } catch {
      throw new UnauthorizedException(
        'Your two-factor session has expired. Please sign in again.',
      );
    }
    if (!payload?.sub || payload.mfa !== true) {
      throw new UnauthorizedException('Invalid two-factor session.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
    });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException(
        'Two-factor authentication is not enabled.',
      );
    }
    if (user.tokenVersion !== payload.version) {
      throw new UnauthorizedException(
        'Session invalidated. Please sign in again.',
      );
    }

    this.totpLimiter.check(user.id);
    const valid = await verifyTotpCode(user.twoFactorSecret, code);
    if (!valid) {
      this.totpLimiter.registerFailure(user.id);
      await this.securityLogService.log({
        action: 'TWO_FA_VERIFY_FAILED',
        userId: user.id,
        email: user.email,
        ip: context?.ip ?? null,
        userAgent: context?.userAgent ?? null,
      });
      throw new UnauthorizedException('Invalid two-factor code.');
    }
    this.totpLimiter.clear(user.id);

    const result = this.sanitizeUser(user);
    const token = this.generateToken(user);
    await this.securityLogService.log({
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      email: user.email,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    });
    return {
      access_token: token,
      user: result,
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    context?: { ip?: string; userAgent?: string },
  ) {
    const { token, password } = resetPasswordDto;
    const tokenHash = hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: tokenHash, deletedAt: null },
    });

    if (!user || !user.resetPasswordTokenExpiresAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    if (user.resetPasswordTokenExpiresAt < new Date()) {
      throw new BadRequestException(
        'Reset token has expired. Please request a new one.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        // Bump the token version so all previously issued JWTs are invalidated.
        tokenVersion: { increment: 1 },
      },
    });

    await this.securityLogService.log({
      action: 'PASSWORD_RESET',
      userId: updated.id,
      email: updated.email,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return { message: 'Password reset successfully. You can now sign in.' };
  }

  private sanitizeUser(user: User) {
    const {
      password,
      verificationToken,
      verificationTokenExpiresAt,
      resetPasswordToken,
      resetPasswordTokenExpiresAt,
      twoFactorSecret,
      ...result
    } = user;
    return result;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      version: user.tokenVersion,
    };
    return this.jwtService.sign(payload);
  }
}
