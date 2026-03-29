import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { DecisionVerdictCard } from './DecisionVerdictCard';
import { ScoreCluster } from './ScoreCluster';
import { DataCard } from '../../ui/DataCard';
import type { FullAnalysisResult } from '../../../types/analysis';

interface Props {
  result: FullAnalysisResult;
  onTabClick?: (tab: string) => void;
}

export function OverviewSection({ result, onTabClick }: Props) {
  const { scores, valuationReport, neighbourhoodReport } = result;

  // Derive top signals from existing data
  const topPositives = result.positives.slice(0, 3);
  const topFlags = result.red_flags.slice(0, 3);
  const topWarnings = result.warnings.slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Decision verdict + score breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DecisionVerdictCard
          overall={scores.overall}
          askingPrice={valuationReport.askingPrice}
          fairValueCentral={valuationReport.fairValueCentral}
          address={neighbourhoodReport.adminDistrict
            ? `${neighbourhoodReport.postcode} · ${neighbourhoodReport.adminDistrict}`
            : neighbourhoodReport.postcode}
        />
        <ScoreCluster scores={scores} onTabClick={onTabClick} />
      </div>

      {/* Key signals */}
      {(topPositives.length > 0 || topFlags.length > 0 || topWarnings.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Red flags */}
          {topFlags.length > 0 && (
            <DataCard className="border-pe-red/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-pe-red" />
                <span className="text-sm font-semibold text-pe-red">Red Flags</span>
                <span className="ml-auto w-5 h-5 rounded-full bg-pe-red/10 text-pe-red text-xs flex items-center justify-center">
                  {result.red_flags.length}
                </span>
              </div>
              <ul className="space-y-1.5">
                {topFlags.map((f, i) => (
                  <li key={i} className="text-xs text-navy-300 flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-pe-red mt-1.5 flex-shrink-0" />
                    {f.title}
                  </li>
                ))}
              </ul>
              {result.red_flags.length > 3 && (
                <button
                  onClick={() => onTabClick?.('risks')}
                  className="text-xs text-pe-red hover:underline mt-2"
                >
                  +{result.red_flags.length - 3} more — view all risks
                </button>
              )}
            </DataCard>
          )}

          {/* Warnings */}
          {topWarnings.length > 0 && (
            <DataCard className="border-gold/20">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} className="text-gold" />
                <span className="text-sm font-semibold text-gold">Warnings</span>
                <span className="ml-auto w-5 h-5 rounded-full bg-gold/10 text-gold text-xs flex items-center justify-center">
                  {result.warnings.length}
                </span>
              </div>
              <ul className="space-y-1.5">
                {topWarnings.map((w, i) => (
                  <li key={i} className="text-xs text-navy-300 flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                    {w.title}
                  </li>
                ))}
              </ul>
            </DataCard>
          )}

          {/* Positives */}
          {topPositives.length > 0 && (
            <DataCard className="border-pe-green/20">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-pe-green" />
                <span className="text-sm font-semibold text-pe-green">Positives</span>
                <span className="ml-auto w-5 h-5 rounded-full bg-pe-green/10 text-pe-green text-xs flex items-center justify-center">
                  {result.positives.length}
                </span>
              </div>
              <ul className="space-y-1.5">
                {topPositives.map((p, i) => (
                  <li key={i} className="text-xs text-navy-300 flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-pe-green mt-1.5 flex-shrink-0" />
                    {p.title}
                  </li>
                ))}
              </ul>
            </DataCard>
          )}
        </div>
      )}
    </div>
  );
}
