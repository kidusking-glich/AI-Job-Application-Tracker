import { IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { ContractLanguage } from '@prisma/client';

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsEnum(ContractLanguage)
  language?: ContractLanguage;
}
