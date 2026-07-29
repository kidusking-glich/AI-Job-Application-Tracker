import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { AiModule } from '../ai/ai.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [AiModule, ContractsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
