import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ContractLanguage } from '@prisma/client';

export class CreateContractDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(50)
  @MaxLength(100000)
  content: string;

  @IsOptional()
  @IsEnum(ContractLanguage)
  language?: ContractLanguage;
}
