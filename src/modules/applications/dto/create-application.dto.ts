
import { IsString, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

export class CreateApplicationDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  appliedAt?: string;

  @IsString()
  @IsUUID()
  jobId: string;

  @IsOptional()
  @IsUUID()
  resumeId?: string;

  @IsOptional()
  @IsUUID()
  coverLetterId?: string;
}
