import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestLogCleanupService } from './request-log-cleanup.service';
import { SecurityLogService } from './security-log.service';

@Global()
@Module({
  providers: [PrismaService, RequestLogCleanupService, SecurityLogService],
  exports: [PrismaService, RequestLogCleanupService, SecurityLogService],
})
export class CoreModule {}
