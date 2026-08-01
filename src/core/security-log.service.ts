import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

interface SecurityLogData {
  action: string;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Writes security-relevant events (password resets, role changes, transfers,
 * admin CRUD, 2FA changes) to the security_logs table. Logging is best-effort
 * and must never break the primary operation, so failures are caught + logged.
 */
@Injectable()
export class SecurityLogService {
  private readonly logger = new Logger(SecurityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(data: SecurityLogData): Promise<void> {
    try {
      await this.prisma.securityLog.create({
        data: {
          action: data.action,
          userId: data.userId ?? null,
          email: data.email ?? null,
          ip: data.ip ?? null,
          userAgent: data.userAgent ?? null,
          metadata: (data.metadata as any) ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to write security log (${data.action}): ${err.message}`,
      );
    }
  }
}
