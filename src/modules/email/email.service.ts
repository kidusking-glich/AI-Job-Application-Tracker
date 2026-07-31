import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  get isConfigured(): boolean {
    return !!this.configService.get<string>('MAILERSEND_API_KEY');
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const apiKey = this.configService.get<string>('MAILERSEND_API_KEY');
    if (!apiKey) {
      throw new Error('MAILERSEND_API_KEY is not configured');
    }

    const fromEmail = this.configService.get<string>(
      'MAILERSEND_FROM_EMAIL',
      'no-reply@yourdomain.com',
    );
    const fromName = this.configService.get<string>('MAILERSEND_FROM_NAME', 'Contract Reader');

    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: options.to }],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`MailerSend error ${response.status}: ${body}`);
      throw new Error(`MailerSend error ${response.status}`);
    }
  }

  async sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Verify your email — Contract Reader',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111827;">Verify your email</h2>
          <p style="color: #4b5563;">Welcome to Contract Reader! Click the button below to verify your email address and activate your account.</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" style="background-color: #1a7f37; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Verify Email</a>
          </p>
          <p style="color: #6b7280; font-size: 13px; word-break: break-all;">Or copy this link:<br/>${verificationUrl}</p>
          <p style="color: #9ca3af; font-size: 12px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
        </div>
      `,
      text: `Welcome to Contract Reader! Verify your email by opening this link: ${verificationUrl}. This link expires in 24 hours.`,
    });
  }
}
