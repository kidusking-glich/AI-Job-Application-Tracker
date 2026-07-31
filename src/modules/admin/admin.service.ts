import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma.service';
import { RequestLogCleanupService } from '../../core/request-log-cleanup.service';
import { VerificationService } from '../email/verification.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private cleanupService: RequestLogCleanupService,
    private configService: ConfigService,
    private verificationService: VerificationService,
  ) {}

  async getStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const [totalUsers, verifiedUsers, totalContracts, totalAnalyses, totalRequests, requestsToday, requestsThisWeek] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { emailVerifiedAt: { not: null }, deletedAt: null } }),
        this.prisma.contract.count({ where: { deletedAt: null } }),
        this.prisma.analysis.count(),
        this.prisma.requestLog.count(),
        this.prisma.requestLog.count({ where: { createdAt: { gte: startOfToday } } }),
        this.prisma.requestLog.count({ where: { createdAt: { gte: startOfWeek } } }),
      ]);

    // Requests per day for the last 7 days + top endpoints (single query)
    const weekLogs = await this.prisma.requestLog.findMany({
      where: { createdAt: { gte: startOfWeek } },
      select: { createdAt: true, method: true, path: true },
    });

    const requestsByDay = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      const count = weekLogs.filter((l) => l.createdAt.toISOString().slice(0, 10) === key).length;
      return { date: key, count };
    });

    const endpointCounts = new Map<string, { method: string; path: string; count: number }>();
    for (const log of weekLogs) {
      const key = `${log.method} ${log.path}`;
      const existing = endpointCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        endpointCounts.set(key, { method: log.method, path: log.path, count: 1 });
      }
    }
    const topEndpoints = [...endpointCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalUsers,
      verifiedUsers,
      totalContracts,
      totalAnalyses,
      totalRequests,
      requestsToday,
      requestsThisWeek,
      requestsByDay,
      topEndpoints,
    };
  }

  async getUsers(limit = 100) {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 500),
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isSuperAdmin: true,
        emailVerifiedAt: true,
        createdAt: true,
        _count: { select: { contracts: true, analyses: true } },
      },
    });
  }

  async getRequests(limit = 50) {
    return this.prisma.requestLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 50, 500),
      include: { user: { select: { email: true } } },
    });
  }

  async updateUserRole(requesterId: string, userId: string, isAdmin: boolean) {
    // Prevent self-demotion so an admin can never lock themselves out of the UI
    if (!isAdmin && requesterId === userId) {
      throw new BadRequestException('You cannot remove your own admin rights.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Never demote the last remaining admin
    if (!isAdmin) {
      const adminCount = await this.prisma.user.count({
        where: { isAdmin: true, deletedAt: null },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the last admin.');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: { id: true, email: true, name: true, isAdmin: true },
    });
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('This user is already verified.');
    }

    await this.verificationService.issueAndSendVerification(user);

    return { message: `Verification email sent to ${user.email}` };
  }

  async createAdminUser(createAdminUserDto: CreateAdminUserDto) {
    const { email, password, name } = createAdminUserDto;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        isAdmin: true,
        emailVerifiedAt: new Date(), // created by the super admin, no email verification needed
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isSuperAdmin: false,
        emailVerifiedAt: true,
        createdAt: true,
        _count: { select: { contracts: true, analyses: true } },
      },
    });

    return {
      message: `Admin user ${user.email} created.`,
      user,
    };
  }

  async getHealth() {
    // Ping the database and measure round-trip latency
    const dbStartedAt = Date.now();
    let dbStatus: 'up' | 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch (err) {
      this.logger.error(`DB health check failed: ${err.message}`);
      dbStatus = 'down';
    }
    const dbLatencyMs = Date.now() - dbStartedAt;

    const retentionDays = this.configService.get<number>('REQUEST_LOG_RETENTION_DAYS', 30);
    const intervalHours = this.configService.get<number>('REQUEST_LOG_CLEANUP_INTERVAL_HOURS', 24);

    return {
      db: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        checkedAt: new Date().toISOString(),
      },
      cleanup: {
        lastRunAt: this.cleanupService.lastRunAt,
        lastDeletedCount: this.cleanupService.lastDeletedCount,
        lastRunSucceeded: this.cleanupService.lastRunSucceeded,
        retentionDays,
        intervalHours,
      },
    };
  }
}
