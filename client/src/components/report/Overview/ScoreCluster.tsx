import { ScoreBar } from '../../ui/ScoreBar';
import { ConfidencePill } from '../../ui/ConfidencePill';
import type { ReportScores } from '../../../types/analysis';

const DIMENSIONS = [
  { key: 'valuation', label: 'Valuation', description: 'Price vs fair market value' },
  { key: 'neighbourhood', label: 'Neighbourhood', description: 'Location quality signals' },
  { key: 'risk', label: 'Risk', description: 'Flags and friction points' },
] as const;

interface Props {
  scores: ReportScores;
  onTabClick?: (tab: string) => void;
}

export function ScoreCluster({ scores, onTabClick }: Props) {
  return (
    <div className="glass-card rounded-2xl border border-navy-border p-6">
      <h3 className="text-sm font-semibold text-charcoal mb-5">Score Breakdown</h3>
      <div className="space-y-5">
        {DIMENSIONS.map(({ key, label, description }) => {
          const s = scores[key];
          return (
            <div
              key={key}
              className={onTabClick ? 'cursor-pointer group' : ''}
              onClick={() => onTabClick?.(key)}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-charcoal group-hover:text-cyan transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-navy-300">{description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ConfidencePill confidence={s.confidence} showIcon={false} />
                  <span className="text-sm font-bold text-charcoal tabular-nums w-8 text-right">
                    {s.score}
                  </span>
                </div>
              </div>
              <ScoreBar score={s.score} showNumber={false} />
              <p className="text-xs text-navy-300 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
