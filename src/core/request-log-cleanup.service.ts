import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_INTERVAL_HOURS = 24;

/**
 * Periodically deletes request_logs rows older than the retention window so the
 * table does not grow unbounded. Runs on app start and then once per day.
 * Configurable via REQUEST_LOG_RETENTION_DAYS and REQUEST_LOG_CLEANUP_INTERVAL_HOURS.
 */
@Injectable()
export class RequestLogCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RequestLogCleanupService.name);
  private timer: NodeJS.Timeout | null = null;

  /** When the most recent cleanup run finished (null before the first run). */
  lastRunAt: Date | null = null;
  /** Rows deleted by the most recent cleanup run. */
  lastDeletedCount = 0;
  /** Whether the most recent run completed without error. */
  lastRunSucceeded: boolean | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    // Run once at startup, then on the configured interval.
    void this.runCleanup();
    const intervalHours = this.configService.get<number>(
      'REQUEST_LOG_CLEANUP_INTERVAL_HOURS',
      DEFAULT_INTERVAL_HOURS,
    );
    this.timer = setInterval(() => {
      void this.runCleanup();
    }, intervalHours * HOUR_MS);
    // Don't keep the process alive just for the cleanup timer.
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runCleanup(): Promise<number> {
    try {
      const retentionDays = this.configService.get<number>(
        'REQUEST_LOG_RETENTION_DAYS',
        DEFAULT_RETENTION_DAYS,
      );
      const cutoff = new Date(Date.now() - retentionDays * 24 * HOUR_MS);

      const { count } = await this.prisma.requestLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      this.lastRunAt = new Date();
      this.lastDeletedCount = count;
      this.lastRunSucceeded = true;

      if (count > 0) {
        this.logger.log(
          `Deleted ${count} request log(s) older than ${retentionDays} days`,
        );
      }
      return count;
    } catch (err) {
      this.lastRunAt = new Date();
      this.lastDeletedCount = 0;
      this.lastRunSucceeded = false;
      this.logger.error(`Request log cleanup failed: ${err.message}`);
      return 0;
    }
  }
}
