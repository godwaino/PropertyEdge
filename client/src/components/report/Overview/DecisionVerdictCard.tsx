import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { VerdictBadge } from '../../ui/VerdictBadge';
import type { OverallScore } from '../../../types/analysis';
import { verdictColor } from '../../../utils/scores';
import { formatCurrency } from '../../../utils/formatters';

interface Props {
  overall: OverallScore;
  askingPrice: number;
  fairValueCentral: number;
  address: string;
}

function VerdictIcon({ code }: { code: string }) {
  if (['strong_buy', 'good_buy'].includes(code))
    return <CheckCircle size={28} className="text-pe-green" />;
  if (['promising_verify', 'fair_weak_fit', 'watch_dont_rush'].includes(code))
    return <AlertTriangle size={28} className="text-gold" />;
  return <XCircle size={28} className="text-pe-red" />;
}

export function DecisionVerdictCard({ overall, askingPrice, fairValueCentral, address }: Props) {
  const delta = fairValueCentral - askingPrice;
  const deltaSign = delta >= 0 ? '+' : '';
  const deltaPct = ((delta / askingPrice) * 100).toFixed(1);

  return (
    <div className="glass-card rounded-2xl border border-navy-border p-6 md:p-8">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <VerdictIcon code={overall.verdictCode} />
          <div>
            <p className="text-xs text-navy-300 uppercase tracking-wider mb-1">Decision Verdict</p>
            <VerdictBadge code={overall.verdictCode} label={overall.label} size="lg" />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-navy-300 mb-1">Overall Score</p>
          <p className={`text-4xl font-bold tabular-nums ${verdictColor(overall.verdictCode)}`}>
            {overall.score}
          </p>
          <p className="text-xs text-navy-300">/ 100</p>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-navy-300 leading-relaxed mb-6 border-l-2 border-cyan/30 pl-4">
        {overall.summary}
      </p>

      {/* Price delta */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-navy-light border border-navy-border">
        <TrendingUp size={18} className={delta >= 0 ? 'text-pe-green' : 'text-pe-red'} />
        <div>
          <p className="text-xs text-navy-300">Asking vs estimated fair value</p>
          <p className="text-sm font-medium text-white">
            {formatCurrency(askingPrice)}{' '}
            <span className={`font-semibold ${delta >= 0 ? 'text-pe-green' : 'text-pe-red'}`}>
              ({deltaSign}{formatCurrency(delta, true)} / {deltaSign}{deltaPct}%)
            </span>
          </p>
        </div>
      </div>

      {/* Address */}
      <p className="text-xs text-navy-300 mt-4 truncate">{address}</p>
    </div>
  );
}
