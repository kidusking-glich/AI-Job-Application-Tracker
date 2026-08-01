import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { AiService, ClauseAnalysisInput } from '../ai/ai.service';
import { AiError, AiErrorCode } from '../ai/ai-types';
import { TextExtractionService } from '../contracts/text-extraction.service';
import { Contract } from '@prisma/client';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private textExtraction: TextExtractionService,
  ) {}

  /**
   * Extract clauses from contract text by splitting on common patterns.
   * In production, this would use more sophisticated NLP.
   */
  private extractClauses(
    content: string,
  ): Array<{ clauseNumber: number; title: string; content: string }> {
    // Common clause patterns (English & Amharic / generic)
    const patterns = [
      /\d+\.\s+([^\n]+)(?:\n|$)/g,
      /(?:Article|Clause|Section)\s+(\d+)[.:]\s*([^\n]*)/gi,
      /(\d+)[.)]\s+([A-Z][^\n]+)/g,
      /(?:ሐዋላ|ክፍል|አንቀጽ)\s+(\d+)[.:]\s*([^\n]*)/gi, // Amharic patterns
    ];

    // First try to split by common clause separators
    const clauseSeparators = [
      /\n\d+\.\s+/,
      /\n(?:Article|Clause|Section)\s+\d+/i,
      /\n(?:ሐዋላ|ክፍል|አንቀጽ)\s+\d+/i,
      /\n{2,}/,
    ];

    let clauses: Array<{
      clauseNumber: number;
      title: string;
      content: string;
    }> = [];

    // Try to extract using regex patterns
    for (const pattern of patterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length >= 2) {
        clauses = matches.map((m, i) => ({
          clauseNumber: i + 1,
          title: (m[1] || `Clause ${i + 1}`).trim(),
          content: m[0].trim(),
        }));
        break;
      }
    }

    // Fallback: split by double newlines or numbered lists
    if (clauses.length === 0) {
      for (const separator of clauseSeparators) {
        const parts = content
          .split(separator)
          .filter((p) => p.trim().length > 50);
        if (parts.length >= 2) {
          clauses = parts.map((part, i) => ({
            clauseNumber: i + 1,
            title: `Clause ${i + 1}`,
            content: part.trim(),
          }));
          break;
        }
      }
    }

    // Last resort: just split into chunks
    if (clauses.length === 0) {
      const words = content.split(/\s+/);
      const chunkSize = Math.ceil(
        words.length / Math.max(Math.ceil(words.length / 200), 3),
      );
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk.trim().length > 50) {
          clauses.push({
            clauseNumber: Math.floor(i / chunkSize) + 1,
            title: `Section ${Math.floor(i / chunkSize) + 1}`,
            content: chunk.trim(),
          });
        }
      }
    }

    return clauses;
  }

  async analyze(userId: string, contractId: string) {
    // Verify contract exists and belongs to user
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId, deletedAt: null },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.userId !== userId) {
      throw new ForbiddenException('You do not have access to this contract');
    }

    // Get the text content - from pasted text, or auto-extract from uploaded file
    let content = contract.content;
    if (!content && contract.fileUrl) {
      this.logger.log(
        `Extracting text from file for analysis: ${contract.fileUrl}`,
      );
      const extracted = await this.textExtraction.extractText(
        contract.fileUrl,
        undefined,
        contract.language,
      );
      if (extracted && extracted.trim().length > 0) {
        content = extracted;
        // Save extracted text to the contract for future use
        await this.prisma.contract.update({
          where: { id: contractId },
          data: { content: extracted },
        });
        this.logger.log(
          `Text extracted and saved for contract ${contractId}: ${extracted.length} characters`,
        );
      }
    }

    if (!content) {
      const hasFile = !!contract.fileUrl;
      throw new BadRequestException(
        hasFile
          ? 'Could not extract text from the uploaded file. Please try pasting the contract text directly or ensure the file contains selectable text.'
          : 'Contract has no content to analyze. Please paste the contract text.',
      );
    }

    // Create analysis record
    const analysis = await this.prisma.analysis.create({
      data: {
        contractId,
        userId,
        status: 'PROCESSING',
      },
    });

    // Run analysis asynchronously
    this.processAnalysis(analysis.id, contract, content).catch((err) => {
      this.logger.error(`Analysis ${analysis.id} failed: ${err.message}`);
    });

    return {
      analysisId: analysis.id,
      status: 'PROCESSING',
      message: 'Analysis started. Check back for results.',
    };
  }

  private async processAnalysis(
    analysisId: string,
    contract: Contract,
    content: string,
  ) {
    try {
      // Extract clauses from the contract text
      const extractedClauses = this.extractClauses(content);

      if (extractedClauses.length === 0) {
        throw new Error('Could not extract any clauses from the contract');
      }

      // Persist clauses
      for (const clause of extractedClauses) {
        await this.prisma.contractClause.create({
          data: {
            contractId: contract.id,
            clauseNumber: clause.clauseNumber,
            title: clause.title,
            content: clause.content,
          },
        });
      }

      // Prepare input for AI
      const clauseInputs: ClauseAnalysisInput[] = extractedClauses.map((c) => ({
        clauseNumber: c.clauseNumber,
        title: c.title,
        content: c.content,
      }));

      // Run AI analysis
      const result = await this.aiService.analyzeContract(
        contract.title,
        content,
        clauseInputs,
        contract.language,
      );

      // Persist clause analyses
      for (const clauseResult of result.clauses) {
        const dbClause = await this.prisma.contractClause.findFirst({
          where: {
            contractId: contract.id,
            clauseNumber: clauseResult.clauseNumber,
          },
        });

        if (dbClause) {
          await this.prisma.clauseAnalysis.create({
            data: {
              analysisId,
              clauseId: dbClause.id,
              clauseNumber: clauseResult.clauseNumber,
              clauseTitle: clauseResult.title,
              clauseText: clauseResult.content,
              sentiment: clauseResult.sentiment as any,
              riskLevel: clauseResult.riskLevel as any,
              explanation: clauseResult.explanation,
              suggestion: clauseResult.suggestion,
              explanationAmharic: clauseResult.explanationAmharic,
              suggestionAmharic: clauseResult.suggestionAmharic,
              severity: clauseResult.severity,
            },
          });
        }
      }

      // Update analysis with results
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          overallScore: result.overallScore,
          riskLevel: result.riskLevel,
          summary: result.summary,
          summaryAmharic: result.summaryAmharic,
          keyFindings: result.keyFindings,
          keyFindingsAmharic: result.keyFindingsAmharic,
          recommendations: result.recommendations,
          recommendationsAmharic: result.recommendationsAmharic,
          processedAt: new Date(),
        },
      });

      this.logger.log(
        `Analysis ${analysisId} completed: score=${result.overallScore}, risk=${result.riskLevel}`,
      );
    } catch (error) {
      const isAiError = error instanceof AiError;
      // Mark analysis as failed
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          errorCode: isAiError ? error.code : AiErrorCode.GENERIC,
          processedAt: new Date(),
        },
      });
      this.logger.error(`Analysis ${analysisId} failed: ${error.message}`);
    }
  }

  async getAnalysisStatus(userId: string, analysisId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        contract: {
          select: { id: true, title: true },
        },
      },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    if (analysis.userId !== userId) {
      throw new ForbiddenException('You do not have access to this analysis');
    }

    if (analysis.status === 'PENDING' || analysis.status === 'PROCESSING') {
      return {
        id: analysis.id,
        status: analysis.status,
        contract: analysis.contract,
      };
    }

    return analysis;
  }

  async getFullAnalysis(userId: string, analysisId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        contract: {
          select: { id: true, title: true, language: true },
        },
        clauseAnalyses: {
          orderBy: { clauseNumber: 'asc' },
        },
      },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    if (analysis.userId !== userId) {
      throw new ForbiddenException('You do not have access to this analysis');
    }

    return analysis;
  }

  async getUserAnalyses(userId: string) {
    return this.prisma.analysis.findMany({
      where: { userId },
      include: {
        contract: {
          select: { id: true, title: true },
        },
        _count: {
          select: { clauseAnalyses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
