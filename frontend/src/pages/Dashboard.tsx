import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { contractsService } from '../services/contracts';
import { analysisService } from '../services/analysis';
import { getErrorMessage } from '../services/api';
import { useToast } from '../components/ToastProvider';
import type { Contract, Analysis } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import SupportDonation from '../components/SupportDonation';
import { RISK_COLORS } from '../types';

const PAGE_SIZE = 8;

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState<Contract | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against out-of-order responses when a new query supersedes an older one.
  const requestSeq = useRef(0);
  // Dedupes identical load errors so a down backend doesn't stack repeated toasts.
  const lastLoadError = useRef('');

  const loadData = useCallback(async (searchTerm: string, pageNum: number) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setLoadError('');
    try {
      const [contractsRes, analysesRes] = await Promise.all([
        contractsService.getAll({ search: searchTerm || undefined, page: pageNum, limit: PAGE_SIZE }),
        analysisService.getAll(),
      ]);
      if (seq !== requestSeq.current) return; // stale response, ignore
      // A successful load clears the dedup so a repeated error later still notifies once.
      lastLoadError.current = '';
      setContracts(contractsRes.data);
      setTotal(contractsRes.total);
      setTotalPages(contractsRes.totalPages);
      setAnalyses(analysesRes);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      const msg = getErrorMessage(err, 'Failed to load contracts');
      setLoadError(msg);
      if (lastLoadError.current !== msg) {
        lastLoadError.current = msg;
        toast(msg, 'error');
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData(search, page);
  }, [search, page, loadData]);

  // Debounce search input → server-side search, reset to page 1
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const getAnalysisForContract = (contractId: string) => {
    return analyses.find((a) => a.contractId === contractId);
  };

  const handleDelete = async (contract: Contract) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await contractsService.delete(contract.id);
      toast(`"${contract.title}" deleted`, 'success');
      // If we removed the last item on a page beyond the first, step back a page
      if (contracts.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        loadData(search, page);
      }
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to delete contract'), 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const openRename = (contract: Contract) => {
    setRenameTarget(contract);
    setRenameTitle(contract.title);
  };

  const handleRename = async () => {
    if (!renameTarget || !renameTitle.trim() || renaming) return;
    setRenaming(true);
    try {
      const updated = await contractsService.update(renameTarget.id, { title: renameTitle.trim() });
      setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast('Contract renamed', 'success');
      setRenameTarget(null);
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to rename contract'), 'error');
    } finally {
      setRenaming(false);
    }
  };

  const languageLabel = (lang: Contract['language']) =>
    lang === 'AMHARIC' ? 'Amharic' : lang === 'ENGLISH' ? 'English' : 'Other';

  if (loading && contracts.length === 0) {
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
          <p className="section-subtitle">
            {total} contract{total !== 1 ? 's' : ''} uploaded
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
      {(total > 0 || searchInput) && (
        <div className="mb-6">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
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
                className="glass-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.03] hover:border-white/25"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      level === 'LOW'
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                        : level === 'MEDIUM'
                          ? 'bg-ethiopian-yellow shadow-[0_0_8px_rgba(239,205,46,0.8)]'
                          : level === 'HIGH'
                            ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                            : 'bg-ethiopian-red shadow-[0_0_8px_rgba(218,9,47,0.8)]'
                    }`}
                  />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{level} Risk</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Load error state */}
      {!loading && loadError && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-ethiopian-red/15 mx-auto mb-6 flex items-center justify-center shadow-flag-glow-red">
            <svg className="w-10 h-10 text-red-700 dark:text-[#fb7185]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Couldn't load your contracts</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{loadError}</p>
          <button onClick={() => loadData(search, page)} className="btn-primary">
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !loadError && total === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-ethiopian-green/15 mx-auto mb-6 flex items-center justify-center shadow-flag-glow">
            <svg className="w-10 h-10 text-emerald-700 dark:text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">
            {search ? 'No matching contracts' : 'No contracts yet'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {search
              ? `Nothing matches "${search}". Try a different search term.`
              : 'Upload or paste your first contract to get an AI-powered analysis highlighting good and bad clauses.'}
          </p>
          {search ? (
            <button
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setPage(1);
              }}
              className="btn-secondary"
            >
              Clear search
            </button>
          ) : (
            <Link to="/new" className="btn-primary inline-flex items-center gap-2">
              Get Started
            </Link>
          )}
        </div>
      )}

      {/* Contract List */}
      <div className="space-y-4">
        {contracts.map((contract, index) => {
          const analysis = getAnalysisForContract(contract.id);
          return (
            <div
              key={contract.id}
              className="glass-card rounded-xl p-5 transition-all duration-300 cursor-pointer group animate-slide-up hover:border-ethiopian-green/50 hover:shadow-flag-glow"
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
                    <h3 className="font-semibold text-gray-100 truncate group-hover:text-emerald-700 dark:text-[#4ade80] transition-colors">
                      {contract.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {languageLabel(contract.language)}
                    {' · '}
                    {new Date(contract.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {contract.content && ` · ${contract.content.length.toLocaleString()} characters`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {analysis ? (
                    <>
                      {analysis.status === 'COMPLETED' ? (
                        <>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${RISK_COLORS[analysis.riskLevel || 'LOW']}`}>
                            {analysis.overallScore}/100
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-emerald-700 dark:text-[#4ade80] transition-colors">
                            View →
                          </span>
                        </>
                      ) : analysis.status === 'PROCESSING' ? (
                        <div className="flex items-center gap-2 text-yellow-700 dark:text-ethiopian-yellow text-sm">
                          <div className="w-4 h-4 border-2 border-ethiopian-yellow/30 border-t-ethiopian-green rounded-full animate-spin" />
                          Analyzing...
                        </div>
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
                      className="text-sm text-emerald-700 dark:text-[#4ade80] font-medium hover:underline"
                    >
                      Analyze →
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-1 border-l border-gray-200 dark:border-white/10 pl-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openRename(contract);
                      }}
                      title="Rename"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-emerald-700 dark:text-[#4ade80] hover:bg-ethiopian-green/10 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (deleteId === contract.id) {
                          handleDelete(contract);
                        } else {
                          setDeleteId(contract.id);
                        }
                      }}
                      onBlur={() => setDeleteId((v) => (v === contract.id ? null : v))}
                      title="Delete"
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        deleteId === contract.id
                          ? 'bg-ethiopian-red text-white font-bold text-xs w-auto px-2'
                          : 'text-gray-600 dark:text-gray-400 hover:text-red-700 dark:text-[#fb7185] hover:bg-ethiopian-red/10'
                      }`}
                      disabled={deleting && deleteId === contract.id}
                    >
                      {deleting && deleteId === contract.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : deleteId === contract.id ? (
                        'Delete?'
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading more */}
      {loading && contracts.length > 0 && (
        <div className="py-6 flex justify-center">
          <LoadingSpinner size="md" />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-white/5 border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page <span className="text-gray-900 dark:text-white font-semibold">{page}</span> of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-white/5 border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Telebirr Support */}
      <SupportDonation />

      {/* Rename Modal */}
      {renameTarget && (
        <div
          className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setRenameTarget(null)}
        >
          <div
            className="glass-card rounded-2xl w-full max-w-md p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 flag-accent rounded-full mb-5 w-24" />
            <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white mb-1">Rename Contract</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">Update the title of this contract.</p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
            <input
              autoFocus
              type="text"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setRenameTarget(null);
              }}
              className="input-field mb-5"
              placeholder="Contract title"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRenameTarget(null)} className="btn-secondary !px-4 !py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={renaming || !renameTitle.trim()}
                className="btn-primary !px-4 !py-2 text-sm flex items-center gap-2"
              >
                {renaming && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
