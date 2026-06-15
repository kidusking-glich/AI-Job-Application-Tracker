
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
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { QueryApplicationDto } from './dto/query-application.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createApplicationDto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(user.id, createApplicationDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query() queryDto: QueryApplicationDto,
  ) {
    return this.applicationsService.findAll(user.id, queryDto);
  }

  @Get('statistics')
  getStatistics(@CurrentUser() user: User) {
    return this.applicationsService.getStatistics(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.applicationsService.findOne(user.id, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(user.id, id, updateDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.applicationsService.remove(user.id, id);
  }
}
