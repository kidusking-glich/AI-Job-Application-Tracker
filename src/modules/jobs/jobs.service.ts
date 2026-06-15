
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobDto } from './dto/query-job.dto';
import { Job, Company } from '@prisma/client';

export interface JobWithCompany extends Job {
  company: Company;
}

export interface PaginatedJobs {
  data: JobWithCompany[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async create(createJobDto: CreateJobDto): Promise<JobWithCompany> {
    const { companyName, ...jobData } = createJobDto;

    // Find or create the company
    let company = await this.prisma.company.findFirst({
      where: { name: companyName, deletedAt: null },
    });

    if (!company) {
      company = await this.prisma.company.create({
        data: { name: companyName },
      });
    }

    // Create the job
    const job = await this.prisma.job.create({
      data: {
        ...jobData,
        companyId: company.id,
        postedAt: jobData.postedAt ? new Date(jobData.postedAt) : undefined,
      },
      include: { company: true },
    });

    return job;
  }

  async findAll(queryDto: QueryJobDto): Promise<PaginatedJobs> {
    const { search, companyId, companyName, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (companyName) {
      where.company = {
        name: { contains: companyName, mode: 'insensitive' },
      };
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: { company: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<JobWithCompany> {
    const job = await this.prisma.job.findUnique({
      where: { id, deletedAt: null },
      include: { company: true },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto): Promise<JobWithCompany> {
    const { companyName, ...jobData } = updateJobDto as any;
    let companyId: string | undefined;

    if (companyName) {
      let company = await this.prisma.company.findFirst({
        where: { name: companyName, deletedAt: null },
      });

      if (!company) {
        company = await this.prisma.company.create({
          data: { name: companyName },
        });
      }
      companyId = company.id;
    }

    const job = await this.prisma.job.update({
      where: { id, deletedAt: null },
      data: {
        ...jobData,
        companyId,
        postedAt: jobData.postedAt ? new Date(jobData.postedAt) : undefined,
      },
      include: { company: true },
    });

    return job;
  }

  async remove(id: string): Promise<void> {
    // Soft delete
    await this.prisma.job.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
