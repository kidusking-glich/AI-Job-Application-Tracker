import { IsUUID } from 'class-validator';

export class AnalyzeContractDto {
  @IsUUID()
  contractId: string;
}
