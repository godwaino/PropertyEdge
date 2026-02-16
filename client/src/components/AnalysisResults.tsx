import { AnalysisResult, AnalysisItem, PropertyInput } from '../types/property';

interface Props {
  result: AnalysisResult;
  property: PropertyInput;
}

function formatCurrency(n: number): string {
  return '£' + Math.abs(n).toLocaleString();
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    GOOD_DEAL: { bg: 'bg-cyan/10 border-cyan/30', text: 'text-cyan', label: 'Good Deal' },
    FAIR: { bg: 'bg-gold/10 border-gold/30', text: 'text-gold', label: 'Fair Price' },
    OVERPRICED: { bg: 'bg-pe-red/10 border-pe-red/30', text: 'text-pe-red', label: 'Overpriced' },
  };
  const s = styles[verdict] || styles.FAIR;

  return (
    <span className={`inline-block px-4 py-1.5 rounded-full border text-sm font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function Section({
  title,
  items,
  color,
}: {
  title: string;
  items: AnalysisItem[];
  color: 'red' | 'gold' | 'cyan';
}) {
  const colorMap = {
    red: { border: 'border-pe-red/20', badge: 'bg-pe-red/10 text-pe-red', dot: 'bg-pe-red' },
    gold: { border: 'border-gold/20', badge: 'bg-gold/10 text-gold', dot: 'bg-gold' },
    cyan: { border: 'border-cyan/20', badge: 'bg-cyan/10 text-cyan', dot: 'bg-cyan' },
  };
  const c = colorMap[color];

  return (
    <div>
      <h3 className="text-white font-semibold mb-3">{title}</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className={`bg-navy-light border ${c.border} rounded-xl p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <div className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 flex-shrink-0`} />
                <div>
                  <p className="text-white font-medium text-sm">{item.title}</p>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-md ${c.badge} whitespace-nowrap`}>
                {formatCurrency(item.impact)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalysisResults({ result, property }: Props) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-slide-up">
      {/* Summary card */}
      <div className="bg-navy-card border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-gray-400 text-xs uppercase tracking-wider">AI Valuation</p>
            <p className="text-3xl font-bold text-white mt-1">
              {formatCurrency(result.valuation.amount)}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Asking: {formatCurrency(property.askingPrice)}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <VerdictBadge verdict={result.verdict} />
            {result.savings > 0 && (
              <p className="text-cyan text-sm">
                Save {formatCurrency(result.savings)}
              </p>
            )}
            {result.savings < 0 && (
              <p className="text-pe-red text-sm">
                {formatCurrency(result.savings)} over valuation
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detail sections */}
      <div className="space-y-6">
        {result.red_flags.length > 0 && (
          <Section title="Red Flags" items={result.red_flags} color="red" />
        )}
        {result.warnings.length > 0 && (
          <Section title="Warnings" items={result.warnings} color="gold" />
        )}
        {result.positives.length > 0 && (
          <Section title="Positives" items={result.positives} color="cyan" />
        )}
      </div>
    </div>
  );
}
