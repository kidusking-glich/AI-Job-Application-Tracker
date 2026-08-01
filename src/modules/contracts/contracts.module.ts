import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { TextExtractionService } from './text-extraction.service';
import { OcrService } from './ocr.service';

@Module({
  controllers: [ContractsController],
  providers: [ContractsService, TextExtractionService, OcrService],
  exports: [ContractsService, TextExtractionService, OcrService],
})
export class ContractsModule {}
