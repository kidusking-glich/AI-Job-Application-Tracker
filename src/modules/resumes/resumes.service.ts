
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { Resume } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { RESUME_UPLOAD_DIR } from './constants';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(private prisma: PrismaService) {
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists() {
    if (!fs.existsSync(RESUME_UPLOAD_DIR)) {
      fs.mkdirSync(RESUME_UPLOAD_DIR, { recursive: true });
      this.logger.log(`Created upload directory: ${RESUME_UPLOAD_DIR}`);
    }
  }

  async create(
    userId: string,
    file: Express.Multer.File,
    title?: string,
  ): Promise<Resume> {
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title: title || file.originalname,
        fileUrl: file.path,
      },
    });

    return resume;
  }

  async findAll(userId: string): Promise<Resume[]> {
    return this.prisma.resume.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<Resume> {
    const resume = await this.prisma.resume.findUnique({
      where: { id, deletedAt: null },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resume');
    }

    return resume;
  }

  async update(
    userId: string,
    id: string,
    updateResumeDto: UpdateResumeDto,
  ): Promise<Resume> {
    const resume = await this.findOne(userId, id);

    return this.prisma.resume.update({
      where: { id: resume.id },
      data: updateResumeDto,
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const resume = await this.findOne(userId, id);

    // Delete the file from the filesystem
    try {
      if (resume.fileUrl && fs.existsSync(resume.fileUrl)) {
        fs.unlinkSync(resume.fileUrl);
        this.logger.log(`Deleted resume file: ${resume.fileUrl}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete resume file: ${error.message}`);
    }

    // Soft delete from database
    await this.prisma.resume.update({
      where: { id: resume.id },
      data: { deletedAt: new Date() },
    });
  }
}
