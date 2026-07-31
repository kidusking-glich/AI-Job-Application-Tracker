export interface User {
  id: string;
  email: string;
  name?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  twoFactorEnabled?: boolean;
  emailVerifiedAt?: string | null;
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
  explanationAmharic?: string;
  suggestionAmharic?: string;
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
  summaryAmharic?: string;
  keyFindings?: string[];
  keyFindingsAmharic?: string[];
  recommendations?: string[];
  recommendationsAmharic?: string[];
  errorMessage?: string;
  errorCode?: string;
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
  FAVORABLE: 'bg-emerald-100 border-emerald-500/40 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  NEUTRAL: 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-white/10 dark:border-white/20 dark:text-gray-300',
  UNFAVORABLE: 'bg-red-100 border-red-500/40 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  RISKY: 'bg-orange-100 border-orange-500/40 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
};

export const SENTIMENT_LABELS: Record<ClauseSentiment, string> = {
  FAVORABLE: '✅ Good',
  NEUTRAL: '➖ Neutral',
  UNFAVORABLE: '❌ Bad',
  RISKY: '⚠️ Risky',
};

export const SENTIMENT_LABELS_AMHARIC: Record<ClauseSentiment, string> = {
  FAVORABLE: '✅ ጥሩ',
  NEUTRAL: '➖ ገለልተኛ',
  UNFAVORABLE: '❌ መጥፎ',
  RISKY: '⚠️ አደገኛ',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 border border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border border-yellow-500/40 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/40',
  HIGH: 'bg-orange-100 text-orange-700 border border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/40',
  CRITICAL: 'bg-red-100 text-red-700 border border-red-500/40 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/40',
};

export interface RequestLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  user?: { email: string } | null;
}

export interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  totalContracts: number;
  totalAnalyses: number;
  totalRequests: number;
  requestsToday: number;
  requestsThisWeek: number;
  requestsByDay: { date: string; count: number }[];
  topEndpoints: { method: string; path: string; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  emailVerifiedAt?: string | null;
  createdAt: string;
  _count: { contracts: number; analyses: number };
}

export interface CreateAdminUserInput {
  email: string;
  password: string;
  name?: string;
}

export interface SuperAdminStatus {
  superAdmin: {
    id: string;
    email: string;
    name?: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    emailVerifiedAt?: string | null;
    createdAt: string;
  } | null;
  autoRecovery: {
    enabled: boolean;
    description: string;
  };
  transferNote: string;
}

export interface SecurityLog {
  id: string;
  action: string;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
  createdAt: string;
  user?: { email: string } | null;
}

export interface SystemHealth {
  db: {
    status: 'up' | 'down';
    latencyMs: number;
    checkedAt: string;
  };
  cleanup: {
    lastRunAt: string | null;
    lastDeletedCount: number;
    lastRunSucceeded: boolean | null;
    retentionDays: number;
    intervalHours: number;
  };
}

export interface SignupResponse {
  user: User;
  message: string;
  devVerificationUrl?: string;
}

export type AnalysisLanguage = 'ENGLISH' | 'AMHARIC';

export const AI_ERROR_CODES = {
  QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  RATE_LIMIT: 'AI_RATE_LIMIT',
  INVALID_API_KEY: 'AI_INVALID_API_KEY',
  SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  GENERIC: 'AI_ERROR',
} as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[keyof typeof AI_ERROR_CODES];

export const AI_ERROR_INFO: Record<
  string,
  { title: string; titleAmharic: string; message: string; messageAmharic: string; tone: 'error' | 'warning' }
> = {
  [AI_ERROR_CODES.QUOTA_EXCEEDED]: {
    title: 'AI Quota Reached',
    titleAmharic: 'የAI ኮታ ተሟጥጓል',
    message:
      'The AI analysis quota has been reached for now. Please wait a few minutes and try again — your document has not been lost.',
    messageAmharic:
      'የአይአይ ትንታኔ ኮታ ለጊዜው ተሟጥጓል። እባክዎ ጥቂት ደቂቃዎች ቆይተው እንደገና ይሞክሩ — ሰነድዎ አልጠፋም።',
    tone: 'warning',
  },
  [AI_ERROR_CODES.RATE_LIMIT]: {
    title: 'Too Many Requests',
    titleAmharic: 'በጣም ብዙ ጥያቄዎች',
    message: 'You are sending requests too quickly. Please wait a moment and try again.',
    messageAmharic: 'ጥያቄዎችን በፍጥነት እየላኩ ነው። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።',
    tone: 'warning',
  },
  [AI_ERROR_CODES.INVALID_API_KEY]: {
    title: 'AI Service Configuration Issue',
    titleAmharic: 'የAI አገልግሎት ውቅር ችግር',
    message: 'The AI service is not configured correctly. Please contact support.',
    messageAmharic: 'የAI አገልግሎት በትክክል አልተዋቀረም። እባክዎ ድጋፍን ያግኙ።',
    tone: 'error',
  },
  [AI_ERROR_CODES.SERVICE_UNAVAILABLE]: {
    title: 'AI Service Unavailable',
    titleAmharic: 'የAI አገልግሎት አይገኝም',
    message: 'The AI service is temporarily unavailable. Please try again shortly.',
    messageAmharic: 'የAI አገልግሎት ለጊዜው አይገኝም። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።',
    tone: 'warning',
  },
  [AI_ERROR_CODES.GENERIC]: {
    title: 'AI Analysis Failed',
    titleAmharic: 'የAI ትንታኔ አልተሳካም',
    message: 'The AI could not analyze this document right now. Please try again in a moment.',
    messageAmharic: 'AI ሰነዱን አሁን መተንተን አልቻለም። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።',
    tone: 'error',
  },
};
