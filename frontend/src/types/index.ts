export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface Contract {
  id: string;
  title: string;
  content?: string;
  fileUrl?: string;
  language: 'ENGLISH' | 'AMHARIC' | 'OTHER';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedContracts {
  data: Contract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ClauseSentiment = 'FAVORABLE' | 'NEUTRAL' | 'UNFAVORABLE' | 'RISKY';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ClauseAnalysis {
  id: string;
  analysisId: string;
  clauseId: string;
  clauseNumber: number;
  clauseTitle?: string;
  clauseText: string;
  sentiment: ClauseSentiment;
  riskLevel: RiskLevel;
  explanation?: string;
  suggestion?: string;
  severity: number;
  createdAt: string;
}

export interface Analysis {
  id: string;
  contractId: string;
  userId: string;
  status: AnalysisStatus;
  overallScore?: number;
  riskLevel?: RiskLevel;
  summary?: string;
  keyFindings?: string[];
  recommendations?: string[];
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
  contract: {
    id: string;
    title: string;
    language?: string;
  };
  clauseAnalyses?: ClauseAnalysis[];
  _count?: {
    clauseAnalyses: number;
  };
}

export const SENTIMENT_COLORS: Record<ClauseSentiment, string> = {
  FAVORABLE: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  NEUTRAL: 'bg-gray-50 border-gray-300 text-gray-800',
  UNFAVORABLE: 'bg-red-50 border-red-300 text-red-900',
  RISKY: 'bg-orange-50 border-orange-300 text-orange-900',
};

export const SENTIMENT_LABELS: Record<ClauseSentiment, string> = {
  FAVORABLE: '✅ Good',
  NEUTRAL: '➖ Neutral',
  UNFAVORABLE: '❌ Bad',
  RISKY: '⚠️ Risky',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-100 text-emerald-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};
