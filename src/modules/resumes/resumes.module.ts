
import { Module } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { MulterModule } from '@nestjs/platform-express';
import { RESUME_UPLOAD_DIR } from './constants';

@Module({
  imports: [
    MulterModule.register({
      dest: RESUME_UPLOAD_DIR,
    }),
  ],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}
