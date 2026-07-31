import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
}
