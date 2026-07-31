import { useState } from 'react';
import type { ClauseAnalysis, AnalysisLanguage } from '../types';
import { SENTIMENT_LABELS, SENTIMENT_LABELS_AMHARIC } from '../types';

interface Props {
  clause: ClauseAnalysis;
  language?: AnalysisLanguage;
}

export default function ClauseCard({ clause, language = 'ENGLISH' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isAmharic = language === 'AMHARIC';

  const explanation = isAmharic
    ? clause.explanationAmharic || clause.explanation
    : clause.explanation;
  const suggestion = isAmharic
    ? clause.suggestionAmharic || clause.suggestion
    : clause.suggestion;

  const sentimentLabel = isAmharic
    ? SENTIMENT_LABELS_AMHARIC[clause.sentiment]
    : SENTIMENT_LABELS[clause.sentiment];

  const borderColor = {
    FAVORABLE: 'border-emerald-500/60',
    NEUTRAL: 'border-gray-300 dark:border-white/20',
    UNFAVORABLE: 'border-ethiopian-red/60',
    RISKY: 'border-orange-500/60',
  }[clause.sentiment];

  const accentBg = {
    FAVORABLE: 'bg-emerald-100 text-emerald-700 dark:bg-ethiopian-green/15 dark:text-[#4ade80]',
    NEUTRAL: 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300',
    UNFAVORABLE: 'bg-red-100 text-red-700 dark:bg-ethiopian-red/15 dark:text-[#fb7185]',
    RISKY: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  }[clause.sentiment];

  const badgeColor = {
    FAVORABLE: 'badge-favorable',
    NEUTRAL: 'badge-neutral',
    UNFAVORABLE: 'badge-unfavorable',
    RISKY: 'badge-risky',
  }[clause.sentiment];

  const severityColor =
    clause.severity >= 8
      ? 'bg-ethiopian-red'
      : clause.severity >= 5
        ? 'bg-orange-500'
        : clause.severity >= 3
          ? 'bg-ethiopian-yellow'
          : 'bg-emerald-500';

  return (
    <div
      className={`border-l-4 ${borderColor} glass-card rounded-xl overflow-hidden animate-slide-up transition-all duration-300`}
      style={{ animationDelay: `${clause.clauseNumber * 100}ms` }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-100 dark:hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`flex-shrink-0 w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center text-sm font-bold`}>
            {clause.clauseNumber}
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {clause.clauseTitle || (isAmharic ? `አንቀጽ ${clause.clauseNumber}` : `Clause ${clause.clauseNumber}`)}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {isAmharic ? 'ክብደት' : 'Severity'}: {clause.severity}/10
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Severity bar */}
          <div className="w-16 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full transition-all duration-500 ${severityColor}`}
              style={{ width: `${clause.severity * 10}%` }}
            />
          </div>

          <span className={badgeColor}>
            {sentimentLabel}
          </span>

          <svg
            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-200 dark:border-white/10 animate-fade-in">
          {/* Clause Text */}
          <div className="mt-4">
            <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
              {isAmharic ? 'የአንቀጽ ጽሑፍ' : 'Clause Text'}
            </h5>
            <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-800 dark:bg-black/30 dark:text-gray-300 leading-relaxed font-mono text-xs border border-gray-200 dark:border-white/10">
              {clause.clauseText}
            </div>
          </div>

          {/* Explanation */}
          {explanation && (
            <div className="mt-4">
              <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                {isAmharic ? 'ትንታኔ' : 'Analysis'}
              </h5>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{explanation}</p>
            </div>
          )}

          {/* Suggestion */}
          {suggestion && (
            <div className="mt-4 p-4 bg-ethiopian-yellow/10 border border-ethiopian-yellow/25 rounded-lg">
              <h5 className="text-xs font-semibold text-yellow-700 dark:text-ethiopian-yellow uppercase tracking-wider mb-1">
                💡 {isAmharic ? 'የሚመከር እርምጃ' : 'Suggested Action'}
              </h5>
              <p className="text-sm text-gray-800 dark:text-yellow-100/90">{suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
