import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma.service';
import { RequestLogCleanupService } from '../../core/request-log-cleanup.service';
import { VerificationService } from '../email/verification.service';
import { SecurityLogService } from '../../core/security-log.service';
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
    private securityLogService: SecurityLogService,
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

  async updateUserRole(
    requesterId: string,
    userId: string,
    isAdmin: boolean,
    context?: { ip?: string; userAgent?: string },
  ) {
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

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: { id: true, email: true, name: true, isAdmin: true },
    });

    await this.securityLogService.log({
      action: 'ROLE_CHANGE',
      userId: requesterId,
      email: updated.email,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
      metadata: { isAdmin },
    });

    return updated;
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

  /**
   * Transfer the super admin role to another user. Transactional: the new
   * super admin is granted the role and the requester is demoted, so there is
   * always exactly one super admin. The requester is also made a regular admin
   * so they can still be managed (but no longer access the dashboard).
   */
  async transferSuperAdmin(
    requesterId: string,
    targetUserId: string,
    context?: { ip?: string; userAgent?: string },
  ) {
    if (requesterId === targetUserId) {
      throw new BadRequestException('You are already the super admin.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId, deletedAt: null },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.isSuperAdmin) {
      throw new BadRequestException('That user is already the super admin.');
    }
    if (!target.emailVerifiedAt) {
      throw new BadRequestException(
        'Only email-verified users can be made the super admin — transferring would lock out the dashboard.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: target.id },
        data: { isSuperAdmin: true, isAdmin: true },
      }),
      this.prisma.user.update({
        where: { id: requesterId },
        data: {
          isSuperAdmin: false,
          isAdmin: true,
          // Fully revoke the former holder's session: all previously issued
          // JWTs carry the old tokenVersion and are now rejected.
          tokenVersion: { increment: 1 },
        },
      }),
    ]);

    await this.securityLogService.log({
      action: 'TRANSFER_SUPER_ADMIN',
      userId: requesterId,
      email: target.email,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
      metadata: { from: requesterId, to: targetUserId },
    });

    return {
      message: `Super admin role transferred to ${target.email}.`,
    };
  }

  /**
   * Auto-recovery safety net: if no super admin exists (e.g. the flag was
   * cleared or the account was deleted directly in the DB), promote the first
   * registered non-deleted user so the dashboard can never be permanently
   * locked out.
   */
  async ensureSuperAdminExists() {
    const superAdminCount = await this.prisma.user.count({
      where: { isSuperAdmin: true, deletedAt: null },
    });
    if (superAdminCount > 0) return;

    const firstUser = await this.prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!firstUser) return;

    await this.prisma.user.update({
      where: { id: firstUser.id },
      data: { isSuperAdmin: true },
    });
    this.logger.warn(
      `Auto-recovered: promoted ${firstUser.email} to super admin because no super admin existed`,
    );
  }

  async deleteUser(
    requesterId: string,
    userId: string,
    context?: { ip?: string; userAgent?: string },
  ) {
    // The super admin must never delete their own account — that would lock
    // everyone out of the admin dashboard permanently.
    if (requesterId === userId) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Never delete the super admin account.
    if (user.isSuperAdmin) {
      throw new BadRequestException('The super admin account cannot be deleted.');
    }

    // Never delete the last remaining admin.
    if (user.isAdmin) {
      const adminCount = await this.prisma.user.count({
        where: { isAdmin: true, deletedAt: null },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin.');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    await this.securityLogService.log({
      action: 'DELETE_USER',
      userId: requesterId,
      email: user.email,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return { message: `User ${user.email} deleted.` };
  }

  async createAdminUser(
    requesterId: string,
    createAdminUserDto: CreateAdminUserDto,
    context?: { ip?: string; userAgent?: string },
  ) {
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

    await this.securityLogService.log({
      action: 'CREATE_ADMIN',
      userId: requesterId,
      email: user.email,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return {
      message: `Admin user ${user.email} created.`,
      user,
    };
  }

  /**
   * Who currently holds the super admin role plus the auto-recovery rules, so
   * the dashboard can show a dedicated settings card.
   */
  async getSuperAdminStatus() {
    const superAdmin = await this.prisma.user.findFirst({
      where: { isSuperAdmin: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isSuperAdmin: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    return {
      superAdmin,
      autoRecovery: {
        enabled: true,
        description:
          'If no super admin exists, the first registered non-deleted user is automatically promoted so the dashboard can never be locked out.',
      },
      transferNote:
        'Only email-verified users can be made the super admin, and exactly one super admin always exists (transfers are atomic).',
    };
  }

  async getSecurityLogs(limit = 100) {
    return this.prisma.securityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 500),
      include: { user: { select: { email: true } } },
    });
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
