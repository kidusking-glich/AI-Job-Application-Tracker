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
  explanationAmharic?: string;
  suggestionAmharic?: string;
  severity: number;
}

export interface ContractAnalysisResult {
  overallScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  summaryAmharic?: string;
  keyFindings: string[];
  keyFindingsAmharic?: string[];
  recommendations: string[];
  recommendationsAmharic?: string[];
  clauses: AnalyzedClause[];
}

/** Machine-readable error codes surfaced to the UI for standard error states. */
export enum AiErrorCode {
  QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
  RATE_LIMIT = 'AI_RATE_LIMIT',
  INVALID_API_KEY = 'AI_INVALID_API_KEY',
  SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  GENERIC = 'AI_ERROR',
}

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export abstract class AiProvider {
  abstract analyzeContract(
    title: string,
    content: string,
    clauses: ClauseAnalysisInput[],
    language: string,
  ): Promise<ContractAnalysisResult>;
}
