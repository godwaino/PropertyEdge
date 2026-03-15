import { AnalysisResult, AnalysisItem, PropertyInput, DataSources } from '../types/property';

interface Props {
  result: AnalysisResult;
  property: PropertyInput;
}

function formatCurrency(n: number): string {
  return '£' + Math.abs(n).toLocaleString();
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 75 ? '#00D9FF' : pct >= 50 ? '#FFD700' : '#FF4444';
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-500 uppercase tracking-wide">Confidence</span>
        <span className="text-xs font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-navy-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const config: Record<string, { bg: string; border: string; text: string; label: string; icon: string; glow: string }> = {
    GOOD_DEAL: {
      bg: 'bg-cyan/10',
      border: 'border-cyan/30',
      text: 'text-cyan',
      label: 'Good Deal',
      icon: '✓',
      glow: 'shadow-glow-cyan-sm',
    },
    FAIR: {
      bg: 'bg-gold/10',
      border: 'border-gold/30',
      text: 'text-gold',
      label: 'Fair Price',
      icon: '≈',
      glow: 'shadow-glow-gold',
    },
    OVERPRICED: {
      bg: 'bg-pe-red/10',
      border: 'border-pe-red/30',
      text: 'text-pe-red',
      label: 'Overpriced',
      icon: '↑',
      glow: 'shadow-glow-red',
    },
  };
  const s = config[verdict] || config.FAIR;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm font-semibold ${s.bg} ${s.border} ${s.text} ${s.glow}`}
    >
      <span className="text-base leading-none">{s.icon}</span>
      {s.label}
    </span>
  );
}

function ImpactBar({ impact, maxImpact }: { impact: number; maxImpact: number }) {
  const pct = maxImpact > 0 ? Math.min(100, (Math.abs(impact) / maxImpact) * 100) : 0;
  return (
    <div className="mt-2 h-0.5 rounded-full bg-navy-border overflow-hidden">
      <div
        className="h-full rounded-full bg-current opacity-40 transition-all duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Section({
  title,
  items,
  color,
  icon,
}: {
  title: string;
  items: AnalysisItem[];
  color: 'red' | 'gold' | 'cyan';
  icon: React.ReactNode;
}) {
  const maxImpact = Math.max(...items.map((i) => Math.abs(i.impact)));

  const colorMap = {
    red: {
      border: 'border-pe-red/15',
      badge: 'bg-pe-red/10 text-pe-red border border-pe-red/20',
      dot: 'bg-pe-red shadow-glow-red',
      header: 'text-pe-red',
      bar: 'text-pe-red',
      sectionBg: 'bg-pe-red/5',
    },
    gold: {
      border: 'border-gold/15',
      badge: 'bg-gold/10 text-gold border border-gold/20',
      dot: 'bg-gold shadow-glow-gold',
      header: 'text-gold',
      bar: 'text-gold',
      sectionBg: 'bg-gold/5',
    },
    cyan: {
      border: 'border-cyan/15',
      badge: 'bg-cyan/10 text-cyan border border-cyan/20',
      dot: 'bg-cyan shadow-glow-cyan-sm',
      header: 'text-cyan',
      bar: 'text-cyan',
      sectionBg: 'bg-cyan/5',
    },
  };
  const c = colorMap[color];

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Section header */}
      <div className={`px-5 py-3.5 border-b border-navy-border/60 flex items-center justify-between ${c.sectionBg}`}>
        <div className="flex items-center gap-2.5">
          <span className={c.header}>{icon}</span>
          <h3 className={`font-semibold text-sm ${c.header}`}>{title}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-navy-border/40">
        {items.map((item, i) => (
          <div
            key={i}
            className="px-5 py-4 hover:bg-white/[0.02] transition-colors"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${c.dot}`} />
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm leading-snug">{item.title}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{item.description}</p>
                  <div className={c.bar}>
                    <ImpactBar impact={item.impact} maxImpact={maxImpact} />
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={`text-xs px-2.5 py-1 rounded-lg font-mono font-medium ${c.badge}`}>
                  {formatCurrency(item.impact)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataSourcesRow({ ds }: { ds?: DataSources }) {
  if (!ds) return null;

  const floodLabel = ds.floodRisk
    ? ds.floodRisk.zone3 ? 'Zone 3 — HIGH RISK' : ds.floodRisk.zone2 ? 'Zone 2 — medium risk' : 'Low risk'
    : 'Unavailable';
  const floodActive = !!ds.floodRisk;
  const floodAlert = ds.floodRisk?.zone3 || ds.floodRisk?.zone2;

  const chips: { label: string; active: boolean; detail?: string; alert?: boolean }[] = [
    {
      label: 'Land Registry',
      active: !!ds.landRegistry,
      detail: ds.landRegistry
        ? `${ds.landRegistry.total} sale${ds.landRegistry.total !== 1 ? 's' : ''}${ds.landRegistry.sameType ? ` · ${ds.landRegistry.sameType} comparable` : ''}`
        : 'No sales data',
    },
    { label: 'Postcodes.io', active: ds.postcode, detail: ds.postcode ? 'Area profile' : 'Unavailable' },
    { label: 'EPC Register', active: ds.epc, detail: ds.epc ? 'Energy & size data' : 'No key configured' },
    {
      label: 'Flood Risk',
      active: floodActive,
      detail: floodLabel,
      alert: floodAlert ?? false,
    },
    {
      label: 'Crime',
      active: !!ds.crime,
      detail: ds.crime ? `${ds.crime.total} incidents · ${ds.crime.months}mo` : 'Unavailable',
    },
    {
      label: 'ONS Unemployment',
      active: !!ds.unemployment,
      detail: ds.unemployment ? `${ds.unemployment.rate.toFixed(1)}% · ${ds.unemployment.area}` : 'Unavailable',
    },
  ];

  return (
    <div className="border-t border-navy-border/40 px-5 py-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-600 mr-1">Data sources:</span>
      {chips.map(({ label, active, detail, alert }) => (
        <span
          key={label}
          title={detail}
          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
            alert
              ? 'border-gold/30 bg-gold/8 text-gold'
              : active
              ? 'border-pe-green/25 bg-pe-green/8 text-pe-green'
              : 'border-navy-border text-slate-600'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${alert ? 'bg-gold' : active ? 'bg-pe-green' : 'bg-slate-700'}`} />
          {label}
          {active && detail && <span className="opacity-60 ml-0.5">· {detail}</span>}
        </span>
      ))}
    </div>
  );
}

export default function AnalysisResults({ result, property }: Props) {
  const delta = result.valuation.amount - property.askingPrice;
  const deltaPercent = ((delta / property.askingPrice) * 100).toFixed(1);
  const isUndervalued = delta > 0;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-slide-up space-y-5">
      {/* Summary card */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Top accent bar */}
        <div
          className="h-0.5 w-full"
          style={{
            background:
              result.verdict === 'GOOD_DEAL'
                ? 'linear-gradient(90deg, #00D9FF, #00D9FF60)'
                : result.verdict === 'OVERPRICED'
                ? 'linear-gradient(90deg, #FF4444, #FF444460)'
                : 'linear-gradient(90deg, #FFD700, #FFD70060)',
          }}
        />

        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Valuation */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Estimated Valuation</p>
              <p className="text-4xl font-black text-white tracking-tight">
                {formatCurrency(result.valuation.amount)}
              </p>
              <p className="text-slate-500 text-xs mt-1.5">
                Asking price:{' '}
                <span className="text-slate-400 font-medium">{formatCurrency(property.askingPrice)}</span>
              </p>
              <ConfidenceMeter value={result.valuation.confidence} />
            </div>

            {/* Verdict + delta */}
            <div className="flex flex-col items-start sm:items-end gap-3">
              <VerdictBadge verdict={result.verdict} />

              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                  isUndervalued
                    ? 'bg-pe-green/10 border-pe-green/20 text-pe-green'
                    : 'bg-pe-red/10 border-pe-red/20 text-pe-red'
                }`}
              >
                <span className="text-lg leading-none">{isUndervalued ? '↓' : '↑'}</span>
                <div>
                  <p className="text-sm font-bold font-mono">
                    {isUndervalued ? '−' : '+'}{formatCurrency(Math.abs(delta))}
                  </p>
                  <p className="text-xs opacity-70">
                    {Math.abs(Number(deltaPercent))}% {isUndervalued ? 'below asking' : 'above valuation'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="border-t border-navy-border/60 grid grid-cols-3 divide-x divide-navy-border/40">
          {[
            { label: 'Red Flags', value: result.red_flags.length, color: 'text-pe-red' },
            { label: 'Warnings', value: result.warnings.length, color: 'text-gold' },
            { label: 'Positives', value: result.positives.length, color: 'text-cyan' },
          ].map(({ label, value, color }) => (
            <div key={label} className="py-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Data sources row */}
        <DataSourcesRow ds={result.dataSources} />
      </div>

      {/* Detail sections */}
      {result.red_flags.length > 0 && (
        <Section
          title="Red Flags"
          items={result.red_flags}
          color="red"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      )}
      {result.warnings.length > 0 && (
        <Section
          title="Warnings"
          items={result.warnings}
          color="gold"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
      )}
      {result.positives.length > 0 && (
        <Section
          title="Positives"
          items={result.positives}
          color="cyan"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      )}
    </div>
  );
}
