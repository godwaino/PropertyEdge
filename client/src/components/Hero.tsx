import { useState } from 'react';

interface Props {
  onAnalyseClick: () => void;
  onExtractListing: (text: string) => void;
  visible: boolean;
  isExtracting: boolean;
  selectedPersona: string | null;
  onPersonaSelect: (persona: string) => void;
}

const personas: { label: string; icon: string; hint: string }[] = [
  { label: 'First-Time Buyer', icon: '🏠', hint: 'Stamp duty savings, Help to Buy eligibility and hidden costs.' },
  { label: 'Property Investor', icon: '📈', hint: 'Yield estimate, rental assumptions and downside risk.' },
  { label: 'Home Mover', icon: '🔑', hint: 'Value vs your current area and chain-free leverage.' },
];

const features = [
  { icon: '⚖️', label: 'AI Valuation', desc: 'Real sold prices + AI', anchor: 'section-comps' },
  { icon: '🚩', label: 'Risk Flags', desc: '£ impact estimates', anchor: 'section-risks' },
  { icon: '💬', label: 'Negotiation', desc: 'Offer range + script', anchor: 'section-negotiation' },
  { icon: '✅', label: 'Deal Verdict', desc: 'GOOD / FAIR / OVER', anchor: 'section-verdict' },
];

export default function Hero({
  onAnalyseClick, onExtractListing, visible, isExtracting, selectedPersona, onPersonaSelect,
}: Props) {
  const [pasteText, setPasteText] = useState('');
  const [focused, setFocused] = useState(false);

  if (!visible) return null;

  const handleGo = () => {
    if (pasteText.trim()) {
      onExtractListing(pasteText.trim());
    } else {
      onAnalyseClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGo();
    }
  };

  const activeHint = personas.find((p) => p.label === selectedPersona)?.hint;

  return (
    <section className="hero-mesh">
      <div className="max-w-4xl mx-auto px-5 pt-14 pb-16 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-cyan/10 border border-cyan/25 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
          <span className="text-cyan text-xs font-semibold tracking-wide uppercase">AI-Powered UK Property Analysis</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-th-heading leading-[1.08] tracking-tight mb-6 animate-float-in">
          Is this property{' '}
          <span className="text-gradient-cyan">worth it</span>?
        </h1>

        {/* Sub-headline */}
        <p className="text-th-secondary text-lg sm:text-xl max-w-xl mx-auto mb-10 animate-float-in stagger-1">
          Valuation, risks and negotiation strategy — in under 10 seconds.
        </p>

        {/* Audience chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 animate-float-in stagger-2">
          <span className="text-th-muted text-sm self-center mr-1 hidden sm:inline">I'm a</span>
          {personas.map((p) => (
            <button
              key={p.label}
              onClick={() => onPersonaSelect(selectedPersona === p.label ? '' : p.label)}
              className={`chip ${selectedPersona === p.label ? 'active' : ''}`}
            >
              <span>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
        {activeHint && (
          <p className="text-cyan/80 text-sm mb-8 animate-slide-up">{activeHint}</p>
        )}

        {/* Search bar */}
        <div className={`max-w-2xl mx-auto animate-float-in stagger-3 transition-all duration-300 ${focused ? 'scale-[1.01]' : ''}`}>
          <div className={`bg-th-card rounded-2xl border-2 transition-all duration-200 elevation-2 overflow-hidden ${
            focused ? 'border-cyan/60 shadow-lg shadow-cyan/10' : 'border-th-border'
          }`}>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Paste a Rightmove / Zoopla listing or URL…"
              rows={2}
              className="w-full bg-transparent px-5 pt-4 pb-2 text-th-heading text-sm placeholder-th-muted focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-th-faint text-xs">
                Or{' '}
                <button
                  onClick={onAnalyseClick}
                  className="text-cyan hover:text-cyan/80 underline underline-offset-2 transition-colors"
                >
                  enter details manually
                </button>
              </span>
              <button
                onClick={handleGo}
                disabled={isExtracting}
                className="btn-pill px-5 py-2 text-sm bg-cyan text-navy hover:brightness-110 disabled:opacity-50 shadow-md shadow-cyan/25"
              >
                {isExtracting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-navy/30 border-t-navy rounded-full animate-spin-slow" />
                    Extracting…
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Analyse
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="mt-10 flex flex-wrap justify-center gap-3 animate-float-in stagger-4">
          {features.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => document.getElementById(f.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex items-center gap-2 bg-th-card border border-th-border rounded-xl px-4 py-2.5 hover:border-cyan/40 hover:bg-cyan/5 transition-all group elevation-1"
            >
              <span className="text-base">{f.icon}</span>
              <div className="text-left">
                <p className="text-th-heading text-xs font-semibold leading-tight group-hover:text-cyan transition-colors">{f.label}</p>
                <p className="text-th-muted text-[10px] leading-tight">{f.desc}</p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
