import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GITHUB_URL } from '../constants/support';

/* ---------- Small building blocks ---------- */

function GitHubIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
}

/* Detects when an element scrolls into view (fires once). */
function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/* True when the user prefers reduced motion (listens for live changes). */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/* Eases a value from 0 → target once `inView` flips true. */
function useCountUp(inView: boolean, target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return value;
}

/* ---------- Hero mock: an AI analysis report ---------- */

function MockAnalysis() {
  const score = 72;
  const radius = 32;
  const circumference = 2 * Math.PI * radius; // ≈ 201.06
  const targetDash = (score / 100) * circumference;

  const clauses = [
    { num: 1, title: 'Termination Clause', sentiment: 'Risky', cls: 'badge-risky' },
    { num: 2, title: 'Payment Terms', sentiment: 'Good', cls: 'badge-favorable' },
    { num: 3, title: 'Non-Compete Agreement', sentiment: 'Needs Attention', cls: 'badge-unfavorable' },
  ];

  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const displayScore = useCountUp(inView, score);
  const reduceMotion = usePrefersReducedMotion();
  const ringActive = inView || reduceMotion;
  const ringDash = ringActive ? targetDash : 0;

  return (
    <div
      ref={ref}
      className="glass-card rounded-2xl overflow-hidden shadow-card-dark-lg animate-float"
    >
      <div className="h-1 flag-accent" />
      <div className="p-6">
        {/* Mock header */}
        <div
          className={`flex items-center justify-between mb-5 transition-all duration-700 ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg ethiopian-flag-gradient flex items-center justify-center">
              <span className="text-white text-sm font-bold drop-shadow">ኢ</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">Employment Agreement</p>
              <p className="text-xs text-gray-600 dark:text-gray-500">AI analysis · just now</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-500/40 dark:bg-yellow-500/15 dark:text-yellow-300">
            MEDIUM Risk
          </span>
        </div>

        {/* Mock score ring */}
        <div className="flex items-center gap-6 mb-5">
          <div className="relative flex-shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" className="text-gray-300 dark:text-white/10" strokeWidth="6" />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="#EFCD2E"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${ringDash} ${circumference}`}
                style={{
                  // Hidden until the scroll animation starts so the round
                  // linecap never paints a stray dot before it fills.
                  opacity: ringActive ? 1 : 0,
                  transition:
                    'stroke-dasharray 1.4s cubic-bezier(0.65, 0, 0.35, 1) 0.2s, opacity 0.3s ease 0s',
                  filter: 'drop-shadow(0 0 6px rgba(239,205,46,0.6))',
                }}
              />
            </svg>
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
              style={{ opacity: ringActive ? 1 : 0 }}
            >
              <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                {displayScore}
              </span>
            </div>
          </div>
          <p
            className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-all duration-700 delay-200 ${
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            The agreement is generally fair, but the non-compete clause is unusually broad and
            the termination terms favor the employer.
          </p>
        </div>

        {/* Mock clause rows */}
        <div className="space-y-2">
          {clauses.map((c, i) => (
            <div
              key={c.num}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl transition-all duration-500 ${
                inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
              }`}
              style={{ transitionDelay: `${300 + i * 150}ms` }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-md bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {c.num}
                </span>
                <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{c.title}</span>
              </div>
              <span className={`${c.cls} flex-shrink-0`}>{c.sentiment}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Feature card ---------- */

function Feature({
  emoji,
  title,
  description,
  accent,
}: {
  emoji: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 transition-all duration-300 hover:border-gray-400 dark:border-white/25 hover:-translate-y-1 hover:shadow-card-dark-lg group">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-xl mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
        {emoji}
      </div>
      <h3 className="font-display font-semibold text-gray-900 dark:text-white text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

/* ---------- Scroll-reveal wrapper for sections ---------- */

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ---------- Landing page ---------- */

export default function Landing() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        {/* Decorative glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-ethiopian-green/20 blur-3xl" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-ethiopian-yellow/10 blur-3xl" />
          <div className="absolute top-1/2 -left-32 w-96 h-96 rounded-full bg-ethiopian-red/10 blur-3xl" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.06] hero-grid" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-24">
          <div className="max-w-3xl mx-auto text-center">
            {/* Flag badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/15 text-sm text-gray-700 dark:text-gray-300 mb-6 animate-fade-in">
              <span className="w-4 h-4 rounded ethiopian-flag-gradient" />
              የኮንትራት ተንታኝ · Ethiopian Contract Reader
            </div>

            <h1 className="text-4xl sm:text-6xl font-display font-bold text-gray-900 dark:text-white tracking-tight mb-6">
              Understand every contract{' '}
              <span className="bg-gradient-to-r from-[#4ade80] via-ethiopian-yellow to-[#fb7185] bg-clip-text text-transparent">
                before you sign
              </span>
            </h1>

            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              AI-powered contract analysis for{' '}
              <span className="text-gray-800 dark:text-gray-200 font-medium">English</span> and{' '}
              <span className="text-gray-800 dark:text-gray-200 font-medium">Amharic (አማርኛ)</span> documents.
              Paste or upload a contract and get a clear, clause-by-clause risk report in seconds.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Link to="/signup" className="btn-primary inline-flex items-center gap-2 text-base">
                Get Started Free
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                </svg>
              </Link>
              <Link to="/login" className="btn-secondary inline-flex items-center gap-2 text-base">
                Sign In
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-2 text-base"
              >
                <GitHubIcon className="w-5 h-5" />
                Star on GitHub
              </a>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span> Free to use
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span> No credit card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span> PDF · DOCX · Image OCR
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span> 🇪🇹 Amharic supported
              </span>
            </div>
          </div>

          {/* Mock visual */}
          <div className="max-w-md mx-auto mt-14">
            <MockAnalysis />
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Reveal>
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-emerald-700 dark:text-[#4ade80] uppercase tracking-wider mb-2">Features</p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
              Everything you need to read contracts with confidence
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              emoji: '🤖',
              title: 'AI-Powered Analysis',
              description: "Our AI reads the full document and explains each clause in plain language — highlighting what's good, what's risky, and what needs attention.",
              accent: 'from-emerald-500 to-teal-600',
            },
            {
              emoji: '🇪🇹',
              title: 'English & Amharic',
              description: 'Analyze contracts written in English or Amharic (አማርኛ), and read the results in either language with one click.',
              accent: 'from-ethiopian-yellow to-amber-600',
            },
            {
              emoji: '📑',
              title: 'Clause-by-Clause Breakdown',
              description: 'Every clause gets its own card with a severity score, an explanation, and a suggested action — so nothing gets overlooked.',
              accent: 'from-blue-500 to-indigo-600',
            },
            {
              emoji: '🔍',
              title: 'PDF & Image OCR',
              description: 'Upload PDFs, DOCX files, or even scanned images. Text is extracted automatically, including Amharic text recognition.',
              accent: 'from-purple-500 to-violet-600',
            },
            {
              emoji: '⚖️',
              title: 'Risk Scoring',
              description: 'Each contract gets an overall fairness score and risk level (Low → Critical), backed by a detailed summary and recommendations.',
              accent: 'from-ethiopian-red to-rose-600',
            },
            {
              emoji: '🔐',
              title: 'Secure by Design',
              description: 'Email verification, optional two-factor authentication, and rate-limited login — your documents stay private and protected.',
              accent: 'from-orange-500 to-amber-600',
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 120}>
              <Feature
                emoji={f.emoji}
                title={f.title}
                description={f.description}
                accent={f.accent}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <Reveal>
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-emerald-700 dark:text-[#4ade80] uppercase tracking-wider mb-2">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
              Three steps to a clear picture
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              step: '01',
              emoji: '📄',
              title: 'Paste or upload',
              description: 'Paste your contract text or upload a PDF, DOCX, TXT, or image file.',
            },
            {
              step: '02',
              emoji: '🤖',
              title: 'AI reviews it',
              description: 'Our AI analyzes every clause for risk, fairness, and hidden gotchas.',
            },
            {
              step: '03',
              emoji: '📋',
              title: 'Get your report',
              description: 'Receive a score, key findings, and actionable recommendations.',
            },
          ].map((s, i) => (
            <Reveal key={s.step} delay={i * 150}>
              <div className="relative glass-card rounded-2xl p-7 transition-all duration-300 hover:border-ethiopian-green/50 hover:shadow-flag-glow h-full">
                <span className="absolute top-5 right-6 font-display font-bold text-4xl text-gray-300 dark:text-white/10">
                  {s.step}
                </span>
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-white/[0.06] border border-gray-300 dark:border-white/15 flex items-center justify-center text-2xl mb-4">
                  {s.emoji}
                </div>
                <h3 className="font-display font-semibold text-gray-900 dark:text-white text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{s.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <Reveal>
          <div className="relative rounded-3xl overflow-hidden glass-card">
            <div className="h-1 flag-accent" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-ethiopian-green/25 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-ethiopian-red/20 blur-3xl" />
            </div>
            <div className="relative p-10 sm:p-14 text-center">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-white tracking-tight mb-4">
                Ready to review your first contract?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                Create a free account and get an AI analysis of your contract in seconds — in English or Amharic.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/signup" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5">
                  Create Free Account
                </Link>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center gap-2 text-base px-8 py-3.5"
                >
                  <GitHubIcon className="w-5 h-5" />
                  github.com/kidusking-glich
                </a>
              </div>
              <button
                onClick={() => scrollTo('features')}
                className="mt-8 text-sm text-gray-600 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-colors inline-flex items-center gap-1.5"
              >
                Explore features
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7m14-8l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
