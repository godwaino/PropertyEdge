import { MapPin, Shield, Droplets, TrendingDown, FileText } from 'lucide-react';
import { DataCard } from '../../ui/DataCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { ScoreBar } from '../../ui/ScoreBar';
import { SourceBadge } from '../../ui/SourceBadge';
import { NeighbourhoodExplorer } from '../../Explorer/NeighbourhoodExplorer';
import type { FullAnalysisResult } from '../../../types/analysis';
import { riskSeverityColor } from '../../../utils/scores';

interface Props {
  result: FullAnalysisResult;
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-navy-border/50 last:border-0">
      <span className="text-sm text-navy-300">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-white">{value}</span>
        {sub && <p className="text-xs text-navy-300">{sub}</p>}
      </div>
    </div>
  );
}

export function NeighbourhoodSection({ result }: Props) {
  const { neighbourhoodReport, scores } = result;
  const { crime, floodRisk, environment } = neighbourhoodReport;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 3D / 2D location explorer */}
      {(neighbourhoodReport.lat && neighbourhoodReport.lng) && (
        <NeighbourhoodExplorer result={result} />
      )}

      {/* Score headline */}
      <DataCard>
        <SectionHeader
          title="Neighbourhood Intelligence"
          subtitle={`${neighbourhoodReport.adminDistrict || neighbourhoodReport.postcode}`}
          icon={<MapPin size={16} />}
        />
        <ScoreBar score={scores.neighbourhood.score} label="Neighbourhood Score" size="lg" />
        <p className="text-xs text-navy-300 mt-2">{scores.neighbourhood.label}</p>

        {neighbourhoodReport.characterNarrative && (
          <p className="text-sm text-navy-300 leading-relaxed mt-5 border-l-2 border-cyan/30 pl-4">
            {neighbourhoodReport.characterNarrative}
          </p>
        )}
      </DataCard>

      {/* Crime */}
      {crime && (
        <DataCard>
          <SectionHeader
            title="Crime Context"
            subtitle="Police.uk data"
            icon={<Shield size={16} />}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl bg-navy-light border border-navy-border p-4 text-center">
              <p className="text-2xl font-bold text-white tabular-nums">{crime.perMonthAverage.toFixed(0)}</p>
              <p className="text-xs text-navy-300 mt-1">crimes / month</p>
            </div>
            <div className="rounded-xl bg-navy-light border border-navy-border p-4 text-center">
              <p className="text-2xl font-bold text-white tabular-nums">{crime.totalLast3Months}</p>
              <p className="text-xs text-navy-300 mt-1">last 3 months</p>
            </div>
            <div className="rounded-xl bg-navy-light border border-navy-border p-4 text-center col-span-2 sm:col-span-1">
              <p className="text-2xl font-bold text-white tabular-nums">{crime.dataMonths}</p>
              <p className="text-xs text-navy-300 mt-1">months of data</p>
            </div>
          </div>

          {crime.topCategories.length > 0 && (
            <div>
              <p className="text-xs text-navy-300 uppercase tracking-wider mb-3">Top categories</p>
              <div className="space-y-2">
                {crime.topCategories.slice(0, 4).map((cat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-navy-300 w-32 truncate">{cat.category}</span>
                    <div className="flex-1 h-1.5 bg-navy-border rounded-full">
                      <div
                        className="h-1.5 rounded-full bg-gold/60"
                        style={{ width: `${Math.min(100, (cat.count / crime.totalLast3Months) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-white tabular-nums w-6 text-right">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-navy-300 mt-4 border-t border-navy-border pt-3">
            {crime.contextNote}
          </p>
          <div className="mt-2">
            <SourceBadge label="Police.uk" active={true} />
          </div>
        </DataCard>
      )}

      {/* Flood risk */}
      {floodRisk && (
        <DataCard>
          <SectionHeader
            title="Flood Risk"
            subtitle="Environment Agency data"
            icon={<Droplets size={16} />}
          />
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${riskSeverityColor(floodRisk.severity)}`}>
            <Droplets size={16} />
            {floodRisk.label}
          </div>
          <div className="mt-4 space-y-0">
            <StatRow
              label="Flood Zone 3 (High risk >3.3%/yr)"
              value={floodRisk.zone3HighRisk ? '⚠ Yes' : '✓ No'}
            />
            <StatRow
              label="Flood Zone 2 (Medium risk >0.1%/yr)"
              value={floodRisk.zone2MediumRisk ? '⚠ Yes' : '✓ No'}
            />
          </div>
          <p className="text-[11px] text-navy-300 mt-3">
            Low risk zone does not mean zero risk. Review the EA flood map and consider a specialist flood report before exchange.
          </p>
          <div className="mt-2">
            <SourceBadge label="Environment Agency" active={true} />
          </div>
        </DataCard>
      )}

      {/* Environment / area data */}
      <DataCard>
        <SectionHeader
          title="Area Profile"
          subtitle="Economic and energy data"
          icon={<TrendingDown size={16} />}
        />
        <div className="space-y-0">
          {environment.unemploymentRate !== null && (
            <StatRow
              label="Claimant unemployment rate"
              value={`${environment.unemploymentRate.toFixed(1)}%`}
              sub={environment.unemploymentArea ?? undefined}
            />
          )}
          {environment.epcRating && (
            <StatRow label="EPC Rating" value={environment.epcRating} />
          )}
          {environment.floorAreaSqM && (
            <StatRow label="Floor area (EPC record)" value={`${environment.floorAreaSqM} m²`} />
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <SourceBadge label="ONS / Nomis" active={environment.unemploymentRate !== null} />
          <SourceBadge label="EPC Register" active={!!environment.epcRating} />
          <SourceBadge label="Postcodes.io" active={true} />
        </div>
      </DataCard>

      <DataCard>
        <SectionHeader title="Location" icon={<FileText size={16} />} />
        <div className="space-y-0">
          <StatRow label="Postcode" value={neighbourhoodReport.postcode} />
          {neighbourhoodReport.adminDistrict && (
            <StatRow label="Local authority" value={neighbourhoodReport.adminDistrict} />
          )}
          {neighbourhoodReport.region && (
            <StatRow label="Region" value={neighbourhoodReport.region} />
          )}
          {neighbourhoodReport.lat && (
            <StatRow
              label="Coordinates"
              value={`${neighbourhoodReport.lat.toFixed(4)}, ${neighbourhoodReport.lng?.toFixed(4)}`}
            />
          )}
        </div>
      </DataCard>
    </div>
  );
}
