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
