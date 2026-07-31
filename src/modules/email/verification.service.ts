import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma.service';
import { EmailService } from './email.service';
import {
  VERIFICATION_TTL_MS,
  generateVerificationToken,
  hashToken,
  buildVerificationUrl,
} from '../auth/verification.util';

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  buildVerificationUrl(token: string): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    return buildVerificationUrl(frontendUrl, token);
  }

  /** Generate a fresh token, store its hash + expiry on the user, and email the link. */
  async issueAndSendVerification(user: { id: string; email: string }): Promise<void> {
    const token = generateVerificationToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: hashToken(token),
        verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      },
    });

    if (!this.emailService.isConfigured) {
      throw new BadRequestException('Email service is not configured.');
    }

    await this.emailService.sendVerificationEmail(user.email, this.buildVerificationUrl(token));
  }
}
