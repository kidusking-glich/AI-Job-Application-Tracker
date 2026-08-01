import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { getUploadDir } from './upload-storage.util';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { QueryContractDto } from './dto/query-contract.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB (increased for high-res scanned docs)

/**
 * Persist an in-memory multer file to disk so downstream services (OCR/text
 * extraction) can read it by path. Returns the absolute file path.
 */
function persistUpload(file: Express.Multer.File): string {
  const dir = getUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname);
  const filePath = path.join(dir, `contract-${uniqueSuffix}${ext}`);
  fs.writeFileSync(filePath, file.buffer);
  return filePath;
}

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createContractDto: CreateContractDto,
  ) {
    return this.contractsService.create(user.id, createContractDto);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'image/png',
          'image/jpeg',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only PDF, DOC, DOCX, TXT, PNG, and JPEG files are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadContract(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('language') language?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // multer gave us the file in memory; write it to a writable dir (/tmp on
    // Vercel) so OCR/text extraction can read it by path, then hand it off.
    file.path = persistUpload(file);
    return this.contractsService.createFromFile(
      user.id,
      file,
      title || file.originalname,
      language || 'ENGLISH',
    );
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query() queryDto: QueryContractDto) {
    return this.contractsService.findAll(user.id, queryDto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.contractsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
  ) {
    return this.contractsService.update(user.id, id, updateContractDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.contractsService.remove(user.id, id);
  }
}
