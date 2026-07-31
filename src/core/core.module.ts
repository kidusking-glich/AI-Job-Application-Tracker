import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestLogCleanupService } from './request-log-cleanup.service';

@Global()
@Module({
  providers: [PrismaService, RequestLogCleanupService],
  exports: [PrismaService],
})
export class CoreModule {}
