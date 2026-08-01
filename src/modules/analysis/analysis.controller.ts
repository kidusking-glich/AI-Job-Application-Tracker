import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalyzeContractDto } from './dto/analyze-contract.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('analysis')
@UseGuards(JwtAuthGuard)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('analyze')
  analyze(@CurrentUser() user: User, @Body() dto: AnalyzeContractDto) {
    return this.analysisService.analyze(user.id, dto.contractId);
  }

  @Get()
  getAll(@CurrentUser() user: User) {
    return this.analysisService.getUserAnalyses(user.id);
  }

  @Get(':id')
  getStatus(@CurrentUser() user: User, @Param('id') id: string) {
    return this.analysisService.getAnalysisStatus(user.id, id);
  }

  @Get(':id/full')
  getFull(@CurrentUser() user: User, @Param('id') id: string) {
    return this.analysisService.getFullAnalysis(user.id, id);
  }
}
