import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ClauseAnalysisInput {
  clauseNumber: number;
  title?: string;
  content: string;
}

export interface AnalyzedClause {
  clauseNumber: number;
  title: string;
  content: string;
  sentiment: 'FAVORABLE' | 'NEUTRAL' | 'UNFAVORABLE' | 'RISKY';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  explanation: string;
  suggestion: string;
  severity: number;
}

export interface ContractAnalysisResult {
  overallScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  clauses: AnalyzedClause[];
}

export abstract class AiProvider {
  abstract analyzeContract(
    title: string,
    content: string,
    clauses: ClauseAnalysisInput[],
    language: string,
  ): Promise<ContractAnalysisResult>;
}

/**
 * Mock AI provider for development/demo purposes.
 * Replace this with real LLM integration (OpenAI, Claude, etc.)
 */
@Injectable()
export class MockAiProvider extends AiProvider {
  private readonly logger = new Logger(MockAiProvider.name);

  async analyzeContract(
    title: string,
    content: string,
    clauses: ClauseAnalysisInput[],
    language: string,
  ): Promise<ContractAnalysisResult> {
    this.logger.log(`Analyzing contract: "${title}" (${language})`);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const analyzedClauses: AnalyzedClause[] = clauses.map((clause) => {
      const lowerContent = clause.content.toLowerCase();
      const isBad =
        lowerContent.includes('not liable') ||
        lowerContent.includes('no responsibility') ||
        lowerContent.includes('indemnify') ||
        lowerContent.includes('waive') ||
        lowerContent.includes('terminate without notice') ||
        lowerContent.includes('binding arbitration') ||
        lowerContent.includes('non-compete') ||
        lowerContent.includes('exclusive') ||
        lowerContent.includes('forfeiture') ||
        lowerContent.includes('penalty');

      const isGood =
        lowerContent.includes('mutual') ||
        lowerContent.includes('reasonable') ||
        lowerContent.includes('good faith') ||
        lowerContent.includes('pro-rata') ||
        lowerContent.includes('notice period') ||
        lowerContent.includes('confidentiality') ||
        lowerContent.includes('limited liability');

      if (isBad) {
        return {
          clauseNumber: clause.clauseNumber,
          title: clause.title || `Clause ${clause.clauseNumber}`,
          content: clause.content,
          sentiment: 'UNFAVORABLE' as const,
          riskLevel: 'HIGH' as const,
          explanation:
            'This clause contains language that shifts significant risk or liability onto you. It uses terms that strongly favor the other party and could lead to unfavorable outcomes.',
          suggestion:
            'Consider negotiating to remove or modify the unfavorable terms. Seek to add mutuality and balance to the obligations.',
          severity: 8,
        };
      }

      if (isGood) {
        return {
          clauseNumber: clause.clauseNumber,
          title: clause.title || `Clause ${clause.clauseNumber}`,
          content: clause.content,
          sentiment: 'FAVORABLE' as const,
          riskLevel: 'LOW' as const,
          explanation:
            'This clause contains balanced and fair language. It protects your interests with reasonable terms and mutual obligations.',
          suggestion:
            'This clause appears well-balanced. Maintain it as-is during negotiations.',
          severity: 2,
        };
      }

      return {
        clauseNumber: clause.clauseNumber,
        title: clause.title || `Clause ${clause.clauseNumber}`,
        content: clause.content,
        sentiment: 'NEUTRAL' as const,
        riskLevel: 'LOW' as const,
        explanation:
          'This clause appears to be standard language with no immediately apparent risks or exceptional benefits.',
        suggestion:
          'Review carefully in the context of your specific situation. Standard clauses can still have important implications.',
        severity: 3,
      };
    });

    const badClauses = analyzedClauses.filter(
      (c) => c.sentiment === 'UNFAVORABLE' || c.sentiment === 'RISKY',
    );
    const goodClauses = analyzedClauses.filter(
      (c) => c.sentiment === 'FAVORABLE',
    );

    const totalClauses = analyzedClauses.length;
    const score = Math.max(
      10,
      Math.round(
        100 -
          (badClauses.length / Math.max(totalClauses, 1)) * 60 +
          (goodClauses.length / Math.max(totalClauses, 1)) * 10,
      ),
    );

    const riskLevel =
      score >= 80
        ? ('LOW' as const)
        : score >= 60
          ? ('MEDIUM' as const)
          : score >= 40
            ? ('HIGH' as const)
            : ('CRITICAL' as const);

    const keyFindings = [
      `Contract contains ${badClauses.length} clause(s) that may be unfavorable`,
      `Contract contains ${goodClauses.length} clause(s) that are favorable`,
      ...(badClauses.length > 0
        ? [
            `Key concern: "${badClauses[0].title}" - ${badClauses[0].explanation.substring(0, 80)}...`,
          ]
        : []),
    ];

    const recommendations = [
      ...(badClauses.length > 0
        ? [
            `Negotiate or seek legal advice on the ${badClauses.length} unfavorable clause(s) identified`,
          ]
        : []),
      'Consider having a lawyer review the full contract',
      'Keep a copy of the final signed contract for your records',
    ];

    return {
      overallScore: score,
      riskLevel,
      summary:
        badClauses.length > 0
          ? `This contract contains ${badClauses.length} clause(s) that require attention. Overall, it scores ${score}/100. We recommend reviewing the highlighted clauses carefully and consulting with a legal professional before signing.`
          : `This contract appears to be reasonably balanced. It scores ${score}/100. While no major red flags were detected, we still recommend careful review.`,
      keyFindings,
      recommendations,
      clauses: analyzedClauses,
    };
  }
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private provider: AiProvider;

  constructor(private configService: ConfigService) {
    // Default to mock provider
    this.provider = new MockAiProvider();
    this.logger.log('AI Service initialized with Mock provider');
  }

  /**
   * Set a custom AI provider (for production use with OpenAI, Claude, etc.)
   */
  setProvider(provider: AiProvider) {
    this.provider = provider;
    this.logger.log('AI Provider updated');
  }

  async analyzeContract(
    title: string,
    content: string,
    clauses: ClauseAnalysisInput[],
    language: string = 'ENGLISH',
  ): Promise<ContractAnalysisResult> {
    return this.provider.analyzeContract(title, content, clauses, language);
  }
}
