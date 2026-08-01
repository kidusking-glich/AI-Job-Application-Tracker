import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

function requestContext(req: Request): RequestContext {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() signupDto: SignupDto, @Req() req: Request) {
    return this.authService.signup(signupDto, requestContext(req));
  }

  @Post('login')
  login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, requestContext(req));
  }

  @Post('verify-email')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  // 2FA management (authenticated user — the super admin)
  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setup2fa(@CurrentUser() user: User, @Req() req: Request) {
    return this.authService.setupTwoFactor(user, requestContext(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  enable2fa(
    @CurrentUser() user: User,
    @Body() dto: TwoFactorCodeDto,
    @Req() req: Request,
  ) {
    return this.authService.enableTwoFactor(
      user,
      dto.code,
      requestContext(req),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disable2fa(
    @CurrentUser() user: User,
    @Body() dto: TwoFactorCodeDto,
    @Req() req: Request,
  ) {
    return this.authService.disableTwoFactor(
      user,
      dto.code,
      requestContext(req),
    );
  }

  // Exchange an MFA ticket + TOTP code for a real session (public)
  @Post('2fa/verify')
  verify2fa(@Body() dto: Verify2faDto, @Req() req: Request) {
    return this.authService.verifyTwoFactor(dto, requestContext(req));
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.resetPassword(
      resetPasswordDto,
      requestContext(req),
    );
  }

  @Post('resend-verification')
  resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendVerificationDto);
  }
}
