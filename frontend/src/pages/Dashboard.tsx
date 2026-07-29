import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { contractsService } from '../services/contracts';
import { analysisService } from '../services/analysis';
import type { Contract, Analysis } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { RISK_COLORS } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contractsRes, analysesRes] = await Promise.all([
        contractsService.getAll({ limit: 50 }),
        analysisService.getAll(),
      ]);
      setContracts(contractsRes.data);
      setAnalyses(analysesRes);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAnalysisForContract = (contractId: string) => {
    return analyses.find((a) => a.contractId === contractId);
  };

  const filteredContracts = contracts.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner size="lg" text="Loading your contracts..." />
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">My Contracts</h1>
          <p className="text-gray-500 mt-1">
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <Link to="/new" className="btn-primary inline-flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Contract
        </Link>
      </div>

      {/* Search */}
      {contracts.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field max-w-md"
            placeholder="🔍 Search contracts..."
          />
        </div>
      )}

      {/* Stats Cards */}
      {analyses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((level) => {
            const count = analyses.filter(
              (a) => a.riskLevel === level && a.status === 'COMPLETED',
            ).length;
            if (count === 0) return null;
            return (
              <div
                key={level}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      level === 'LOW'
                        ? 'bg-emerald-500'
                        : level === 'MEDIUM'
                          ? 'bg-yellow-500'
                          : level === 'HIGH'
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                    }`}
                  />
                  <span className="text-xs font-medium text-gray-500">{level} Risk</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {contracts.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-ethiopian-green/10 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-ethiopian-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 mb-2">
            No contracts yet
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Upload or paste your first contract to get an AI-powered analysis highlighting good and bad clauses.
          </p>
          <Link to="/new" className="btn-primary inline-flex items-center gap-2">
            Get Started
          </Link>
        </div>
      )}

      {/* Contract List */}
      <div className="space-y-4">
        {filteredContracts.map((contract, index) => {
          const analysis = getAnalysisForContract(contract.id);
          return (
            <div
              key={contract.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-ethiopian-green/20 transition-all duration-300 cursor-pointer group animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => {
                if (analysis) {
                  navigate(`/analysis/${analysis.id}`);
                }
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{contract.language === 'AMHARIC' ? '🇪🇹' : '📄'}</span>
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-ethiopian-green transition-colors">
                      {contract.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500">
                    {contract.language === 'AMHARIC'
                      ? 'Amharic'
                      : contract.language === 'ENGLISH'
                        ? 'English'
                        : 'Other'}
                    {' · '}
                    {new Date(contract.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {contract.content && ` · ${contract.content.length.toLocaleString()} characters`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {analysis ? (
                    <>
                      {analysis.status === 'COMPLETED' ? (
                        <>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${RISK_COLORS[analysis.riskLevel || 'LOW']}`}>
                            {analysis.overallScore}/100
                          </span>
                          <span className="text-sm text-gray-400 group-hover:text-ethiopian-green transition-colors">
                            View →
                          </span>
                        </>
                      ) : analysis.status === 'PROCESSING' ? (
                        <>
                          <div className="flex items-center gap-2 text-ethiopian-yellow text-sm">
                            <div className="w-4 h-4 border-2 border-ethiopian-yellow/30 border-t-ethiopian-green rounded-full animate-spin" />
                            Analyzing...
                          </div>
                        </>
                      ) : analysis.status === 'FAILED' ? (
                        <span className="badge-unfavorable">Failed</span>
                      ) : null}
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/analysis/${contract.id}`);
                      }}
                      className="text-sm text-ethiopian-green font-medium hover:underline"
                    >
                      Analyze →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No search results */}
      {filteredContracts.length === 0 && contracts.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          No contracts match "{search}"
        </div>
      )}
    </div>
  );
}
