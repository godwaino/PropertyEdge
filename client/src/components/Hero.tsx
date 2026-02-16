import { useState } from 'react';

interface Props {
  onAnalyseClick: () => void;
  onExtractListing: (text: string) => void;
  visible: boolean;
  isExtracting: boolean;
}

const audiences = [
  'First-Time Buyer',
  'Property Investor',
  'Home Mover',
  'Content Creator',
];

const features = [
  {
    label: 'AI Valuation + Comps',
    desc: 'Backed by real HM Land Registry sold prices',
  },
  {
    label: 'Risk & Red Flags',
    desc: 'Issues that cost money, with estimated £ impact',
  },
  {
    label: 'Negotiation Points',
    desc: 'Suggested offer range + walk-away price',
  },
  {
    label: 'Deal Verdict',
    desc: 'Instant GOOD DEAL / FAIR / OVERPRICED rating',
  },
];

export default function Hero({ onAnalyseClick, onExtractListing, visible, isExtracting }: Props) {
  const [pasteText, setPasteText] = useState('');

  if (!visible) return null;

  const handlePasteAnalyse = () => {
    if (pasteText.trim()) {
      onExtractListing(pasteText.trim());
    } else {
      onAnalyseClick();
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-4 pt-2 pb-8 text-center animate-slide-up">
      {/* Headline */}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
        Is this property{' '}
        <span className="text-cyan">worth it</span>?
      </h2>

      {/* 1-line promise */}
      <p className="mt-3 text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
        Get valuation, risks and negotiation points in under 10 seconds.
      </p>

      {/* Primary entry: paste box */}
      <div className="mt-6 max-w-2xl mx-auto">
        <div className="flex gap-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste Rightmove / Zoopla listing text to auto-fill..."
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
          Or <button onClick={onAnalyseClick} className="text-cyan/70 hover:text-cyan underline-offset-2 underline">fill in details manually</button> &mdash; example pre-filled, no sign-up needed
        </p>
      </div>

      {/* Audience pills */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {audiences.map((a) => (
          <span
            key={a}
            className="px-3 py-1 rounded-full text-xs font-medium border border-gray-700 text-gray-300 bg-navy-light/50"
          >
            {a}
          </span>
        ))}
      </div>

      {/* Feature grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
        {features.map((f) => (
          <div
            key={f.label}
            className="bg-navy-card/60 border border-gray-800 rounded-xl px-3 py-3 text-center"
          >
            <p className="text-white text-xs font-semibold">{f.label}</p>
            <p className="text-gray-500 text-[11px] mt-1 leading-snug">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Trust cues */}
      <div className="mt-5 flex flex-wrap justify-center gap-4 text-[11px] text-gray-500">
        <span>Uses HM Land Registry sold prices</span>
        <span>&middot;</span>
        <span>No account needed</span>
        <span>&middot;</span>
        <span>Searches not stored</span>
      </div>
    </section>
  );
}
