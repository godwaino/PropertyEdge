import { UserCheck, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataCard } from '../../ui/DataCard';
import { SectionHeader } from '../../ui/SectionHeader';
import { ScoreBar } from '../../ui/ScoreBar';
import { FitDimensionBar } from './FitDimensionBar';
import { useProfileStore } from '../../../stores/profileStore';
import type { FullAnalysisResult } from '../../../types/analysis';

interface Props {
  result: FullAnalysisResult;
  askingPrice: number;
  bedrooms: number;
  tenure: string;
}

interface FitDimension {
  label: string;
  score: number;
  note: string;
  weight: number;
}

function calcFitDimensions(
  result: FullAnalysisResult,
  askingPrice: number,
  bedrooms: number,
  tenure: string,
  profile: ReturnType<typeof useProfileStore.getState>['profile'],
): FitDimension[] {
  const dims: FitDimension[] = [];

  // 1. Budget fit
  if (profile.budgetMax) {
    const over = askingPrice - profile.budgetMax;
    let score = 100;
    if (over > 0) {
      const overpct = over / profile.budgetMax;
      score = Math.max(0, Math.round(100 - overpct * 200));
    }
    const note =
      over > 0
        ? `£${Math.round(over / 1000)}k over your budget of £${Math.round(profile.budgetMax / 1000)}k`
        : `£${Math.round(-over / 1000)}k within your budget of £${Math.round(profile.budgetMax / 1000)}k`;
    dims.push({ label: 'Budget', score, note, weight: profile.weightPrice });
  } else {
    // Use valuation score as proxy
    const vs = result.scores.valuation.score;
    dims.push({
      label: 'Value for Money',
      score: vs,
      note: result.scores.valuation.label,
      weight: profile.weightPrice,
    });
  }

  // 2. Space / bedrooms
  const bedroomShortfall = Math.max(0, profile.minBedrooms - bedrooms);
  const bedroomScore =
    bedroomShortfall === 0 ? 90 : bedroomShortfall === 1 ? 55 : 20;
  dims.push({
    label: 'Space',
    score: bedroomScore,
    note:
      bedroomShortfall === 0
        ? `${bedrooms} bed meets your minimum of ${profile.minBedrooms}`
        : `${bedrooms} bed is below your minimum of ${profile.minBedrooms}`,
    weight: profile.weightSpace,
  });

  // 3. Safety (crime)
  const crimeScore = result.scores.neighbourhood.score;
  dims.push({
    label: 'Safety',
    score: crimeScore,
    note: result.neighbourhoodReport.crime
      ? `${result.neighbourhoodReport.crime.perMonthAverage.toFixed(0)} crimes/month in area`
      : 'Crime data unavailable',
    weight: profile.weightLowCrime,
  });

  // 4. Flood safety
  const highFlood = result.neighbourhoodReport.floodRisk?.zone3HighRisk ?? false;
  const medFlood = result.neighbourhoodReport.floodRisk?.zone2MediumRisk ?? false;
  const floodScore = highFlood ? 20 : medFlood ? 55 : 90;
  dims.push({
    label: 'Flood Safety',
    score: floodScore,
    note: result.neighbourhoodReport.floodRisk?.label ?? 'Low flood risk',
    weight: profile.weightFloodSafety,
  });

  // 5. Tenure match
  if (profile.preferredTenure !== 'any') {
    const tenureNormalised = tenure.toLowerCase();
    const pref = profile.preferredTenure as string;
    const match = tenureNormalised.includes(pref);
    dims.push({
      label: 'Tenure',
      score: match ? 95 : 30,
      note: match
        ? `${tenure} matches your preference`
        : `${tenure} doesn't match your preference for ${profile.preferredTenure}`,
      weight: 5,
    });
  }

  return dims;
}

function calcOverallFit(dims: FitDimension[]): number {
  if (dims.length === 0) return 50;
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);
  const weightedSum = dims.reduce((s, d) => s + d.score * d.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

function fitSummary(score: number): string {
  if (score >= 80) return 'This property closely matches your buyer profile and priorities.';
  if (score >= 65) return 'Good alignment with your profile — review highlighted areas before proceeding.';
  if (score >= 50) return 'Moderate fit. Some dimensions fall short of your stated preferences.';
  return 'Limited fit against your profile. Consider whether priorities can flex or look at alternatives.';
}

export function FitSection({ result, askingPrice, bedrooms, tenure }: Props) {
  const { profile } = useProfileStore();
  const dims = calcFitDimensions(result, askingPrice, bedrooms, tenure, profile);
  const overallFit = calcOverallFit(dims);

  // Sort by weight desc
  const sortedDims = [...dims].sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-6 animate-fade-in">
      <DataCard>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            title="Buyer Fit Score"
            subtitle="How well this property matches your profile"
            icon={<UserCheck size={16} />}
          />
          <Link
            to="/profile"
            className="flex items-center gap-1.5 text-xs text-navy-300 hover:text-cyan transition-colors"
          >
            <Settings size={12} />
            Edit profile
          </Link>
        </div>

        <ScoreBar score={overallFit} label="Overall Fit" size="lg" />
        <p className="text-xs text-navy-300 mt-2">{fitSummary(overallFit)}</p>
      </DataCard>

      <DataCard>
        <SectionHeader title="Fit by Dimension" subtitle="Weighted by your priorities" />
        <div className="mt-2">
          {sortedDims.map((dim) => (
            <FitDimensionBar
              key={dim.label}
              label={dim.label}
              score={dim.score}
              note={dim.note}
              weight={dim.weight}
            />
          ))}
        </div>
      </DataCard>

      {!profile.budgetMax && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gold/10 border border-gold/30">
          <Settings size={16} className="text-gold mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gold mb-1">Improve your fit score</p>
            <p className="text-xs text-navy-300">
              Set your budget, bedroom requirement, and priority weights in your{' '}
              <Link to="/profile" className="text-cyan hover:underline">
                buyer profile
              </Link>{' '}
              to get a personalised fit analysis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
