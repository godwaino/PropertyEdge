import { useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Camera,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  PoundSterling,
} from 'lucide-react';
import { useState } from 'react';
import { AnalysisResult, Finding, PropertyInput } from '../types/property';
import html2canvas from 'html2canvas';

interface Props {
  result: AnalysisResult;
  property: PropertyInput;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const config: Record<string, { label: string; bg: string; text: string; glow: string }> = {
    GOOD_DEAL: {
      label: 'GOOD DEAL',
      bg: 'bg-pe-green/15',
      text: 'text-pe-green',
      glow: 'glow-green',
    },
    FAIR: {
      label: 'FAIR PRICE',
      bg: 'bg-gold/15',
      text: 'text-gold',
      glow: 'glow-gold',
    },
    OVERPRICED: {
      label: 'OVERPRICED',
      bg: 'bg-pe-red/15',
      text: 'text-pe-red',
      glow: 'glow-red',
    },
  };
  const c = config[verdict] || config.FAIR;

  return (
    <span
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm tracking-wider ${c.bg} ${c.text} ${c.glow}`}
    >
      {verdict === 'GOOD_DEAL' && <TrendingDown className="w-4 h-4" />}
      {verdict === 'FAIR' && <Minus className="w-4 h-4" />}
      {verdict === 'OVERPRICED' && <TrendingUp className="w-4 h-4" />}
      {c.label}
    </span>
  );
}

function PriceBar({
  label,
  amount,
  maxAmount,
  color,
}: {
  label: string;
  amount: number;
  maxAmount: number;
  color: string;
}) {
  const pct = Math.min((amount / maxAmount) * 100, 100);

  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold text-white">{formatCurrency(amount)}</span>
      </div>
      <div className="h-8 bg-navy-lighter rounded-lg overflow-hidden">
        <div
          className={`h-full rounded-lg ${color} transition-all duration-1000 ease-out flex items-center justify-end pr-3`}
          style={{ width: `${pct}%` }}
        >
          <span className="text-xs font-bold text-navy">{formatCurrency(amount)}</span>
        </div>
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  type,
  index,
}: {
  finding: Finding;
  type: 'red_flag' | 'warning' | 'positive';
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const config = {
    red_flag: {
      border: 'border-pe-red/30',
      bg: 'bg-pe-red/5',
      icon: <AlertTriangle className="w-5 h-5 text-pe-red" />,
      badge: 'bg-pe-red/20 text-pe-red',
    },
    warning: {
      border: 'border-gold/30',
      bg: 'bg-gold/5',
      icon: <AlertCircle className="w-5 h-5 text-gold" />,
      badge: 'bg-gold/20 text-gold',
    },
    positive: {
      border: 'border-pe-green/30',
      bg: 'bg-pe-green/5',
      icon: <CheckCircle className="w-5 h-5 text-pe-green" />,
      badge: 'bg-pe-green/20 text-pe-green',
    },
  };
  const c = config[type];

  return (
    <div
      className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden transition-all duration-300 animate-slide-up`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        {c.icon}
        <span className="flex-1 font-medium text-white">{finding.title}</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${c.badge} flex items-center gap-1`}
        >
          <PoundSterling className="w-3 h-3" />
          {finding.impact.toLocaleString()}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pl-12 animate-fade-in">
          <p className="text-sm text-gray-300 leading-relaxed">{finding.description}</p>
        </div>
      )}
    </div>
  );
}

function FindingsSection({
  title,
  findings,
  type,
  icon,
  count,
}: {
  title: string;
  findings: Finding[];
  type: 'red_flag' | 'warning' | 'positive';
  icon: React.ReactNode;
  count: number;
}) {
  if (findings.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-bold text-gray-300">
          {count}
        </span>
      </div>
      <div className="space-y-2">
        {findings.map((f, i) => (
          <FindingCard key={i} finding={f} type={type} index={i} />
        ))}
      </div>
    </div>
  );
}

export default function AnalysisResults({ result, property }: Props) {
  const resultsRef = useRef<HTMLDivElement>(null);

  const maxPrice = Math.max(property.askingPrice, result.valuation.amount) * 1.1;

  const takeScreenshot = async () => {
    if (!resultsRef.current) return;

    try {
      const canvas = await html2canvas(resultsRef.current, {
        backgroundColor: '#0a1929',
        scale: 2,
        width: 1920,
        height: 1080,
        windowWidth: 1920,
        windowHeight: 1080,
      });

      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      const addressSlug = property.address.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `PropertyEdge_${addressSlug}_${date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  };

  const savingsText =
    result.savings > 0
      ? `Save ${formatCurrency(result.savings)}`
      : result.savings < 0
        ? `${formatCurrency(Math.abs(result.savings))} over market`
        : 'At market value';

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-fade-in">
      {/* Screenshot button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={takeScreenshot}
          className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-gray-300 hover:text-cyan hover:border-cyan transition-colors text-sm"
        >
          <Camera className="w-4 h-4" />
          Screenshot for YouTube
        </button>
      </div>

      {/* Results container - this gets screenshotted */}
      <div ref={resultsRef} className="space-y-6">
        {/* Valuation Hero Card */}
        <div className="glass-card rounded-2xl p-6 md:p-8 glow-cyan animate-scale-in">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-400 uppercase tracking-widest mb-2">
              AI Property Valuation
            </p>
            <div className="text-5xl md:text-6xl font-black gradient-text mb-2 font-mono">
              {formatCurrency(result.valuation.amount)}
            </div>
            <p className="text-gray-400 text-sm">
              Confidence: ±{result.valuation.confidence}%
            </p>
            <div className="mt-4">
              <VerdictBadge verdict={result.verdict} />
            </div>
            <p className="mt-3 text-lg font-medium text-gray-300">{savingsText}</p>
          </div>

          {/* Price Comparison Bars */}
          <div className="mt-8">
            <PriceBar
              label="Listed Price"
              amount={property.askingPrice}
              maxAmount={maxPrice}
              color="bg-gradient-to-r from-pe-red/80 to-pe-red"
            />
            <PriceBar
              label="AI Valuation"
              amount={result.valuation.amount}
              maxAmount={maxPrice}
              color="bg-gradient-to-r from-cyan/80 to-cyan"
            />
          </div>

          {/* Issue Counts */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 rounded-xl bg-pe-red/10 border border-pe-red/20">
              <div className="text-2xl font-bold text-pe-red">
                {result.red_flags.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">Red Flags</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-gold/10 border border-gold/20">
              <div className="text-2xl font-bold text-gold">
                {result.warnings.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">Warnings</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-pe-green/10 border border-pe-green/20">
              <div className="text-2xl font-bold text-pe-green">
                {result.positives.length}
              </div>
              <div className="text-xs text-gray-400 mt-1">Positives</div>
            </div>
          </div>
        </div>

        {/* Detailed Findings */}
        <div className="glass-card rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-6">Detailed Findings</h2>

          <FindingsSection
            title="Red Flags"
            findings={result.red_flags}
            type="red_flag"
            icon={<AlertTriangle className="w-5 h-5 text-pe-red" />}
            count={result.red_flags.length}
          />

          <FindingsSection
            title="Warnings"
            findings={result.warnings}
            type="warning"
            icon={<AlertCircle className="w-5 h-5 text-gold" />}
            count={result.warnings.length}
          />

          <FindingsSection
            title="Positives"
            findings={result.positives}
            type="positive"
            icon={<CheckCircle className="w-5 h-5 text-pe-green" />}
            count={result.positives.length}
          />
        </div>

        {/* Footer branding for screenshots */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            <span className="text-cyan">Property Edge AI</span> — UK Property Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}
