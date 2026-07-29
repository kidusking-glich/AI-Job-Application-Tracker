import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { TextExtractionService } from './text-extraction.service';
import { OcrService } from './ocr.service';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads/contracts',
    }),
  ],
  controllers: [ContractsController],
  providers: [ContractsService, TextExtractionService, OcrService],
  exports: [ContractsService, TextExtractionService, OcrService],
})
export class ContractsModule {}
