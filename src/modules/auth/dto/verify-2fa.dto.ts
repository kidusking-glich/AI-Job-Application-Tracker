import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @IsNotEmpty()
  mfaToken: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}
