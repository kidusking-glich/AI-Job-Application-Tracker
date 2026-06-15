
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { QueryApplicationDto } from './dto/query-application.dto';
import {
  Application,
  Job,
  Company,
  ApplicationStatus,
  ApplicationStatusHistory,
} from '@prisma/client';

interface ApplicationWithRelations extends Application {
  job: Job & { company: Company };
  statusHistory: ApplicationStatusHistory[];
}

interface PaginatedApplications {
  data: ApplicationWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApplicationStatistics {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
}

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    createApplicationDto: CreateApplicationDto,
  ): Promise<ApplicationWithRelations> {
    // Check if job exists
    const job = await this.prisma.job.findUnique({
      where: { id: createApplicationDto.jobId, deletedAt: null },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check if user already has an application for this job
    const existingApplication = await this.prisma.application.findFirst({
      where: {
        userId,
        jobId: createApplicationDto.jobId,
        deletedAt: null,
      },
    });

    if (existingApplication) {
      throw new ForbiddenException('You already have an application for this job');
    }

    // Create application
    const application = await this.prisma.application.create({
      data: {
        ...createApplicationDto,
        userId,
        appliedAt: createApplicationDto.appliedAt
          ? new Date(createApplicationDto.appliedAt)
          : createApplicationDto.status === ApplicationStatus.APPLIED
          ? new Date()
          : undefined,
      },
      include: {
        job: { include: { company: true } },
        statusHistory: true,
      },
    });

    // Create initial status history entry
    await this.prisma.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        previousStatus: null,
        newStatus: application.status,
        changedById: userId,
      },
    });

    return application;
  }

  async findAll(
    userId: string,
    queryDto: QueryApplicationDto,
  ): Promise<PaginatedApplications> {
    const { status, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { userId, deletedAt: null };
    if (status) where.status = status;

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include: {
          job: { include: { company: true } },
          statusHistory: {
            orderBy: { changedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<ApplicationWithRelations> {
    const application = await this.prisma.application.findUnique({
      where: { id, deletedAt: null },
      include: {
        job: { include: { company: true } },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          include: { changedBy: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    return application;
  }

  async updateStatus(
    userId: string,
    id: string,
    updateDto: UpdateApplicationStatusDto,
  ): Promise<ApplicationWithRelations> {
    const application = await this.prisma.application.findUnique({
      where: { id, deletedAt: null },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    // Update application
    const updatedApplication = await this.prisma.application.update({
      where: { id },
      data: {
        status: updateDto.status,
        appliedAt: updateDto.status === ApplicationStatus.APPLIED && !application.appliedAt
          ? new Date()
          : application.appliedAt,
      },
      include: {
        job: { include: { company: true } },
        statusHistory: true,
      },
    });

    // Create status history entry
    await this.prisma.applicationStatusHistory.create({
      data: {
        applicationId: id,
        previousStatus: application.status,
        newStatus: updateDto.status,
        changedById: userId,
        notes: updateDto.notes,
      },
    });

    return updatedApplication;
  }

  async remove(userId: string, id: string): Promise<void> {
    const application = await this.prisma.application.findUnique({
      where: { id, deletedAt: null },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    // Soft delete
    await this.prisma.application.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStatistics(userId: string): Promise<ApplicationStatistics> {
    // Initialize all statuses with 0
    const initialStatusCounts = Object.values(ApplicationStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<ApplicationStatus, number>,
    );

    const statusCounts = await this.prisma.application.groupBy({
      by: ['status'],
      where: { userId, deletedAt: null },
      _count: { status: true },
    });

    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status as ApplicationStatus] = item._count.status;
      return acc;
    }, initialStatusCounts);

    const total = await this.prisma.application.count({
      where: { userId, deletedAt: null },
    });

    return {
      total,
      byStatus,
    };
  }
}
