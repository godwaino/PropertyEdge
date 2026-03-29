import { TrendingUp, MessageSquare, BarChart2 } from 'lucide-react';
import { DataCard } from '../../ui/DataCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { ScoreBar } from '../../ui/ScoreBar';
import { ConfidencePill } from '../../ui/ConfidencePill';
import { VerdictBadge } from '../../ui/VerdictBadge';
import { ValuationRangeBar } from './ValuationRangeBar';
import { ComparablesSalesTable } from './ComparablesSalesTable';
import type { FullAnalysisResult } from '../../../types/analysis';
import { formatCurrency } from '../../../utils/formatters';

// Map pricing verdict to VerdictCode for badge colouring
function pricingVerdictCode(v: string) {
  if (v === 'excellent_value' || v === 'good_value') return 'good_buy' as const;
  if (v === 'fair') return 'promising_verify' as const;
  if (v === 'slightly_stretched') return 'watch_dont_rush' as const;
  return 'avoid_unless_drops' as const;
}

interface Props {
  result: FullAnalysisResult;
}

export function ValuationSection({ result }: Props) {
  const { valuationReport, scores } = result;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Headline */}
      <DataCard>
        <SectionHeader
          title="Valuation Intelligence"
          subtitle="AI estimate based on Land Registry sold prices"
          icon={<TrendingUp size={16} />}
          badge={<ConfidencePill confidence={scores.valuation.confidence} />}
        />

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div>
            <p className="text-xs text-navy-300 mb-1">Asking Price</p>
            <p className="text-3xl font-bold text-white tabular-nums">
              {formatCurrency(valuationReport.askingPrice)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-navy-300">·</span>
            <VerdictBadge
              code={pricingVerdictCode(valuationReport.pricingVerdict)}
              label={valuationReport.pricingVerdictLabel}
            />
          </div>
        </div>

        <ValuationRangeBar
          low={valuationReport.fairValueLow}
          central={valuationReport.fairValueCentral}
          high={valuationReport.fairValueHigh}
          asking={valuationReport.askingPrice}
        />

        <div className="mt-6">
          <ScoreBar score={scores.valuation.score} label="Valuation Score" />
        </div>
      </DataCard>

      {/* Narrative */}
      <DataCard>
        <SectionHeader title="Analyst View" icon={<MessageSquare size={16} />} />
        <p className="text-sm text-navy-300 leading-relaxed">{valuationReport.valuationNarrative}</p>
        {valuationReport.marketContextNote && (
          <p className="text-sm text-navy-300 leading-relaxed mt-3 pt-3 border-t border-navy-border">
            <span className="text-white font-medium">Market context: </span>
            {valuationReport.marketContextNote}
          </p>
        )}
      </DataCard>

      {/* Comparables */}
      <DataCard>
        <SectionHeader
          title="Comparable Sales"
          subtitle={`${valuationReport.comparablesCount} properties used in analysis`}
          icon={<BarChart2 size={16} />}
        />
        <ComparablesSalesTable
          comparables={valuationReport.comparables}
          askingPrice={valuationReport.askingPrice}
        />
      </DataCard>

      {/* Negotiation angles */}
      {valuationReport.negotiationAngles.length > 0 && (
        <DataCard>
          <SectionHeader title="Negotiation Angles" subtitle="Specific talking points for price discussion" />
          <ul className="space-y-3">
            {valuationReport.negotiationAngles.map((angle, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-cyan/10 border border-cyan/20 text-cyan text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-navy-300">{angle}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-navy-300 mt-4 border-t border-navy-border pt-3">
            These are analytical observations. Always take independent advice before making an offer.
          </p>
        </DataCard>
      )}
    </div>
  );
}
