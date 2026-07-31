import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { contractsService } from '../services/contracts';
import { analysisService } from '../services/analysis';
import { getErrorMessage } from '../services/api';

export default function NewContract() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState<'ENGLISH' | 'AMHARIC'>('ENGLISH');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let contract;

      if (mode === 'paste') {
        if (!content.trim()) {
          throw new Error('Please paste your contract text');
        }
        contract = await contractsService.create({
          title: title || 'Untitled Contract',
          content,
          language,
        });
      } else {
        if (!file) {
          throw new Error('Please select a file to upload');
        }
        contract = await contractsService.upload(
          file,
          title || file.name,
          language,
        );
      }

      // Trigger analysis
      await analysisService.analyze(contract.id);

      // Navigate to dashboard - analysis is processing
      navigate('/');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to create contract'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  return (
    <div className="page-container animate-fade-in max-w-3xl">
      <div className="mb-8">
        <h1 className="section-title">New Contract</h1>
        <p className="section-subtitle">
          Paste or upload a contract to get AI-powered analysis
        </p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="h-1 flag-accent" />
        {/* Mode Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setMode('paste')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-all duration-200 relative ${
              mode === 'paste'
                ? 'text-[#4ade80]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <span className="mr-2">📝</span>
            Paste Text
            {mode === 'paste' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-ethiopian-green to-ethiopian-yellow shadow-flag-glow" />
            )}
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-all duration-200 relative ${
              mode === 'upload'
                ? 'text-[#4ade80]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <span className="mr-2">📎</span>
            Upload File
            {mode === 'upload' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-ethiopian-green to-ethiopian-yellow shadow-flag-glow" />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-ethiopian-red/10 border border-ethiopian-red/30 rounded-xl text-sm text-[#fb7185] animate-fade-in">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Contract Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g., Employment Agreement, Rental Contract"
              required
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Language
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLanguage('ENGLISH')}
                className={`flex-1 px-4 py-3 rounded-xl border font-medium transition-all duration-200 ${
                  language === 'ENGLISH'
                    ? 'border-ethiopian-green bg-ethiopian-green/15 text-[#4ade80] shadow-flag-glow'
                    : 'border-white/15 text-gray-400 hover:border-white/30 hover:text-gray-200'
                }`}
              >
                🇬🇧 English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('AMHARIC')}
                className={`flex-1 px-4 py-3 rounded-xl border font-medium transition-all duration-200 ${
                  language === 'AMHARIC'
                    ? 'border-ethiopian-green bg-ethiopian-green/15 text-[#4ade80] shadow-flag-glow'
                    : 'border-white/15 text-gray-400 hover:border-white/30 hover:text-gray-200'
                }`}
              >
                🇪🇹 አማርኛ
              </button>
            </div>
          </div>

          {/* Paste Mode */}
          {mode === 'paste' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Contract Text
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input-field min-h-[300px] font-mono text-sm leading-relaxed resize-y"
                placeholder="Paste your contract text here...&#10;&#10;Supported in both English and Amharic (አማርኛ)"
                rows={12}
                required
              />
              {content && (
                <p className="text-xs text-gray-500 mt-2">
                  {content.length.toLocaleString()} characters
                </p>
              )}
            </div>
          )}

          {/* Upload Mode */}
          {mode === 'upload' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Contract File
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? 'border-ethiopian-green bg-ethiopian-green/10 shadow-flag-glow'
                    : file
                      ? 'border-ethiopian-green bg-ethiopian-green/10'
                      : 'border-white/20 hover:border-ethiopian-green/60 hover:bg-white/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                />

                {file ? (
                  <div className="space-y-2">
                    <div className="text-4xl">📄</div>
                    <p className="font-medium text-gray-100">{file.name}</p>
                    <p className="text-sm text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-sm text-[#fb7185] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-4xl">📂</div>
                    <p className="font-medium text-gray-200">
                      Drop your contract here or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports PDF, DOC, DOCX, TXT, PNG, JPEG (max 30MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing Contract...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Analyze Contract
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="mt-8 p-6 bg-ethiopian-yellow/10 border border-ethiopian-yellow/25 rounded-2xl">
        <h3 className="font-semibold text-ethiopian-yellow mb-2">💡 Tips for Best Results</h3>
        <ul className="text-sm text-yellow-100/80 space-y-1.5">
          <li>• Include the complete contract text for thorough analysis</li>
          <li>• The AI can analyze contracts in both English and Amharic (አማርኛ)</li>
          <li>• Results will highlight unfavorable clauses in red and favorable ones in green</li>
          <li>• <strong>Auto-extracts text</strong> from PDFs, DOCX, images (PNG/JPEG), and scanned docs via OCR</li>
          <li>• For scanned PDFs, the system uses OCR to recognize text — works best with clear, high-resolution documents</li>
          <li>• Supports Amharic text recognition for Ethiopian contracts in አማርኛ</li>
        </ul>
      </div>
    </div>
  );
}
