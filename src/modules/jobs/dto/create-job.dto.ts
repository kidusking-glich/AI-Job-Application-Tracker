
import { IsString, IsOptional, IsUrl, IsDateString } from 'class-validator';

export class CreateJobDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsString()
  jobType?: string;

  @IsOptional()
  @IsDateString()
  postedAt?: string;

  @IsOptional()
  @IsUrl()
  postedUrl?: string;

  @IsString()
  companyName: string; // We'll use this to create/find the company
}
