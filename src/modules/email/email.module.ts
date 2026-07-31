import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { VerificationService } from './verification.service';

@Module({
  providers: [EmailService, VerificationService],
  exports: [EmailService, VerificationService],
})
export class EmailModule {}
