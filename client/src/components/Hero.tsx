import { useState } from 'react';
import { PropertyInput } from '../types/property';
import { FEATURED } from './FeaturedProperties';

interface Props {
  onAnalyseClick: () => void;
  onExtractListing: (text: string) => void;
  onTryExample: (property: PropertyInput) => void;
  visible: boolean;
  isExtracting: boolean;
  selectedPersona: string | null;
  onPersonaSelect: (persona: string) => void;
}

const audiences: { label: string; hint: string }[] = [
  { label: 'First-Time Buyer', hint: 'Highlights stamp duty savings, Help to Buy eligibility and hidden costs.' },
  { label: 'Property Investor', hint: 'Adds yield estimate, rent assumptions and downside risk.' },
  { label: 'Home Mover', hint: 'Focuses on value vs your current area and chain-free leverage.' },
];

const features = [
  {
    label: 'AI Valuation + Comps',
    desc: 'Real sold prices, local comps and AI analysis',
    anchor: 'section-comps',
  },
  {
    label: 'Risk & Red Flags',
    desc: 'Issues that cost money, with estimated £ impact',
    anchor: 'section-risks',
  },
  {
    label: 'Negotiation Points',
    desc: 'Suggested offer range + walk-away price',
    anchor: 'section-negotiation',
  },
  {
    label: 'Deal Verdict',
    desc: 'Instant GOOD DEAL / FAIR / OVERPRICED rating',
    anchor: 'section-verdict',
  },
];

// Pick 3 diverse examples for the quick-try row
const EXAMPLES = FEATURED.filter((_, i) => i === 0 || i === 1 || i === 2);

export default function Hero({ onAnalyseClick, onExtractListing, onTryExample, visible, isExtracting, selectedPersona, onPersonaSelect }: Props) {
  const [pasteText, setPasteText] = useState('');

  if (!visible) return null;

  const handlePasteAnalyse = () => {
    if (pasteText.trim()) {
      onExtractListing(pasteText.trim());
    } else {
      onAnalyseClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePasteAnalyse();
    }
  };

  const activeHint = audiences.find((a) => a.label === selectedPersona)?.hint;

  return (
    <section className="max-w-4xl mx-auto px-4 pt-2 pb-8 text-center animate-slide-up">
      {/* Headline */}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
        Is this property{' '}
        <span className="text-cyan">worth it</span>?
      </h2>

      {/* 1-line promise */}
      <p className="mt-3 text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
        Get valuation, risks and negotiation points. Typically under 10 seconds.
      </p>

      {/* Primary entry: paste box */}
      <div className="mt-6 max-w-2xl mx-auto">
        <div className="flex gap-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste a Rightmove / Zoopla link or listing text..."
            rows={2}
            className="flex-1 bg-navy-light border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan transition-colors resize-none"
          />
          <button
            onClick={handlePasteAnalyse}
            disabled={isExtracting}
            className="px-6 py-3 rounded-xl font-semibold text-navy bg-cyan hover:bg-cyan/90 disabled:opacity-50 transition-all text-sm whitespace-nowrap shadow-lg shadow-cyan/20 self-end"
          >
            {isExtracting ? 'Extracting...' : 'Analyse'}
          </button>
        </div>
        <p className="mt-2 text-gray-600 text-xs">
          We&apos;ll auto-fill the details for you. Or <button onClick={onAnalyseClick} className="text-cyan/70 hover:text-cyan underline-offset-2 underline">fill in details manually</button>
        </p>

        {/* Try an example */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-gray-600 text-[11px]">Try an example:</span>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => onTryExample(ex.property)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-gray-700 text-gray-400 hover:text-cyan hover:border-cyan/50 bg-navy-light/40 transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audience pills */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {audiences.map((a) => (
          <button
            key={a.label}
            onClick={() => onPersonaSelect(selectedPersona === a.label ? '' : a.label)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              selectedPersona === a.label
                ? 'border-cyan bg-cyan/15 text-cyan'
                : 'border-gray-700 text-gray-300 bg-navy-light/50 hover:border-gray-500'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {activeHint && (
        <p className="mt-2 text-cyan/70 text-xs animate-slide-up">{activeHint}</p>
      )}

      {/* Feature grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
        {features.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => document.getElementById(f.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="bg-navy-card/60 border border-gray-800 rounded-xl px-3 py-3 text-center hover:border-gray-600 transition-colors"
          >
            <p className="text-white text-xs font-semibold">{f.label}</p>
            <p className="text-gray-500 text-[11px] mt-1 leading-snug">{f.desc}</p>
          </button>
        ))}
      </div>

      {/* Data sources strip */}
      <div className="mt-6 max-w-3xl mx-auto">
        <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-2">Data sources</p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { name: 'HM Land Registry', desc: 'Sold prices & HPI' },
            { name: 'EPC Register', desc: 'Energy & floor area' },
            { name: 'Police UK', desc: 'Crime data' },
            { name: 'Environment Agency', desc: 'Flood risk' },
            { name: 'PlanIt', desc: 'Planning apps' },
            { name: 'postcodes.io', desc: 'Geolocation' },
            { name: 'AI Analysis', desc: 'Valuation model' },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 bg-navy-card/40 border border-gray-800 rounded-lg px-2.5 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan/60 flex-shrink-0" />
              <div className="text-left">
                <p className="text-gray-300 text-[10px] font-medium leading-tight">{s.name}</p>
                <p className="text-gray-600 text-[9px] leading-tight">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust cues */}
      <div className="mt-3 flex flex-wrap justify-center gap-4 text-[11px] text-gray-500">
        <span>No account needed</span>
        <span>&middot;</span>
        <span>Searches not stored</span>
      </div>
    </section>
  );
}
