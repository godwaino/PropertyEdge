import { AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { DataCard } from '../../ui/DataCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { ScoreBar } from '../../ui/ScoreBar';
import type { FullAnalysisResult, RiskItem } from '../../../types/analysis';
import { riskSeverityColor } from '../../../utils/scores';

interface Props {
  result: FullAnalysisResult;
}

function RiskCard({ risk }: { risk: RiskItem }) {
  const icons = {
    critical: <AlertCircle size={16} />,
    high: <AlertTriangle size={16} />,
    medium: <Info size={16} />,
    low: <Info size={16} />,
    none: <CheckCircle size={16} />,
  };

  return (
    <div className={`rounded-xl border p-4 ${
      risk.severity === 'critical' ? 'border-pe-red/50 bg-pe-red/5' :
      risk.severity === 'high' ? 'border-pe-red/30 bg-pe-red/5' :
      risk.severity === 'medium' ? 'border-gold/30 bg-gold/5' :
      'border-navy-border bg-navy-light/50'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${
          risk.severity === 'critical' || risk.severity === 'high' ? 'text-pe-red' :
          risk.severity === 'medium' ? 'text-gold' : 'text-navy-300'
        }`}>
          {icons[risk.severity]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-charcoal">{risk.label}</p>
            <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${riskSeverityColor(risk.severity)}`}>
              {risk.severity}
            </span>
          </div>
          <p className="text-xs text-navy-300 leading-relaxed">{risk.explanation}</p>
          {risk.recommendedAction && (
            <p className="text-xs text-cyan mt-2 flex items-start gap-1">
              <span className="flex-shrink-0">→</span>
              {risk.recommendedAction}
            </p>
          )}
          <p className="text-[11px] text-navy-300/60 mt-1.5">Source: {risk.source}</p>
        </div>
      </div>
    </div>
  );
}

export function RiskSection({ result }: Props) {
  const { riskReport, scores, red_flags, warnings } = result;

  // Build risk items from riskReport or derive from legacy data
  const riskItems: RiskItem[] = riskReport.risks.length > 0
    ? riskReport.risks
    : [
        ...red_flags.map(f => ({
          category: 'area' as const,
          severity: 'high' as const,
          label: f.title,
          explanation: f.description,
          source: 'AI analysis',
          recommendedAction: '',
          resolved: false,
        })),
        ...warnings.map(w => ({
          category: 'area' as const,
          severity: 'medium' as const,
          label: w.title,
          explanation: w.description,
          source: 'AI analysis',
          recommendedAction: '',
          resolved: false,
        })),
      ];

  const criticalAndHigh = riskItems.filter(r => r.severity === 'critical' || r.severity === 'high');
  const medium = riskItems.filter(r => r.severity === 'medium');
  const low = riskItems.filter(r => r.severity === 'low' || r.severity === 'none');

  return (
    <div className="space-y-6 animate-fade-in">
      <DataCard>
        <SectionHeader
          title="Risk Radar"
          subtitle="Flags and friction points requiring attention"
          icon={<AlertTriangle size={16} />}
        />
        <ScoreBar score={scores.risk.score} label="Risk Score" size="lg" />
        <p className="text-xs text-navy-300 mt-1 mb-4">{scores.risk.label} · {riskItems.length === 0 ? 'No risks found' : `${riskItems.length} item${riskItems.length !== 1 ? 's' : ''} identified`}</p>

        {riskReport.riskNarrative && (
          <p className="text-sm text-navy-300 leading-relaxed border-l-2 border-gold/30 pl-4">
            {riskReport.riskNarrative}
          </p>
        )}
      </DataCard>

      {/* Critical / High */}
      {criticalAndHigh.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-pe-red flex items-center gap-2">
            <AlertCircle size={14} /> Critical & High Priority
          </h3>
          {criticalAndHigh.map((r, i) => <RiskCard key={i} risk={r} />)}
        </div>
      )}

      {/* Medium */}
      {medium.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gold flex items-center gap-2">
            <AlertTriangle size={14} /> Worth Reviewing
          </h3>
          {medium.map((r, i) => <RiskCard key={i} risk={r} />)}
        </div>
      )}

      {/* Low */}
      {low.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-navy-300 flex items-center gap-2">
            <Info size={14} /> Minor Notes
          </h3>
          {low.map((r, i) => <RiskCard key={i} risk={r} />)}
        </div>
      )}

      {riskItems.length === 0 && (
        <DataCard className="text-center py-8">
          <CheckCircle size={32} className="text-pe-green mx-auto mb-3" />
          <p className="text-charcoal font-medium">No significant risks identified</p>
          <p className="text-sm text-navy-300 mt-1">Always verify independently before exchange.</p>
        </DataCard>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-navy-300 border border-navy-border rounded-lg p-3">
        Risk data is derived from publicly available sources and AI analysis. This is not a professional survey. Always commission a RICS survey, instruct a solicitor, and take independent legal and financial advice before exchanging contracts.
      </p>
    </div>
  );
}
