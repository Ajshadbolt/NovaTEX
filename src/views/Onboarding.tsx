import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Onboarding.css';

interface LatexCheckResult {
  latexmk: boolean;
  pdflatex: boolean;
}

type Phase = 'welcome' | 'checking' | 'ready' | 'missing';

interface OnboardingProps {
  isFirstLaunch: boolean;
  onComplete: () => void;
}

export function Onboarding({ isFirstLaunch, onComplete }: OnboardingProps) {
  const [phase, setPhase] = useState<Phase>(isFirstLaunch ? 'welcome' : 'checking');
  const [latexResult, setLatexResult] = useState<LatexCheckResult | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const checkedRef = useRef(false);

  const runCheck = async () => {
    setPhase('checking');
    try {
      const result = await invoke<LatexCheckResult>('check_latex');
      setLatexResult(result);
      setPhase(result.latexmk || result.pdflatex ? 'ready' : 'missing');
    } catch {
      setLatexResult({ latexmk: false, pdflatex: false });
      setPhase('missing');
    }
  };

  useEffect(() => {
    if (isFirstLaunch) {
      const t = setTimeout(runCheck, 2600);
      return () => clearTimeout(t);
    }
    if (!checkedRef.current) {
      checkedRef.current = true;
      void runCheck();
    }
  }, [isFirstLaunch]);

  const handleEnter = () => {
    localStorage.setItem('novatex_onboarded', '1');
    onComplete();
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await runCheck();
    setIsRetrying(false);
  };

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    } catch {
      // clipboard not available
    }
  };

  const detectedEngine = latexResult?.latexmk ? 'latexmk' : latexResult?.pdflatex ? 'pdflatex' : null;

  const installOptions = [
    {
      label: 'Full distribution — recommended',
      cmd: 'brew install --cask mactex-no-gui',
    },
    {
      label: 'Lightweight (BasicTeX)',
      cmd: 'brew install --cask basictex',
    },
  ];

  return (
    <div className="ob-root">
      <div className="ob-drag" data-tauri-drag-region aria-hidden="true" />
      <div className="ob-blob ob-blob-1" aria-hidden="true" />
      <div className="ob-blob ob-blob-2" aria-hidden="true" />

      <div className="ob-card">
        {phase === 'welcome' && (
          <div className="ob-phase ob-phase-welcome" key="welcome">
            <div className="ob-mark" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="ob-mark-bg" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#081521" />
                    <stop offset="0.55" stopColor="#123446" />
                    <stop offset="1" stopColor="#1D5665" />
                  </linearGradient>
                  <linearGradient id="ob-mark-paper" x1="10" y1="8" x2="31" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FFF8EC" />
                    <stop offset="1" stopColor="#F4DFC0" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#ob-mark-bg)" />
                <circle cx="37" cy="11" r="9" fill="#FF8A5B" fillOpacity="0.18" />
                <circle cx="11" cy="37" r="11" fill="#38B9AE" fillOpacity="0.16" />
                <path d="M13 8H26L33 15V36C33 38.7614 30.7614 41 28 41H13C10.2386 41 8 38.7614 8 36V13C8 10.2386 10.2386 8 13 8Z" fill="url(#ob-mark-paper)" />
                <path d="M26 8L33 15H29C27.3431 15 26 13.6569 26 12V8Z" fill="#FFD8A0" />
                <path d="M14 14L21 29" stroke="#0A2335" strokeWidth="3.2" strokeLinecap="round" />
                <path d="M21 17H26" stroke="#2FB9AC" strokeWidth="2" strokeLinecap="round" />
                <path d="M17 23H26" stroke="#E77D5A" strokeWidth="1.8" strokeLinecap="round" />
                <rect x="12" y="31" width="12" height="1.7" rx="0.85" fill="#1D5060" />
                <rect x="12" y="35" width="15" height="1.7" rx="0.85" fill="#1D5060" fillOpacity="0.55" />
              </svg>
            </div>
            <h1 className="ob-title">NovaTeX</h1>
            <p className="ob-subtitle">Minimalist LaTeX workspace</p>
          </div>
        )}

        {phase === 'checking' && (
          <div className="ob-phase ob-phase-checking" key="checking">
            <div className="ob-spinner" aria-label="Checking…" />
            <h2 className="ob-heading">Checking your setup</h2>
            <p className="ob-body">Looking for LaTeX on your system…</p>
          </div>
        )}

        {phase === 'ready' && (
          <div className="ob-phase ob-phase-ready" key="ready">
            <div className="ob-check-icon" aria-label="Success">
              <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle
                  cx="28" cy="28" r="26"
                  stroke="currentColor" strokeWidth="1.5"
                  className="ob-check-circle"
                />
                <path
                  d="M16 28L23.5 35.5L40 19"
                  stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"
                  className="ob-check-path"
                />
              </svg>
            </div>
            <h2 className="ob-heading">Ready to write</h2>
            <p className="ob-body">
              {detectedEngine} detected — you're all set.
            </p>
            <button className="ob-cta" onClick={handleEnter}>
              Open NovaTeX
            </button>
          </div>
        )}

        {phase === 'missing' && (
          <div className="ob-phase ob-phase-missing" key="missing">
            <div className="ob-warn-badge" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="ob-heading">LaTeX not found</h2>
            <p className="ob-body ob-body-missing">
              NovaTeX needs a LaTeX distribution to compile documents.
              Install one, then click Check again.
            </p>

            <div className="ob-install">
              {installOptions.map((opt, idx) => (
                <div className="ob-install-row" key={idx}>
                  <div className="ob-install-label">{opt.label}</div>
                  <div className="ob-code-row">
                    <code className="ob-code">{opt.cmd}</code>
                    <button
                      className="ob-copy-btn"
                      onClick={() => void handleCopy(opt.cmd, idx)}
                      aria-label={`Copy: ${opt.cmd}`}
                    >
                      {copiedIdx === idx ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className="ob-retry" onClick={() => void handleRetry()} disabled={isRetrying}>
              {isRetrying ? 'Checking…' : 'Check again'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
