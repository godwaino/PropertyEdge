interface Props {
  onAnalyseClick: () => void;
  visible: boolean;
}

const audiences = [
  'First-Time Buyer',
  'Property Investor',
  'Home Mover',
  'Content Creator',
];

const features = [
  {
    label: 'Land Registry Comparables',
    desc: 'Valuation backed by real HM Land Registry sold prices',
  },
  {
    label: 'Risk & Opportunity Flags',
    desc: 'Red flags, warnings and positives with estimated £ impact',
  },
  {
    label: 'Instant Verdict',
    desc: 'Clear GOOD DEAL / FAIR / OVERPRICED rating in seconds',
  },
  {
    label: 'Shareable Report',
    desc: 'PDF export to share with your solicitor or mortgage broker',
    soon: true,
  },
];

export default function Hero({ onAnalyseClick, visible }: Props) {
  if (!visible) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 pt-2 pb-10 text-center animate-slide-up">
      {/* Headline */}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
        Is this property{' '}
        <span className="text-cyan">worth it</span>?
      </h2>

      {/* One-liner */}
      <p className="mt-4 text-gray-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
        Paste a Rightmove or Zoopla listing &rarr; get an instant fairness
        check with Land Registry comps, yield analysis, and risk flags.
      </p>

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
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
        {features.map((f) => (
          <div
            key={f.label}
            className="flex items-start gap-2.5 bg-navy-card/60 border border-gray-800 rounded-xl px-4 py-3"
          >
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium">
                {f.label}
                {f.soon && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20 align-middle">
                    SOON
                  </span>
                )}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Primary CTA */}
      <button
        onClick={onAnalyseClick}
        className="mt-8 px-8 py-3.5 rounded-xl font-semibold text-navy bg-cyan hover:bg-cyan/90 transition-all text-base shadow-lg shadow-cyan/20"
      >
        Analyse a Listing
      </button>
      <p className="mt-2 text-gray-600 text-xs">
        Example pre-filled &mdash; try it instantly, no sign-up needed
      </p>
    </section>
  );
}
