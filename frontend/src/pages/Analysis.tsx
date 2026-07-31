import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { analysisService } from '../services/analysis';
import { getErrorMessage } from '../services/api';
import type { Analysis as AnalysisType, AnalysisLanguage } from '../types';
import { AI_ERROR_INFO, AI_ERROR_CODES } from '../types';
import ClauseCard from '../components/ClauseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { RISK_COLORS } from '../types';

// AI errors where retrying is safe and useful (config issues should not be retried)
const ERRORS_WITHOUT_RETRY: Record<string, boolean> = {
  [AI_ERROR_CODES.INVALID_API_KEY]: true,
};

function ErrorState({
  errorCode,
  message,
  onRetry,
  language = 'ENGLISH',
}: {
  errorCode?: string;
  message?: string;
  onRetry?: () => void;
  language?: AnalysisLanguage;
}) {
  const info = (errorCode && AI_ERROR_INFO[errorCode]) || AI_ERROR_INFO[AI_ERROR_CODES.GENERIC];
  const isWarning = info.tone === 'warning';
  const canRetry = !!onRetry && !(errorCode && ERRORS_WITHOUT_RETRY[errorCode]);
  const isAmharic = language === 'AMHARIC';
  // For recognized error codes, prefer the localized standard text so Amharic
  // users see a proper translation instead of a raw English backend message.
  // GENERIC (AI_ERROR) is excluded so real backend failure details still surface
  // (e.g. "Could not extract any clauses") instead of being masked by standard text.
  const isKnownCode =
    !!errorCode &&
    errorCode !== AI_ERROR_CODES.GENERIC &&
    !!AI_ERROR_INFO[errorCode];
  const displayTitle = isAmharic ? info.titleAmharic : info.title;
  const displayMessage = isKnownCode
    ? (isAmharic ? info.messageAmharic : info.message)
    : message || (isAmharic ? info.messageAmharic : info.message);

  return (
    <div className="page-container text-center py-16 animate-fade-in">
      <div
        className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center ${
          isWarning ? 'bg-ethiopian-yellow/15 shadow-flag-glow-yellow' : 'bg-ethiopian-red/15 shadow-flag-glow-red'
        }`}
      >
        <svg
          className={`w-10 h-10 ${isWarning ? 'text-yellow-700 dark:text-ethiopian-yellow' : 'text-red-700 dark:text-[#fb7185]'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <h2 className={`text-xl font-bold mb-2 ${isWarning ? 'text-yellow-700 dark:text-ethiopian-yellow' : 'text-gray-900 dark:text-white'}`}>
        {displayTitle}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{displayMessage}</p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {canRetry && (
          <button onClick={onRetry} className="btn-primary">
            {isAmharic ? 'እንደገና ይሞክሩ' : 'Try Again'}
          </button>
        )}
        <Link to="/" className="btn-secondary">
          {isAmharic ? 'ወደ ዳሽቦርድ ይመለሱ' : 'Back to Dashboard'}
        </Link>
      </div>
    </div>
  );
}

function LanguageToggle({
  language,
  onChange,
}: {
  language: AnalysisLanguage;
  onChange: (lang: AnalysisLanguage) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-gray-300 dark:border-white/15 overflow-hidden bg-white dark:bg-white/5 backdrop-blur-sm">
      <button
        onClick={() => onChange('ENGLISH')}
        className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
          language === 'ENGLISH'
            ? 'bg-ethiopian-green text-white shadow-flag-glow'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-white/10 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        🇬🇧 English
      </button>
      <button
        onClick={() => onChange('AMHARIC')}
        className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
          language === 'AMHARIC'
            ? 'bg-ethiopian-green text-white shadow-flag-glow'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-white/10 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        🇪🇹 አማርኛ
      </button>
    </div>
  );
}

export default function Analysis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState<AnalysisLanguage>(() => {
    const saved = localStorage.getItem('analysisLanguage');
    return saved === 'AMHARIC' ? 'AMHARIC' : 'ENGLISH';
  });

  useEffect(() => {
    if (!id) return;
    loadAnalysis();
  }, [id]);

  // Poll while processing - stabilizes automatically since we check status
  useEffect(() => {
    if (analysis && (analysis.status === 'PENDING' || analysis.status === 'PROCESSING')) {
      const timer = setTimeout(() => {
        loadAnalysis();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [analysis]);

  const loadAnalysis = async () => {
    try {
      const data = await analysisService.getFull(id!);
      setAnalysis(data);
      setError('');
      setErrorCode(undefined);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to load analysis'));
      setErrorCode(err.response?.data?.errorCode || err.response?.data?.code);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: AnalysisLanguage) => {
    setLanguage(lang);
    localStorage.setItem('analysisLanguage', lang);
  };

  /** Re-trigger the AI analysis for a failed contract (e.g. after a quota reset). */
  const retryAnalysis = async () => {
    if (!analysis) return;
    try {
      setError('');
      setErrorCode(undefined);
      setLoading(true);
      const result = await analysisService.analyze(analysis.contractId);
      // Navigate to the fresh analysis record so polling picks up its status
      navigate(`/analysis/${result.analysisId}`);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to start analysis'));
      setErrorCode(err.response?.data?.errorCode);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner size="lg" text="Loading analysis..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        errorCode={errorCode}
        message={error}
        onRetry={loadAnalysis}
        language={language}
      />
    );
  }

  if (!analysis) return null;

  // Processing state
  if (analysis.status === 'PENDING' || analysis.status === 'PROCESSING') {
    return (
      <div className="page-container text-center py-16 animate-fade-in">
        <div className="w-24 h-24 rounded-full ethiopian-flag-gradient mx-auto mb-6 flex items-center justify-center animate-pulse shadow-flag-glow">
          <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
          Analyzing Your Contract
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-2">
          Our AI is carefully reviewing each clause in <strong className="text-gray-800 dark:text-gray-200">{analysis.contract?.title}</strong>
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-500 mt-4">
          <div className="w-2 h-2 rounded-full bg-ethiopian-green animate-bounce shadow-[0_0_8px_rgba(0,150,64,0.9)]" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-ethiopian-yellow animate-bounce shadow-[0_0_8px_rgba(239,205,46,0.9)]" style={{ animationDelay: '200ms' }} />
          <div className="w-2 h-2 rounded-full bg-ethiopian-red animate-bounce shadow-[0_0_8px_rgba(218,9,47,0.9)]" style={{ animationDelay: '400ms' }} />
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-500 mt-6">
          This may take a minute. We'll update automatically.
        </p>
      </div>
    );
  }

  // Failed state
  if (analysis.status === 'FAILED') {
    return (
      <ErrorState
        errorCode={analysis.errorCode}
        message={analysis.errorMessage}
        onRetry={retryAnalysis}
        language={language}
      />
    );
  }

  // Completed state
  const score = analysis.overallScore ?? 0;
  const scoreColor =
    score >= 80
      ? '#009640'
      : score >= 60
        ? '#EFCD2E'
        : score >= 40
          ? '#DA092F'
          : '#f43f5e';
  const scoreGlow =
    score >= 80
      ? 'rgba(0,150,64,0.6)'
      : score >= 60
        ? 'rgba(239,205,46,0.5)'
        : 'rgba(218,9,47,0.5)';
  const clauseAnalyses = analysis.clauseAnalyses || [];
  const isAmharic = language === 'AMHARIC';
  const badClauses = clauseAnalyses.filter(
    (c) => c.sentiment === 'UNFAVORABLE' || c.sentiment === 'RISKY',
  );
  const goodClauses = clauseAnalyses.filter((c) => c.sentiment === 'FAVORABLE');
  const neutralClauses = clauseAnalyses.filter((c) => c.sentiment === 'NEUTRAL');

  const summary = isAmharic
    ? analysis.summaryAmharic || analysis.summary
    : analysis.summary;
  const keyFindings = isAmharic
    ? (analysis.keyFindingsAmharic?.length ? analysis.keyFindingsAmharic : analysis.keyFindings)
    : analysis.keyFindings;
  const recommendations = isAmharic
    ? (analysis.recommendationsAmharic?.length ? analysis.recommendationsAmharic : analysis.recommendations)
    : analysis.recommendations;

  return (
    <div className="page-container animate-fade-in">
      {/* Breadcrumb + Language Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Link to="/" className="hover:text-emerald-700 dark:text-[#4ade80] transition-colors">Dashboard</Link>
          <span>→</span>
          <span className="text-gray-800 dark:text-gray-200">{analysis.contract?.title}</span>
        </div>
        <LanguageToggle language={language} onChange={handleLanguageChange} />
      </div>

      {/* Score Overview Card */}
      <div className="glass-card rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="h-1 flag-accent rounded-full absolute top-0 left-0 right-0" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 pt-2">
          {/* Score Circle */}
          <div className="relative flex-shrink-0">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                className="text-gray-300 dark:text-white/10"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 352} 352`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 8px ${scoreGlow})` }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{score}</span>
                <span className="text-sm text-gray-600 dark:text-gray-500 block">/100</span>
              </div>
            </div>
          </div>

          {/* Overview Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                {analysis.contract?.title}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${RISK_COLORS[analysis.riskLevel || 'LOW']}`}>
                {analysis.riskLevel} Risk
              </span>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-ethiopian-green/10 border border-ethiopian-green/25 rounded-xl">
                <p className="text-2xl font-bold text-emerald-700 dark:text-[#4ade80]">{goodClauses.length}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {isAmharic ? 'ጥሩ አንቀጾች' : 'Good Clauses'}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/15 rounded-xl">
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{neutralClauses.length}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {isAmharic ? 'ገለልተኛ' : 'Neutral'}
                </p>
              </div>
              <div className="p-3 bg-ethiopian-red/10 border border-ethiopian-red/25 rounded-xl">
                <p className="text-2xl font-bold text-red-700 dark:text-[#fb7185]">{badClauses.length}</p>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {isAmharic ? 'ትኩረት የሚሹ' : 'Needs Attention'}
                </p>
              </div>
              <div className="p-3 bg-ethiopian-yellow/10 border border-ethiopian-yellow/25 rounded-xl">
                <p className="text-2xl font-bold text-yellow-700 dark:text-ethiopian-yellow">{clauseAnalyses.length}</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                  {isAmharic ? 'ጠቅላላ አንቀጾች' : 'Total Clauses'}
                </p>
              </div>
            </div>

            {summary && (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{summary}</p>
            )}
          </div>
        </div>

        {/* Key Findings & Recommendations */}
        <div className="grid md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-gray-200 dark:border-white/10">
          {keyFindings && keyFindings.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-ethiopian-red/15 flex items-center justify-center">
                  <span className="text-xs">🔍</span>
                </span>
                {isAmharic ? 'ቁልፍ ግኝቶች' : 'Key Findings'}
              </h3>
              <ul className="space-y-2">
                {keyFindings.map((finding, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-red-700 dark:text-[#fb7185] mt-0.5">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations && recommendations.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-ethiopian-yellow/15 flex items-center justify-center">
                  <span className="text-xs">💡</span>
                </span>
                {isAmharic ? 'ምክሮች' : 'Recommendations'}
              </h3>
              <ul className="space-y-2">
                {recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-yellow-700 dark:text-ethiopian-yellow mt-0.5">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Clause-by-Clause Analysis */}
      <div className="mb-8">
        <h2 className="section-title mb-6">
          {isAmharic ? 'የአንቀጽ በአንቀጽ ትንታኔ' : 'Clause-by-Clause Analysis'}
        </h2>

        {/* Summary tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => {
              const el = document.getElementById('all-clauses');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-gray-300 dark:border-white/15 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-ethiopian-green/60 hover:text-gray-900 dark:text-white transition-colors"
          >
            {isAmharic ? 'ሁሉም አንቀጾች' : 'All Clauses'} ({clauseAnalyses.length})
          </button>
          {badClauses.length > 0 && (
            <button
              onClick={() => {
                const el = document.getElementById('bad-clauses');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-ethiopian-red/10 rounded-xl border border-ethiopian-red/30 text-sm font-medium text-red-700 dark:text-[#fb7185] hover:bg-ethiopian-red/20 transition-colors"
            >
              ⚠️ {isAmharic ? 'ትኩረት የሚሹ' : 'Needs Attention'} ({badClauses.length})
            </button>
          )}
          {goodClauses.length > 0 && (
            <button
              onClick={() => {
                const el = document.getElementById('good-clauses');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-ethiopian-green/10 rounded-xl border border-ethiopian-green/30 text-sm font-medium text-emerald-700 dark:text-[#4ade80] hover:bg-ethiopian-green/20 transition-colors"
            >
              ✅ {isAmharic ? 'ጥሩ' : 'Good'} ({goodClauses.length})
            </button>
          )}
        </div>

        {/* Bad Clauses Section */}
        {badClauses.length > 0 && (
          <div id="bad-clauses" className="mb-8">
            <h3 className="text-lg font-semibold text-red-700 dark:text-[#fb7185] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-ethiopian-red/15 flex items-center justify-center text-sm">
                ⚠️
              </span>
              {isAmharic ? 'ትኩረት የሚሹ አንቀጾች' : 'Clauses That Need Attention'}
            </h3>
            <div className="space-y-3">
              {badClauses.map((clause) => (
                <ClauseCard key={clause.id} clause={clause} language={language} />
              ))}
            </div>
          </div>
        )}

        {/* Good Clauses Section */}
        {goodClauses.length > 0 && (
          <div id="good-clauses" className="mb-8">
            <h3 className="text-lg font-semibold text-emerald-700 dark:text-[#4ade80] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-ethiopian-green/15 flex items-center justify-center text-sm">
                ✅
              </span>
              {isAmharic ? 'ጥሩ አንቀጾች' : 'Favorable Clauses'}
            </h3>
            <div className="space-y-3">
              {goodClauses.map((clause) => (
                <ClauseCard key={clause.id} clause={clause} language={language} />
              ))}
            </div>
          </div>
        )}

        {/* All Clauses */}
        <div id="all-clauses">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center text-sm">
              📋
            </span>
            {isAmharic ? 'ሁሉም አንቀጾች' : 'All Clauses'}
          </h3>
          <div className="space-y-3">
            {clauseAnalyses.map((clause) => (
              <ClauseCard key={clause.id} clause={clause} language={language} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
