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
    FAVORABLE: 'border-emerald-400',
    NEUTRAL: 'border-gray-300',
    UNFAVORABLE: 'border-red-400',
    RISKY: 'border-orange-400',
  }[clause.sentiment];

  const badgeColor = {
    FAVORABLE: 'badge-favorable',
    NEUTRAL: 'badge-neutral',
    UNFAVORABLE: 'badge-unfavorable',
    RISKY: 'badge-risky',
  }[clause.sentiment];

  const severityColor =
    clause.severity >= 8
      ? 'bg-red-500'
      : clause.severity >= 5
        ? 'bg-orange-500'
        : clause.severity >= 3
          ? 'bg-yellow-500'
          : 'bg-emerald-500';

  return (
    <div
      className={`border-l-4 ${borderColor} bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-slide-up`}
      style={{ animationDelay: `${clause.clauseNumber * 100}ms` }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
            {clause.clauseNumber}
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">
              {clause.clauseTitle || (isAmharic ? `አንቀጽ ${clause.clauseNumber}` : `Clause ${clause.clauseNumber}`)}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAmharic ? 'ክብደት' : 'Severity'}: {clause.severity}/10
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Severity bar */}
          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full transition-all duration-500 ${severityColor}`}
              style={{ width: `${clause.severity * 10}%` }}
            />
          </div>

          <span className={badgeColor}>
            {sentimentLabel}
          </span>

          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
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
        <div className="px-5 pb-5 border-t border-gray-100 animate-fade-in">
          {/* Clause Text */}
          <div className="mt-4">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {isAmharic ? 'የአንቀጽ ጽሑፍ' : 'Clause Text'}
            </h5>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed font-mono text-xs">
              {clause.clauseText}
            </div>
          </div>

          {/* Explanation */}
          {explanation && (
            <div className="mt-4">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {isAmharic ? 'ትንታኔ' : 'Analysis'}
              </h5>
              <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>
            </div>
          )}

          {/* Suggestion */}
          {suggestion && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h5 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
                💡 {isAmharic ? 'የሚመከር እርምጃ' : 'Suggested Action'}
              </h5>
              <p className="text-sm text-amber-800">{suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
