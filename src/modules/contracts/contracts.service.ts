import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { QueryContractDto } from './dto/query-contract.dto';
import { TextExtractionService } from './text-extraction.service';
import { getUploadDir } from './upload-storage.util';
import { Contract } from '@prisma/client';
import * as fs from 'fs';

export interface PaginatedContracts {
  data: Contract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);
  // Vercel serverless only allows writes under /tmp; locally we keep the
  // traditional ./uploads folder.
  private readonly uploadDir = getUploadDir();

  constructor(
    private prisma: PrismaService,
    private textExtraction: TextExtractionService,
  ) {
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists() {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        this.logger.log(`Created upload directory: ${this.uploadDir}`);
      }
    } catch (error) {
      // Never let a filesystem issue take down the whole app (e.g. read-only
      // filesystem on Vercel). Uploads will fail individually with a clear error.
      this.logger.warn(
        `Could not create upload directory ${this.uploadDir}: ${error.message}`,
      );
    }
  }

  async create(userId: string, dto: CreateContractDto): Promise<Contract> {
    const contract = await this.prisma.contract.create({
      data: {
        title: dto.title,
        content: dto.content,
        language: dto.language || 'ENGLISH',
        userId,
      },
    });

    this.logger.log(`Contract created: ${contract.id} - "${contract.title}"`);
    return contract;
  }

  async createFromFile(
    userId: string,
    file: Express.Multer.File,
    title: string,
    language: string = 'ENGLISH',
  ): Promise<Contract> {
    // Create the contract record first
    const contract = await this.prisma.contract.create({
      data: {
        title: title || file.originalname,
        fileUrl: file.path,
        language: language as any,
        userId,
      },
    });

    // Extract text from the uploaded file synchronously (awaited) so it
    // reliably completes before the response returns. Vercel serverless
    // freezes/kills fire-and-forget work once the response is sent, so a
    // non-blocking call would silently never extract text in production.
    await this.extractAndUpdateContent(
      contract.id,
      file.path,
      file.originalname,
      language,
    );

    this.logger.log(
      `Contract created from file: ${contract.id} - "${contract.title}"`,
    );
    return contract;
  }

  /**
   * Extract text from the uploaded file and update the contract record.
   * Runs during the upload request so extraction completes on serverless
   * platforms (Vercel). Failures are caught here so the contract record is
   * still created even when extraction cannot succeed.
   */
  private async extractAndUpdateContent(
    contractId: string,
    filePath: string,
    originalName: string,
    language?: string,
  ): Promise<void> {
    try {
      const extractedText = await this.textExtraction.extractText(
        filePath,
        originalName,
        language,
      );

      if (extractedText && extractedText.trim().length > 0) {
        await this.prisma.contract.update({
          where: { id: contractId },
          data: { content: extractedText },
        });
        this.logger.log(
          `Text extracted and saved for contract ${contractId}: ${extractedText.length} characters`,
        );
      } else {
        this.logger.warn(
          `No text could be extracted from file for contract ${contractId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to extract text for contract ${contractId}: ${error.message}`,
      );
      // Extraction failures are swallowed here so the contract is still
      // created; analysis will surface a clear error later if needed.
    }
  }

  async findAll(
    userId: string,
    queryDto: QueryContractDto,
  ): Promise<PaginatedContracts> {
    const { search, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { userId, deletedAt: null };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data: contracts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(userId: string, id: string): Promise<Contract> {
    const contract = await this.prisma.contract.findUnique({
      where: { id, deletedAt: null },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.userId !== userId) {
      throw new ForbiddenException('You do not have access to this contract');
    }

    return contract;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateContractDto,
  ): Promise<Contract> {
    // Verify ownership
    await this.findOne(userId, id);

    return this.prisma.contract.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const contract = await this.findOne(userId, id);

    // Delete associated file if exists
    if (contract.fileUrl && fs.existsSync(contract.fileUrl)) {
      try {
        fs.unlinkSync(contract.fileUrl);
        this.logger.log(`Deleted contract file: ${contract.fileUrl}`);
      } catch (error) {
        this.logger.error(`Failed to delete contract file: ${error.message}`);
      }
    }

    // Soft delete
    await this.prisma.contract.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
