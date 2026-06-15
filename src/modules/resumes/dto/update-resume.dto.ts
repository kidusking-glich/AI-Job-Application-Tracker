
import { IsOptional, IsString } from 'class-validator';

export class UpdateResumeDto {
  @IsOptional()
  @IsString()
  title?: string;
}
