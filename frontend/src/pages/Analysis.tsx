import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analysisService } from '../services/analysis';
import type { Analysis as AnalysisType } from '../types';
import ClauseCard from '../components/ClauseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { RISK_COLORS } from '../types';

export default function Analysis() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analysis');
    } finally {
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
      <div className="page-container text-center py-16 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-red-100 mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Analysis Not Found</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  if (!analysis) return null;

  // Processing state
  if (analysis.status === 'PENDING' || analysis.status === 'PROCESSING') {
    return (
      <div className="page-container text-center py-16 animate-fade-in">
        <div className="w-24 h-24 rounded-full ethiopian-flag-gradient mx-auto mb-6 flex items-center justify-center animate-pulse">
          <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Analyzing Your Contract
        </h2>
        <p className="text-gray-500 max-w-md mx-auto mb-2">
          Our AI is carefully reviewing each clause in <strong>{analysis.contract?.title}</strong>
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mt-4">
          <div className="w-2 h-2 rounded-full bg-ethiopian-green animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-ethiopian-yellow animate-bounce" style={{ animationDelay: '200ms' }} />
          <div className="w-2 h-2 rounded-full bg-ethiopian-red animate-bounce" style={{ animationDelay: '400ms' }} />
        </div>
        <p className="text-xs text-gray-400 mt-6">
          This may take a minute. We'll update automatically.
        </p>
      </div>
    );
  }

  // Failed state
  if (analysis.status === 'FAILED') {
    return (
      <div className="page-container text-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-red-100 mx-auto mb-6 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Analysis Failed</h2>
        <p className="text-gray-500 mb-2">{analysis.errorMessage || 'Something went wrong'}</p>
        <button onClick={loadAnalysis} className="btn-primary mt-4">
          Try Again
        </button>
      </div>
    );
  }

  // Completed state
  const score = analysis.overallScore ?? 0;
  const clauseAnalyses = analysis.clauseAnalyses || [];
  const badClauses = clauseAnalyses.filter(
    (c) => c.sentiment === 'UNFAVORABLE' || c.sentiment === 'RISKY',
  );
  const goodClauses = clauseAnalyses.filter((c) => c.sentiment === 'FAVORABLE');
  const neutralClauses = clauseAnalyses.filter((c) => c.sentiment === 'NEUTRAL');

  return (
    <div className="page-container animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-ethiopian-green transition-colors">Dashboard</Link>
        <span>→</span>
        <span className="text-gray-900">{analysis.contract?.title}</span>
      </div>

      {/* Score Overview Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
          {/* Score Circle */}
          <div className="relative flex-shrink-0">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={
                  score >= 80
                    ? '#009640'
                    : score >= 60
                      ? '#EFCD2E'
                      : score >= 40
                        ? '#DA092F'
                        : '#dc2626'
                }
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 352} 352`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-3xl font-bold text-gray-900">{score}</span>
                <span className="text-sm text-gray-500 block">/100</span>
              </div>
            </div>
          </div>

          {/* Overview Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-display font-bold text-gray-900">
                {analysis.contract?.title}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${RISK_COLORS[analysis.riskLevel || 'LOW']}`}>
                {analysis.riskLevel} Risk
              </span>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-700">{goodClauses.length}</p>
                <p className="text-xs text-emerald-600 font-medium">Good Clauses</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-700">{neutralClauses.length}</p>
                <p className="text-xs text-gray-600 font-medium">Neutral</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-700">{badClauses.length}</p>
                <p className="text-xs text-red-600 font-medium">Needs Attention</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="text-2xl font-bold text-amber-700">{clauseAnalyses.length}</p>
                <p className="text-xs text-amber-600 font-medium">Total Clauses</p>
              </div>
            </div>

            {analysis.summary && (
              <p className="text-gray-600 leading-relaxed">{analysis.summary}</p>
            )}
          </div>
        </div>

        {/* Key Findings & Recommendations */}
        <div className="grid md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-gray-100">
          {analysis.keyFindings && analysis.keyFindings.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                  <span className="text-xs">🔍</span>
                </span>
                Key Findings
              </h3>
              <ul className="space-y-2">
                {analysis.keyFindings.map((finding, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="text-xs">💡</span>
                </span>
                Recommendations
              </h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="text-amber-500 mt-0.5">→</span>
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
        <h2 className="section-title mb-6">Clause-by-Clause Analysis</h2>

        {/* Summary tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => {
              const el = document.getElementById('all-clauses');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-ethiopian-green transition-colors"
          >
            All Clauses ({clauseAnalyses.length})
          </button>
          {badClauses.length > 0 && (
            <button
              onClick={() => {
                const el = document.getElementById('bad-clauses');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-red-50 rounded-xl border border-red-200 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              ⚠️ Needs Attention ({badClauses.length})
            </button>
          )}
          {goodClauses.length > 0 && (
            <button
              onClick={() => {
                const el = document.getElementById('good-clauses');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              ✅ Good ({goodClauses.length})
            </button>
          )}
        </div>

        {/* Bad Clauses Section */}
        {badClauses.length > 0 && (
          <div id="bad-clauses" className="mb-8">
            <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-sm">
                ⚠️
              </span>
              Clauses That Need Attention
            </h3>
            <div className="space-y-3">
              {badClauses.map((clause) => (
                <ClauseCard key={clause.id} clause={clause} />
              ))}
            </div>
          </div>
        )}

        {/* Good Clauses Section */}
        {goodClauses.length > 0 && (
          <div id="good-clauses" className="mb-8">
            <h3 className="text-lg font-semibold text-emerald-700 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-sm">
                ✅
              </span>
              Favorable Clauses
            </h3>
            <div className="space-y-3">
              {goodClauses.map((clause) => (
                <ClauseCard key={clause.id} clause={clause} />
              ))}
            </div>
          </div>
        )}

        {/* All Clauses */}
        <div id="all-clauses">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
              📋
            </span>
            All Clauses
          </h3>
          <div className="space-y-3">
            {clauseAnalyses.map((clause) => (
              <ClauseCard key={clause.id} clause={clause} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
