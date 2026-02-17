import { useState, useMemo } from 'react';
import { AnalysisResult, AnalysisItem, PropertyInput, ComparableSale, AreaData, FloodRiskData, HousePriceIndexData, PlanningData } from '../types/property';

interface Props {
  result: AnalysisResult;
  property: PropertyInput;
}

function fmt(n: number): string {
  return '£' + Math.abs(n).toLocaleString();
}

function verdictLabel(v: string): string {
  if (v === 'GOOD_DEAL') return 'GOOD DEAL';
  if (v === 'OVERPRICED') return 'OVERPRICED';
  return 'FAIR';
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

function ConfidenceLabel({ confidence, drivers }: { confidence: number; drivers?: string[] }) {
  const [showDrivers, setShowDrivers] = useState(false);
  let level: string;
  let color: string;
  if (confidence <= 8) { level = 'High'; color = 'text-cyan'; }
  else if (confidence <= 14) { level = 'Medium'; color = 'text-gold'; }
  else { level = 'Low'; color = 'text-pe-red'; }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowDrivers(!showDrivers)}
        className={`text-xs font-medium ${color} underline underline-offset-2 decoration-dotted cursor-pointer hover:opacity-80 transition-opacity`}
      >
        {level} confidence (±{confidence}%)
      </button>
      {showDrivers && drivers && drivers.length > 0 && (
        <div className="absolute z-10 top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-th-card border border-th-border rounded-xl p-3 shadow-lg">
          <p className="text-th-secondary text-[10px] uppercase tracking-wider mb-1.5 font-medium">Why {level.toLowerCase()} confidence</p>
          <ul className="space-y-1">
            {drivers.map((d, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-th-body">
                <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${color === 'text-cyan' ? 'bg-cyan' : color === 'text-gold' ? 'bg-gold' : 'bg-pe-red'}`} />
                {d}
              </li>
            ))}
          </ul>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDrivers(false); }}
            className="text-th-muted text-[10px] mt-2 hover:text-th-body"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

// Critical keywords that should always be surfaced in the top 2
const CRITICAL_PATTERNS = /\b(lease|service charge|ground rent|flood|subsidence|cladding|EWS1|structural|asbestos|contamination|unmortgage|negative equity)\b/i;

function rankByMateriality(items: AnalysisItem[]): AnalysisItem[] {
  return [...items].sort((a, b) => {
    const aCritical = CRITICAL_PATTERNS.test(a.title) || CRITICAL_PATTERNS.test(a.description) ? 1 : 0;
    const bCritical = CRITICAL_PATTERNS.test(b.title) || CRITICAL_PATTERNS.test(b.description) ? 1 : 0;
    if (aCritical !== bCritical) return bCritical - aCritical;
    return b.impact - a.impact;
  });
}

function CollapsibleSection({
  title,
  items,
  color,
}: {
  title: string;
  items: AnalysisItem[];
  color: 'red' | 'gold' | 'cyan';
}) {
  const [expanded, setExpanded] = useState(false);
  const colorMap = {
    red: { border: 'border-pe-red/20', badge: 'bg-pe-red/10 text-pe-red', dot: 'bg-pe-red', header: 'text-pe-red' },
    gold: { border: 'border-gold/20', badge: 'bg-gold/10 text-gold', dot: 'bg-gold', header: 'text-gold' },
    cyan: { border: 'border-cyan/20', badge: 'bg-cyan/10 text-cyan', dot: 'bg-cyan', header: 'text-cyan' },
  };
  const c = colorMap[color];
  const totalImpact = items.reduce((sum, i) => sum + i.impact, 0);
  const ranked = useMemo(() => rankByMateriality(items), [items]);
  const preview = ranked.slice(0, 2);
  const hasMore = ranked.length > 2;
  const visible = expanded ? ranked : preview;

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
          <h3 className="text-th-heading font-semibold text-sm">{title}</h3>
          <span className="text-th-muted text-xs">({items.length})</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${c.badge}`}>
          {fmt(totalImpact)} est. impact
        </span>
      </div>

      <div className="space-y-2 mt-1 mb-2">
        {visible.map((item, i) => (
          <div key={i} className={`bg-th-input border ${c.border} rounded-xl p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <div className={`w-1.5 h-1.5 rounded-full ${c.dot} mt-1.5 flex-shrink-0`} />
                <div>
                  <p className="text-th-heading font-medium text-sm">{item.title}</p>
                  <p className="text-th-secondary text-xs mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-md ${c.badge} whitespace-nowrap`}>
                {fmt(item.impact)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`text-xs ${c.badge} px-3 py-1 rounded-full transition-colors hover:opacity-80 mb-3`}
        >
          {expanded ? 'Show less' : `View all (${ranked.length})`}
        </button>
      )}
    </div>
  );
}

type CompSort = 'similarity' | 'newest' | 'nearest' | 'price';

function CompsTable({ comparables }: { comparables: ComparableSale[] }) {
  const [sort, setSort] = useState<CompSort>('similarity');

  const sorted = useMemo(() => {
    const included = comparables.filter(c => !c.excluded);
    const excluded = comparables.filter(c => c.excluded);

    const sortFns: Record<CompSort, (a: ComparableSale, b: ComparableSale) => number> = {
      similarity: (a, b) => (b.similarity || 0) - (a.similarity || 0),
      newest: (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      nearest: (a, b) => (a.distance || 99) - (b.distance || 99),
      price: (a, b) => a.price - b.price,
    };

    included.sort(sortFns[sort]);
    return [...included, ...excluded];
  }, [comparables, sort]);

  const chips: { key: CompSort; label: string }[] = [
    { key: 'similarity', label: 'Most similar' },
    { key: 'newest', label: 'Newest' },
    { key: 'nearest', label: 'Nearest' },
    { key: 'price', label: 'Price' },
  ];

  return (
    <div className="mt-3">
      <div className="flex gap-2 mb-3 flex-wrap">
        {chips.map(chip => (
          <button
            key={chip.key}
            onClick={() => setSort(chip.key)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              sort === chip.key
                ? 'border-cyan/50 text-cyan bg-cyan/10'
                : 'border-th-border text-th-secondary hover:text-th-body hover:border-th-muted'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-th-muted uppercase tracking-wider border-b border-th-border">
              <th className="text-left py-2 pr-3">Price</th>
              <th className="text-left py-2 pr-3">Date</th>
              <th className="text-left py-2 pr-3">Address</th>
              <th className="text-left py-2 pr-3">Type</th>
              <th className="text-center py-2 pr-3">EPC</th>
              <th className="text-center py-2 pr-3">£/sqm</th>
              <th className="text-center py-2 pr-3">Dist.</th>
              <th className="text-center py-2 pr-3">Match</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr
                key={i}
                className={`border-b border-th-border/50 ${
                  c.excluded ? 'opacity-50' : 'text-th-body'
                }`}
              >
                <td className={`py-2 pr-3 font-medium ${c.excluded ? 'text-th-muted line-through' : 'text-th-heading'}`}>
                  {fmt(c.price)}
                </td>
                <td className="py-2 pr-3">{new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="py-2 pr-3 max-w-[180px] truncate">{c.address}</td>
                <td className="py-2 pr-3 capitalize">{c.propertyType}</td>
                <td className="py-2 pr-3 text-center">
                  {c.epcRating ? (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      'AB'.includes(c.epcRating) ? 'bg-cyan/10 text-cyan' :
                      'CD'.includes(c.epcRating) ? 'bg-gold/10 text-gold' :
                      'bg-pe-red/10 text-pe-red'
                    }`}>{c.epcRating}</span>
                  ) : '—'}
                </td>
                <td className="py-2 pr-3 text-center text-th-secondary">
                  {c.pricePsm ? `£${c.pricePsm.toLocaleString()}` : '—'}
                </td>
                <td className="py-2 pr-3 text-center">
                  {c.distance !== undefined ? `${c.distance}mi` : '—'}
                </td>
                <td className="py-2 pr-3 text-center">
                  {!c.excluded && c.similarity !== undefined ? (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      c.similarity >= 70 ? 'bg-cyan/10 text-cyan' :
                      c.similarity >= 40 ? 'bg-gold/10 text-gold' :
                      'bg-th-skeleton text-th-secondary'
                    }`}>
                      {c.similarity}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-2">
                  {c.excluded ? (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-pe-red/10 text-pe-red whitespace-nowrap" title={c.excludeReason}>
                      Excluded
                    </span>
                  ) : (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan/10 text-cyan">
                      Included
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.some(c => c.excluded) && (
          <div className="mt-2 space-y-1">
            {sorted.filter(c => c.excluded).map((c, i) => (
              <p key={i} className="text-[10px] text-th-muted flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-pe-red/50 flex-shrink-0" />
                {c.address}: {c.excludeReason}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function buildAgentQuestions(property: PropertyInput, result: AnalysisResult): string[] {
  const questions: string[] = [];
  if (property.tenure === 'leasehold') {
    questions.push('Can you confirm the exact lease length remaining?');
    if ((property.serviceCharge || 0) > 0) questions.push('Has the service charge increased in the last 3 years?');
    if ((property.groundRent || 0) > 0) questions.push('Is the ground rent fixed or does it escalate?');
  }
  if (property.propertyType === 'flat') {
    questions.push('Is there a sinking fund, and what is the current balance?');
  }
  if ((property.yearBuilt || 0) >= 2015) {
    questions.push('Is the property covered by an NHBC or similar new-build warranty?');
  }
  questions.push('How long has the property been on the market?');
  questions.push('Have there been any price reductions?');
  if (result.red_flags.length > 0) {
    questions.push('Are you aware of any issues that may affect valuation or resale?');
  }
  return questions;
}

function buildEmailDraft(property: PropertyInput, result: AnalysisResult): string {
  const neg = result.negotiation;
  let body = `Dear Agent,\n\nI am interested in the property at ${property.address}, ${property.postcode} (asking ${fmt(property.askingPrice)}).\n\n`;

  body += `My research suggests a fair value of approximately ${fmt(result.valuation.amount)}, which is ${
    result.verdict === 'OVERPRICED' ? 'below the current asking price' :
    result.verdict === 'GOOD_DEAL' ? 'above the current asking price' :
    'broadly in line with the asking price'
  }.\n\n`;

  if (neg) {
    body += `I would like to make an initial offer of ${fmt(neg.offer_low)}, with a view to agreeing around ${fmt(neg.offer_high)}.\n\n`;
    body += `My reasoning:\n${neg.reasoning}\n\n`;

    if (neg.negotiation_points && neg.negotiation_points.length > 0) {
      body += `Key observations:\n`;
      neg.negotiation_points.forEach((p, i) => { body += `${i + 1}. ${p}\n`; });
      body += '\n';
    }
  }

  body += `I would appreciate answers to the following questions:\n`;
  const qs = buildAgentQuestions(property, result);
  qs.forEach((q, i) => { body += `${i + 1}. ${q}\n`; });
  body += `\nI look forward to hearing from you.\n\nKind regards`;
  return body;
}

export default function AnalysisResults({ result, property }: Props) {
  const [showComps, setShowComps] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [copiedBtn, setCopiedBtn] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBtn(id);
    setTimeout(() => setCopiedBtn(null), 2000);
  };

  const agentQuestions = buildAgentQuestions(property, result);
  const neg = result.negotiation;

  const savingsAbs = Math.abs(result.savings);
  const verdictOneLiner = result.verdict === 'GOOD_DEAL'
    ? `Overall: ${verdictLabel(result.verdict)} at ${fmt(property.askingPrice)} — ${fmt(savingsAbs)} below our valuation of ${fmt(result.valuation.amount)}.`
    : result.verdict === 'OVERPRICED'
    ? `Overall: ${verdictLabel(result.verdict)} at ${fmt(property.askingPrice)} — ${fmt(savingsAbs)} above our valuation of ${fmt(result.valuation.amount)}.`
    : `Overall: ${verdictLabel(result.verdict)} at ${fmt(property.askingPrice)} — close to our valuation of ${fmt(result.valuation.amount)}.`;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-slide-up space-y-4">

      {/* One-liner verdict */}
      <div id="section-verdict" className="bg-th-card border border-th-border rounded-2xl px-6 py-4">
        <p className="text-th-heading text-sm font-medium leading-relaxed">{verdictOneLiner}</p>
        {result.summary && (
          <p className="text-th-secondary text-xs mt-2 leading-relaxed">{result.summary}</p>
        )}
      </div>

      {/* 3-block top summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div id="section-comps" className="bg-th-card border border-th-border rounded-2xl p-5 text-center">
          <p className="text-th-secondary text-xs uppercase tracking-wider mb-1">AI Valuation</p>
          <p className="text-2xl font-bold text-th-heading">{fmt(result.valuation.amount)}</p>
          <p className="text-th-muted text-xs mt-1">Asking: {fmt(property.askingPrice)}</p>
          <div className="mt-2">
            <ConfidenceLabel
              confidence={result.valuation.confidence}
              drivers={result.valuation.confidence_drivers}
            />
          </div>
          {result.comparables_used !== undefined && result.comparables_used > 0 && (
            <button
              onClick={() => {
                setShowComps(true);
                setTimeout(() => document.getElementById('comps-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}
              className="text-cyan/60 hover:text-cyan text-[11px] mt-1 underline underline-offset-2 transition-colors"
            >
              {result.comparables_used} comparable sales used
            </button>
          )}
        </div>

        <div className="bg-th-card border border-th-border rounded-2xl p-5 flex flex-col items-center justify-center">
          <VerdictBadge verdict={result.verdict} />
          {result.savings > 0 && (
            <p className="text-pe-red text-sm mt-2">Overpay risk: {fmt(result.savings)}</p>
          )}
          {result.savings < 0 && (
            <p className="text-cyan text-sm mt-2">Negotiation headroom: ~{fmt(savingsAbs)}</p>
          )}
          {result.savings === 0 && (
            <p className="text-th-secondary text-sm mt-2">At valuation</p>
          )}
        </div>

        <div className="bg-th-card border border-th-border rounded-2xl p-5">
          <p className="text-th-secondary text-xs uppercase tracking-wider mb-2">At a Glance</p>
          <div className="space-y-1.5 text-xs">
            {result.red_flags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pe-red flex-shrink-0" />
                <span className="text-th-body">{result.red_flags.length} red flag{result.red_flags.length > 1 ? 's' : ''}</span>
                <span className="text-pe-red ml-auto">{fmt(result.red_flags.reduce((s, i) => s + i.impact, 0))}</span>
              </div>
            )}
            {result.warnings.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                <span className="text-th-body">{result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}</span>
                <span className="text-gold ml-auto">{fmt(result.warnings.reduce((s, i) => s + i.impact, 0))}</span>
              </div>
            )}
            {result.positives.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan flex-shrink-0" />
                <span className="text-th-body">{result.positives.length} positive{result.positives.length > 1 ? 's' : ''}</span>
                <span className="text-cyan ml-auto">{fmt(result.positives.reduce((s, i) => s + i.impact, 0))}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Negotiation Playbook */}
      {neg && (
        <div id="section-negotiation" className="bg-th-card border border-cyan/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-th-heading font-semibold text-sm">Negotiation Playbook</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const points = neg.negotiation_points?.map((p, i) => `${i + 1}. ${p}`).join('\n') || '';
                  const text = `Suggested offer: ${fmt(neg.offer_low)} - ${fmt(neg.offer_high)}\nWalk away above: ${fmt(neg.walk_away)}\n\n${neg.reasoning}\n\n${points ? `Key talking points:\n${points}\n\n` : ''}Agent questions:\n${agentQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
                  copyText(text, 'summary');
                }}
                className="text-[11px] px-2 py-1 rounded border border-th-border text-th-secondary hover:text-cyan hover:border-cyan/50 transition-colors"
              >
                {copiedBtn === 'summary' ? 'Copied!' : 'Copy summary'}
              </button>
              <button
                onClick={() => {
                  const email = buildEmailDraft(property, result);
                  copyText(email, 'email');
                }}
                className="text-[11px] px-2 py-1 rounded border border-th-border text-th-secondary hover:text-cyan hover:border-cyan/50 transition-colors"
              >
                {copiedBtn === 'email' ? 'Copied!' : 'Copy email to agent'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-th-muted text-[11px] uppercase">Open at</p>
              <p className="text-cyan font-bold text-lg">{fmt(neg.offer_low)}</p>
            </div>
            <div className="text-center">
              <p className="text-th-muted text-[11px] uppercase">Aim for</p>
              <p className="text-th-heading font-bold text-lg">{fmt(neg.offer_high)}</p>
            </div>
            <div className="text-center">
              <p className="text-th-muted text-[11px] uppercase">Walk away</p>
              <p className="text-pe-red font-bold text-lg">{fmt(neg.walk_away)}</p>
            </div>
          </div>

          <p className="text-th-secondary text-xs leading-relaxed mb-4">{neg.reasoning}</p>

          {neg.negotiation_points && neg.negotiation_points.length > 0 && (
            <div className="border-t border-th-border pt-3 mb-4">
              <p className="text-th-secondary text-xs uppercase tracking-wider mb-2 font-medium">Key talking points</p>
              <div className="space-y-2">
                {neg.negotiation_points.map((point, i) => (
                  <div key={i} className="flex items-start gap-2 bg-th-input/50 border border-cyan/10 rounded-lg p-2.5">
                    <span className="text-cyan font-bold text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                    <span className="text-th-body text-xs leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-th-border pt-3">
            <p className="text-th-secondary text-xs uppercase tracking-wider mb-2 font-medium">Questions to ask the agent</p>
            <div className="space-y-1.5">
              {agentQuestions.map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-cyan/50 text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-th-body text-xs leading-relaxed">{q}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comparables table */}
      {result.comparables && result.comparables.length > 0 && (
        <div id="comps-table" className="bg-th-card border border-th-border rounded-2xl p-5">
          <button
            onClick={() => setShowComps(!showComps)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block transition-transform text-xs text-th-muted ${showComps ? 'rotate-90' : ''}`}>&#9654;</span>
              <h3 className="text-th-heading font-semibold text-sm">Comparable Sales</h3>
              <span className="text-th-muted text-xs">
                ({result.comparables.filter(c => !c.excluded).length} included
                {result.comparables.some(c => c.excluded) && (
                  <>, {result.comparables.filter(c => c.excluded).length} excluded</>
                )})
              </span>
            </div>
          </button>

          {showComps && <CompsTable comparables={result.comparables} />}
        </div>
      )}

      {/* Area data */}
      {result.area_data && (result.area_data.epcSummary || result.area_data.crimeRate || result.area_data.floodRisk || result.area_data.housePriceIndex || result.area_data.planning || result.area_data.deprivation) && (
        <div className="bg-th-card border border-th-border rounded-2xl p-5">
          <h3 className="text-th-heading font-semibold text-sm mb-3">Area Intelligence</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.area_data.epcSummary && (
              <div className="bg-th-input/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                  <p className="text-th-secondary text-[10px] uppercase tracking-wider font-medium">EPC Register</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-th-heading text-sm font-bold">{result.area_data.epcSummary.averageRating}</p>
                    <p className="text-th-muted text-[10px]">Avg rating</p>
                  </div>
                  <div>
                    <p className="text-th-heading text-sm font-bold">{result.area_data.epcSummary.averageFloorArea}sqm</p>
                    <p className="text-th-muted text-[10px]">Avg floor area</p>
                  </div>
                  <div>
                    <p className="text-th-heading text-sm font-bold">{result.area_data.epcSummary.totalCerts}</p>
                    <p className="text-th-muted text-[10px]">Certificates</p>
                  </div>
                </div>
                {(result.area_data.epcSummary.commonHeating || result.area_data.epcSummary.averageEnergyCost || result.area_data.epcSummary.commonPropertyType) && (
                  <div className="mt-2 pt-2 border-t border-th-border grid grid-cols-3 gap-2 text-center">
                    {result.area_data.epcSummary.commonPropertyType && (
                      <div>
                        <p className="text-th-heading text-[11px] font-semibold">{result.area_data.epcSummary.commonPropertyType}</p>
                        <p className="text-th-faint text-[9px]">Common type</p>
                      </div>
                    )}
                    {result.area_data.epcSummary.commonHeating && (
                      <div>
                        <p className="text-th-heading text-[11px] font-semibold capitalize">{result.area_data.epcSummary.commonHeating}</p>
                        <p className="text-th-faint text-[9px]">Heating fuel</p>
                      </div>
                    )}
                    {result.area_data.epcSummary.averageEnergyCost && (
                      <div>
                        <p className="text-th-heading text-[11px] font-semibold">£{result.area_data.epcSummary.averageEnergyCost.toLocaleString()}/yr</p>
                        <p className="text-th-faint text-[9px]">Avg energy cost</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {result.area_data.crimeRate && (
              <div className="bg-th-input/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    result.area_data.crimeRate.level === 'Low' ? 'bg-cyan' :
                    result.area_data.crimeRate.level === 'Average' ? 'bg-gold' : 'bg-pe-red'
                  }`} />
                  <p className="text-th-secondary text-[10px] uppercase tracking-wider font-medium">Police UK</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className={`text-sm font-bold ${
                      result.area_data.crimeRate.level === 'Low' ? 'text-cyan' :
                      result.area_data.crimeRate.level === 'Average' ? 'text-gold' : 'text-pe-red'
                    }`}>{result.area_data.crimeRate.level}</p>
                    <p className="text-th-muted text-[10px]">Crime level</p>
                  </div>
                  <div>
                    <p className="text-th-heading text-sm font-bold">{result.area_data.crimeRate.total}</p>
                    <p className="text-th-muted text-[10px]">Incidents/mo</p>
                  </div>
                  <div>
                    <p className="text-th-heading text-sm font-bold capitalize">{result.area_data.crimeRate.topCategory}</p>
                    <p className="text-th-muted text-[10px]">Top category</p>
                  </div>
                </div>
              </div>
            )}
            {result.area_data.deprivation && (
              <div className="bg-th-input/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    result.area_data.deprivation.imdDecile >= 8 ? 'bg-cyan' :
                    result.area_data.deprivation.imdDecile >= 4 ? 'bg-gold' : 'bg-pe-red'
                  }`} />
                  <p className="text-th-secondary text-[10px] uppercase tracking-wider font-medium">Deprivation Index</p>
                  <span className="text-th-faint text-[9px] ml-auto">IMD 2019</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className={`text-sm font-bold ${
                      result.area_data.deprivation.imdDecile >= 8 ? 'text-cyan' :
                      result.area_data.deprivation.imdDecile >= 4 ? 'text-gold' : 'text-pe-red'
                    }`}>Decile {result.area_data.deprivation.imdDecile}</p>
                    <p className="text-th-muted text-[10px]">{
                      result.area_data.deprivation.imdDecile >= 8 ? 'Least deprived' :
                      result.area_data.deprivation.imdDecile >= 4 ? 'Mid-range' : 'Most deprived'
                    }</p>
                  </div>
                  <div>
                    <p className="text-th-heading text-sm font-bold">{result.area_data.deprivation.imdRank.toLocaleString()}</p>
                    <p className="text-th-muted text-[10px]">of 32,844</p>
                  </div>
                  <div>
                    <p className="text-th-heading text-[11px] font-semibold truncate">{result.area_data.deprivation.lsoa}</p>
                    <p className="text-th-muted text-[10px]">LSOA</p>
                  </div>
                </div>
              </div>
            )}
            {result.area_data.floodRisk && (
              <div className="bg-th-input/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    result.area_data.floodRisk.riskLevel === 'Very Low' ? 'bg-cyan' :
                    result.area_data.floodRisk.riskLevel === 'Low' ? 'bg-cyan' :
                    result.area_data.floodRisk.riskLevel === 'Medium' ? 'bg-gold' : 'bg-pe-red'
                  }`} />
                  <p className="text-th-secondary text-[10px] uppercase tracking-wider font-medium">Environment Agency</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className={`text-sm font-bold ${
                      result.area_data.floodRisk.riskLevel === 'Very Low' || result.area_data.floodRisk.riskLevel === 'Low' ? 'text-cyan' :
                      result.area_data.floodRisk.riskLevel === 'Medium' ? 'text-gold' : 'text-pe-red'
                    }`}>{result.area_data.floodRisk.riskLevel}</p>
                    <p className="text-th-muted text-[10px]">Flood risk</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${
                      result.area_data.floodRisk.activeWarnings === 0 ? 'text-th-heading' : 'text-pe-red'
                    }`}>{result.area_data.floodRisk.activeWarnings}</p>
                    <p className="text-th-muted text-[10px]">Active warnings</p>
                  </div>
                  <div>
                    <p className="text-th-heading text-sm font-bold truncate" title={result.area_data.floodRisk.nearestStation}>
                      {result.area_data.floodRisk.nearestStation || 'None'}
                    </p>
                    <p className="text-th-muted text-[10px]">Nearest station</p>
                  </div>
                </div>
                <p className="text-th-muted text-[10px] mt-2 leading-relaxed">{result.area_data.floodRisk.description}</p>
              </div>
            )}
            {result.area_data.housePriceIndex && (() => {
              const hpi = result.area_data!.housePriceIndex!;
              const typeBreakdown = [
                hpi.averagePriceDetached && { label: 'Detached', price: hpi.averagePriceDetached },
                hpi.averagePriceSemiDetached && { label: 'Semi', price: hpi.averagePriceSemiDetached },
                hpi.averagePriceTerraced && { label: 'Terraced', price: hpi.averagePriceTerraced },
                hpi.averagePriceFlat && { label: 'Flat', price: hpi.averagePriceFlat },
              ].filter(Boolean) as { label: string; price: number }[];
              return (
              <div className="bg-th-input/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    hpi.annualChange > 2 ? 'bg-cyan' :
                    hpi.annualChange >= 0 ? 'bg-gold' : 'bg-pe-red'
                  }`} />
                  <p className="text-th-secondary text-[10px] uppercase tracking-wider font-medium">UK House Price Index</p>
                  <span className="text-th-faint text-[9px] ml-auto">{hpi.period}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-th-heading text-sm font-bold">£{hpi.averagePrice.toLocaleString()}</p>
                    <p className="text-th-muted text-[10px]">Avg price ({hpi.region})</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${
                      hpi.annualChange > 0 ? 'text-cyan' :
                      hpi.annualChange === 0 ? 'text-gold' : 'text-pe-red'
                    }`}>{hpi.annualChange > 0 ? '+' : ''}{hpi.annualChange}%</p>
                    <p className="text-th-muted text-[10px]">Annual change</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${
                      hpi.monthlyChange > 0 ? 'text-cyan' :
                      hpi.monthlyChange === 0 ? 'text-gold' : 'text-pe-red'
                    }`}>{hpi.monthlyChange > 0 ? '+' : ''}{hpi.monthlyChange}%</p>
                    <p className="text-th-muted text-[10px]">Monthly change</p>
                  </div>
                </div>
                {hpi.salesVolume && (
                  <p className="text-th-muted text-[10px] mt-2 text-center">{hpi.salesVolume.toLocaleString()} transactions recorded</p>
                )}
                {typeBreakdown.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-th-border">
                    <p className="text-th-muted text-[9px] uppercase tracking-wider mb-1">By property type</p>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      {typeBreakdown.map(t => (
                        <div key={t.label}>
                          <p className="text-th-heading text-[11px] font-semibold">£{Math.round(t.price / 1000)}k</p>
                          <p className="text-th-faint text-[9px]">{t.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(hpi.averagePriceFTB || hpi.averagePriceNewBuild || hpi.affordabilityRatio) && (
                  <div className="mt-2 pt-2 border-t border-th-border">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {hpi.averagePriceFTB && (
                        <div>
                          <p className="text-th-heading text-[11px] font-semibold">£{Math.round(hpi.averagePriceFTB / 1000)}k</p>
                          <p className="text-th-faint text-[9px]">FTB avg{hpi.annualChangeFTB != null ? ` (${hpi.annualChangeFTB > 0 ? '+' : ''}${hpi.annualChangeFTB}%)` : ''}</p>
                        </div>
                      )}
                      {hpi.averagePriceNewBuild && (
                        <div>
                          <p className="text-th-heading text-[11px] font-semibold">£{Math.round(hpi.averagePriceNewBuild / 1000)}k</p>
                          <p className="text-th-faint text-[9px]">New build</p>
                        </div>
                      )}
                      {hpi.affordabilityRatio && (
                        <div>
                          <p className={`text-[11px] font-semibold ${
                            hpi.affordabilityRatio > 10 ? 'text-pe-red' :
                            hpi.affordabilityRatio > 7 ? 'text-gold' : 'text-cyan'
                          }`}>{hpi.affordabilityRatio}x</p>
                          <p className="text-th-faint text-[9px]">Price/earnings</p>
                        </div>
                      )}
                    </div>
                    {hpi.medianEarnings && (
                      <p className="text-th-faint text-[9px] mt-1 text-center">Median earnings: £{hpi.medianEarnings.toLocaleString()}/yr (ONS ASHE)</p>
                    )}
                  </div>
                )}
              </div>
              );
            })()}
            {result.area_data.planning && (
              <div className="bg-th-input/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    result.area_data.planning.largeDevelopments > 2 ? 'bg-gold' : 'bg-cyan'
                  }`} />
                  <p className="text-th-secondary text-[10px] uppercase tracking-wider font-medium">Planning Applications</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div>
                    <p className="text-th-heading text-sm font-bold">{result.area_data.planning.total}</p>
                    <p className="text-th-muted text-[10px]">Total apps</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${
                      result.area_data.planning.largeDevelopments > 0 ? 'text-gold' : 'text-th-heading'
                    }`}>{result.area_data.planning.largeDevelopments}</p>
                    <p className="text-th-muted text-[10px]">Large/major</p>
                  </div>
                  <div>
                    <p className="text-th-heading text-sm font-bold">{result.area_data.planning.recent.length}</p>
                    <p className="text-th-muted text-[10px]">Recent</p>
                  </div>
                </div>
                {result.area_data.planning.recent.length > 0 && (
                  <div className="space-y-1 mt-2 border-t border-th-border pt-2">
                    {result.area_data.planning.recent.slice(0, 3).map((app, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          app.status.toLowerCase().includes('approved') || app.status.toLowerCase().includes('permitted') ? 'bg-cyan' :
                          app.status.toLowerCase().includes('refused') || app.status.toLowerCase().includes('rejected') ? 'bg-pe-red' : 'bg-gold'
                        }`} />
                        <p className="text-th-secondary text-[10px] leading-relaxed truncate" title={app.description}>
                          {app.description}
                          <span className="text-th-faint ml-1">({app.status})</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data sources used */}
      {result.data_sources && result.data_sources.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 px-4">
          {result.data_sources.map((src, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border border-th-border text-th-muted bg-th-card/30">
              {src}
            </span>
          ))}
        </div>
      )}

      {/* How valuation was calculated */}
      <div className="bg-th-card border border-th-border rounded-2xl p-5">
        <button
          onClick={() => setShowMethodology(!showMethodology)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className={`inline-block transition-transform text-xs text-th-muted ${showMethodology ? 'rotate-90' : ''}`}>&#9654;</span>
            <h3 className="text-th-heading font-semibold text-sm">How valuation was calculated</h3>
          </div>
        </button>

        {showMethodology && (
          <div className="mt-3 space-y-3">
            {result.valuation.basis && (
              <p className="text-th-secondary text-xs leading-relaxed">{result.valuation.basis}</p>
            )}

            {result.comparables && result.comparables.length > 0 && (
              <div>
                <p className="text-th-muted text-[10px] uppercase tracking-wider mb-1 font-medium">Comparables used</p>
                <p className="text-th-secondary text-xs">
                  {result.comparables.filter(c => !c.excluded).length} sales included in valuation
                  {result.comparables.some(c => c.excluded) && (
                    <>, {result.comparables.filter(c => c.excluded).length} excluded as outliers</>
                  )}
                </p>
              </div>
            )}

            {result.valuation.confidence_drivers && result.valuation.confidence_drivers.length > 0 && (
              <div>
                <p className="text-th-muted text-[10px] uppercase tracking-wider mb-1 font-medium">Confidence factors</p>
                <ul className="space-y-1">
                  {result.valuation.confidence_drivers.map((d, i) => (
                    <li key={i} className="text-th-secondary text-xs flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-th-muted mt-1.5 flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-th-muted text-[10px] uppercase tracking-wider mb-1 font-medium">Adjustments considered</p>
              <ul className="space-y-1 text-th-secondary text-xs">
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-th-muted mt-1.5 flex-shrink-0" />
                  Property type: {property.propertyType}, {property.bedrooms} bed, {property.sizeSqm}sqm
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-th-muted mt-1.5 flex-shrink-0" />
                  Year built: {property.yearBuilt} ({new Date().getFullYear() - property.yearBuilt} years old)
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-th-muted mt-1.5 flex-shrink-0" />
                  Tenure: {property.tenure}
                  {property.tenure === 'leasehold' && property.leaseYears ? ` (${property.leaseYears} years remaining)` : ''}
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible detail sections */}
      <div id="section-risks" className="bg-th-card border border-th-border rounded-2xl p-5 space-y-1">
        {result.red_flags.length > 0 && (
          <CollapsibleSection title="Red Flags" items={result.red_flags} color="red" />
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
