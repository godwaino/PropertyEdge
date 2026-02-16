import { useState } from 'react';
import { AnalysisResult, AnalysisItem, PropertyInput } from '../types/property';

interface Props {
  result: AnalysisResult;
  property: PropertyInput;
}

function fmt(n: number): string {
  return '\u00A3' + Math.abs(n).toLocaleString();
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

function ConfidenceLabel({ confidence }: { confidence: number }) {
  let level: string;
  let color: string;
  if (confidence <= 8) { level = 'High'; color = 'text-cyan'; }
  else if (confidence <= 14) { level = 'Medium'; color = 'text-gold'; }
  else { level = 'Low'; color = 'text-pe-red'; }
  return <span className={`text-xs font-medium ${color}`}>{level} confidence (\u00B1{confidence}%)</span>;
}

function CollapsibleSection({
  title,
  items,
  color,
  defaultOpen = false,
}: {
  title: string;
  items: AnalysisItem[];
  color: 'red' | 'gold' | 'cyan';
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const colorMap = {
    red: { border: 'border-pe-red/20', badge: 'bg-pe-red/10 text-pe-red', dot: 'bg-pe-red', header: 'text-pe-red' },
    gold: { border: 'border-gold/20', badge: 'bg-gold/10 text-gold', dot: 'bg-gold', header: 'text-gold' },
    cyan: { border: 'border-cyan/20', badge: 'bg-cyan/10 text-cyan', dot: 'bg-cyan', header: 'text-cyan' },
  };
  const c = colorMap[color];
  const totalImpact = items.reduce((sum, i) => sum + i.impact, 0);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 group"
      >
        <div className="flex items-center gap-2">
          <span className={`inline-block transition-transform text-xs text-gray-500 ${open ? 'rotate-90' : ''}`}>&#9654;</span>
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <span className="text-gray-500 text-xs">({items.length})</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${c.badge}`}>
          {fmt(totalImpact)} est. impact
        </span>
      </button>

      {open && (
        <div className="space-y-2 mt-1 mb-4">
          {items.map((item, i) => (
            <div key={i} className={`bg-navy-light border ${c.border} rounded-xl p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${c.dot} mt-1.5 flex-shrink-0`} />
                  <div>
                    <p className="text-white font-medium text-sm">{item.title}</p>
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md ${c.badge} whitespace-nowrap`}>
                  {fmt(item.impact)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalysisResults({ result, property }: Props) {
  const [showComps, setShowComps] = useState(false);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-slide-up space-y-4">

      {/* Summary sentence */}
      {result.summary && (
        <div className="bg-navy-card border border-gray-800 rounded-2xl px-6 py-4">
          <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
        </div>
      )}

      {/* 3-block top summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Block 1: Valuation */}
        <div className="bg-navy-card border border-gray-800 rounded-2xl p-5 text-center">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">AI Valuation</p>
          <p className="text-2xl font-bold text-white">{fmt(result.valuation.amount)}</p>
          <p className="text-gray-500 text-xs mt-1">Asking: {fmt(property.askingPrice)}</p>
          <div className="mt-2">
            <ConfidenceLabel confidence={result.valuation.confidence} />
          </div>
          {result.comparables_used !== undefined && result.comparables_used > 0 && (
            <p className="text-cyan/60 text-[11px] mt-1">{result.comparables_used} comps used</p>
          )}
        </div>

        {/* Block 2: Verdict */}
        <div className="bg-navy-card border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center">
          <VerdictBadge verdict={result.verdict} />
          {result.savings > 0 && (
            <p className="text-cyan text-sm mt-2">Save {fmt(result.savings)}</p>
          )}
          {result.savings < 0 && (
            <p className="text-pe-red text-sm mt-2">{fmt(result.savings)} over valuation</p>
          )}
          {result.savings === 0 && (
            <p className="text-gray-400 text-sm mt-2">At valuation</p>
          )}
        </div>

        {/* Block 3: Quick risk/positive summary */}
        <div className="bg-navy-card border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">At a Glance</p>
          <div className="space-y-1.5 text-xs">
            {result.red_flags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pe-red flex-shrink-0" />
                <span className="text-gray-300">{result.red_flags.length} red flag{result.red_flags.length > 1 ? 's' : ''}</span>
                <span className="text-pe-red ml-auto">{fmt(result.red_flags.reduce((s, i) => s + i.impact, 0))}</span>
              </div>
            )}
            {result.warnings.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                <span className="text-gray-300">{result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}</span>
                <span className="text-gold ml-auto">{fmt(result.warnings.reduce((s, i) => s + i.impact, 0))}</span>
              </div>
            )}
            {result.positives.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan flex-shrink-0" />
                <span className="text-gray-300">{result.positives.length} positive{result.positives.length > 1 ? 's' : ''}</span>
                <span className="text-cyan ml-auto">{fmt(result.positives.reduce((s, i) => s + i.impact, 0))}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Negotiation box */}
      {result.negotiation && (
        <div className="bg-navy-card border border-cyan/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">Negotiation Strategy</h3>
            <button
              onClick={() => {
                const text = `Suggested offer: ${fmt(result.negotiation!.offer_low)} - ${fmt(result.negotiation!.offer_high)}\nWalk away above: ${fmt(result.negotiation!.walk_away)}\n\n${result.negotiation!.reasoning}`;
                navigator.clipboard.writeText(text);
              }}
              className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-cyan hover:border-cyan/50 transition-colors"
            >
              Copy points
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <p className="text-gray-500 text-[11px] uppercase">Open at</p>
              <p className="text-cyan font-bold text-lg">{fmt(result.negotiation.offer_low)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-[11px] uppercase">Aim for</p>
              <p className="text-white font-bold text-lg">{fmt(result.negotiation.offer_high)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-[11px] uppercase">Walk away</p>
              <p className="text-pe-red font-bold text-lg">{fmt(result.negotiation.walk_away)}</p>
            </div>
          </div>

          <p className="text-gray-400 text-xs leading-relaxed">{result.negotiation.reasoning}</p>
        </div>
      )}

      {/* Comparables table */}
      {result.comparables && result.comparables.length > 0 && (
        <div className="bg-navy-card border border-gray-800 rounded-2xl p-5">
          <button
            onClick={() => setShowComps(!showComps)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block transition-transform text-xs text-gray-500 ${showComps ? 'rotate-90' : ''}`}>&#9654;</span>
              <h3 className="text-white font-semibold text-sm">Land Registry Comparables</h3>
              <span className="text-gray-500 text-xs">({result.comparables.length} sales)</span>
            </div>
          </button>

          {showComps && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <th className="text-left py-2 pr-4">Price</th>
                    <th className="text-left py-2 pr-4">Date</th>
                    <th className="text-left py-2 pr-4">Address</th>
                    <th className="text-left py-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {result.comparables.map((c, i) => (
                    <tr key={i} className="border-b border-gray-800/50 text-gray-300">
                      <td className="py-2 pr-4 font-medium text-white">{fmt(c.price)}</td>
                      <td className="py-2 pr-4">{c.date}</td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">{c.address}</td>
                      <td className="py-2 capitalize">{c.propertyType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Valuation basis */}
      {result.valuation.basis && (
        <div className="px-2">
          <p className="text-gray-600 text-[11px] leading-relaxed">{result.valuation.basis}</p>
        </div>
      )}

      {/* Collapsible detail sections */}
      <div className="bg-navy-card border border-gray-800 rounded-2xl p-5 space-y-1">
        {result.red_flags.length > 0 && (
          <CollapsibleSection title="Red Flags" items={result.red_flags} color="red" defaultOpen={true} />
        )}
        {result.warnings.length > 0 && (
          <CollapsibleSection title="Warnings" items={result.warnings} color="gold" />
        )}
        {result.positives.length > 0 && (
          <CollapsibleSection title="Positives" items={result.positives} color="cyan" />
        )}
      </div>
    </div>
  );
}
