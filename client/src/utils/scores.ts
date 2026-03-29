import type {
  VerdictCode,
  PricingVerdict,
  RiskSeverity,
  ScoreResult,
  OverallScore,
  ReportScores,
  FullAnalysisResult,
  RiskItem,
} from '../types/analysis';

// ─── Valuation scoring ────────────────────────────────────────────────────────

export function calcValuationScore(
  askingPrice: number,
  fairValueCentral: number,
  comparablesCount: number,
): ScoreResult {
  const pct = (fairValueCentral - askingPrice) / fairValueCentral; // positive = undervalued

  let score: number;
  let label: string;
  let verdict: PricingVerdict;

  if (pct > 0.1) { score = 92; label = 'Excellent Value'; verdict = 'excellent_value'; }
  else if (pct > 0.05) { score = 84; label = 'Good Value'; verdict = 'good_value'; }
  else if (pct >= -0.05) { score = 70; label = 'Fair Price'; verdict = 'fair'; }
  else if (pct >= -0.1) { score = 52; label = 'Slightly Stretched'; verdict = 'slightly_stretched'; }
  else if (pct >= -0.2) { score = 36; label = 'Overpriced'; verdict = 'overpriced'; }
  else { score = 18; label = 'Significantly Overpriced'; verdict = 'significantly_overpriced'; }

  const confidence = comparablesCount >= 5 ? 'high' : comparablesCount >= 2 ? 'medium' : 'low';

  return { score, confidence, label };
}

// ─── Neighbourhood scoring ────────────────────────────────────────────────────

export function calcNeighbourhoodScore(
  crimePerMonth: number | null,
  isHighFloodRisk: boolean,
  isMediumFloodRisk: boolean,
  unemploymentRate: number | null,
): ScoreResult {
  let score = 75; // baseline

  // Crime adjustment (rough UK average ~40 incidents/month per ward)
  if (crimePerMonth !== null) {
    if (crimePerMonth < 15) score += 12;
    else if (crimePerMonth < 30) score += 5;
    else if (crimePerMonth < 50) score -= 5;
    else if (crimePerMonth < 80) score -= 15;
    else score -= 25;
  }

  // Flood adjustment
  if (isHighFloodRisk) score -= 20;
  else if (isMediumFloodRisk) score -= 8;

  // Unemployment adjustment (UK avg ~4%)
  if (unemploymentRate !== null) {
    if (unemploymentRate < 2) score += 8;
    else if (unemploymentRate < 4) score += 3;
    else if (unemploymentRate > 8) score -= 12;
    else if (unemploymentRate > 6) score -= 6;
  }

  score = Math.max(10, Math.min(98, score));

  let label: string;
  if (score >= 85) label = 'Excellent Location';
  else if (score >= 72) label = 'Very Good';
  else if (score >= 58) label = 'Good';
  else if (score >= 44) label = 'Average';
  else if (score >= 30) label = 'Below Average';
  else label = 'Poor Location';

  // Confidence depends on data availability
  const dataPoints = [crimePerMonth !== null, unemploymentRate !== null].filter(Boolean).length;
  const confidence = dataPoints >= 2 ? 'medium' : 'low';

  return { score, confidence, label };
}

// ─── Risk scoring ─────────────────────────────────────────────────────────────

export function calcRiskScore(risks: RiskItem[]): ScoreResult {
  if (risks.length === 0) {
    return { score: 88, confidence: 'medium', label: 'Clean Bill of Health' };
  }

  const hasCritical = risks.some(r => r.severity === 'critical');
  const highCount = risks.filter(r => r.severity === 'high').length;
  const medCount = risks.filter(r => r.severity === 'medium').length;

  let score = 88;
  if (hasCritical) score = Math.min(score, 35);
  score -= highCount * 15;
  score -= medCount * 8;
  score = Math.max(10, Math.min(95, score));

  let label: string;
  if (score >= 80) label = 'Clean Bill of Health';
  else if (score >= 65) label = 'Minor Considerations';
  else if (score >= 50) label = 'Review Required';
  else if (score >= 35) label = 'Notable Risks';
  else if (score >= 20) label = 'Significant Concerns';
  else label = 'Critical Risk Found';

  const confidence = 'medium';
  return { score, confidence, label };
}

// ─── Overall / decision score ─────────────────────────────────────────────────

const VERDICT_MAP: Array<[number, VerdictCode, string]> = [
  [85, 'strong_buy', 'Strong Buy Signal'],
  [70, 'good_buy', 'Good Buy'],
  [60, 'promising_verify', 'Promising — Verify'],
  [50, 'fair_weak_fit', 'Fair Price, Review Needed'],
  [40, 'watch_dont_rush', 'Watch, Don\'t Rush'],
  [25, 'avoid_unless_drops', 'Avoid Unless Price Drops'],
  [0, 'not_recommended', 'Not Recommended'],
];

export function calcOverallScore(
  valuation: ScoreResult,
  neighbourhood: ScoreResult,
  risk: ScoreResult,
): OverallScore {
  // Weights: Valuation 35%, Neighbourhood 30%, Risk 35%
  const score = Math.round(
    valuation.score * 0.35 +
    neighbourhood.score * 0.30 +
    risk.score * 0.35,
  );

  const [, verdictCode, label] = VERDICT_MAP.find(([min]) => score >= min) ?? VERDICT_MAP[VERDICT_MAP.length - 1];

  const summaries: Record<VerdictCode, string> = {
    strong_buy: 'Strong signals across valuation, location, and risk. Prioritise this property.',
    good_buy: 'Positive signals overall. A well-priced property in a sound location.',
    promising_verify: 'Good potential, but check the flagged concerns before proceeding.',
    fair_weak_fit: 'Pricing is fair but notable concerns need review before committing.',
    watch_dont_rush: 'Hold position and monitor. Conditions may improve.',
    avoid_unless_drops: 'Multiple concerns present. Only worth pursuing at a lower price.',
    not_recommended: 'Significant concerns across multiple dimensions. Proceed with caution.',
  };

  return { score, label, verdictCode, summary: summaries[verdictCode] };
}

export function buildScores(result: FullAnalysisResult): ReportScores {
  const vr = result.valuationReport;
  const nr = result.neighbourhoodReport;
  const rr = result.riskReport;

  const valuation = calcValuationScore(
    vr.askingPrice,
    vr.fairValueCentral,
    vr.comparablesCount,
  );

  const neighbourhood = calcNeighbourhoodScore(
    nr.crime?.perMonthAverage ?? null,
    nr.floodRisk?.zone3HighRisk ?? false,
    nr.floodRisk?.zone2MediumRisk ?? false,
    nr.environment.unemploymentRate,
  );

  const risk = calcRiskScore(rr.risks);
  const overall = calcOverallScore(valuation, neighbourhood, risk);

  return { valuation, neighbourhood, risk, overall };
}

// ─── Verdict display helpers ──────────────────────────────────────────────────

export function verdictColor(code: VerdictCode): string {
  switch (code) {
    case 'strong_buy':
    case 'good_buy':
      return 'text-pe-green';
    case 'promising_verify':
    case 'fair_weak_fit':
      return 'text-cyan';
    case 'watch_dont_rush':
      return 'text-gold';
    case 'avoid_unless_drops':
    case 'not_recommended':
      return 'text-pe-red';
  }
}

export function verdictBg(code: VerdictCode): string {
  switch (code) {
    case 'strong_buy':
    case 'good_buy':
      return 'bg-pe-green/10 border-pe-green/30 text-pe-green';
    case 'promising_verify':
    case 'fair_weak_fit':
      return 'bg-cyan/10 border-cyan/30 text-cyan';
    case 'watch_dont_rush':
      return 'bg-gold/10 border-gold/30 text-gold';
    case 'avoid_unless_drops':
    case 'not_recommended':
      return 'bg-pe-red/10 border-pe-red/30 text-pe-red';
  }
}

export function scoreColor(score: number): string {
  if (score >= 70) return 'text-pe-green';
  if (score >= 50) return 'text-cyan';
  if (score >= 35) return 'text-gold';
  return 'text-pe-red';
}

export function scoreBarColor(score: number): string {
  if (score >= 70) return 'bg-pe-green';
  if (score >= 50) return 'bg-cyan';
  if (score >= 35) return 'bg-gold';
  return 'bg-pe-red';
}

export function confidenceColor(c: string): string {
  switch (c) {
    case 'high': return 'text-pe-green bg-pe-green/10 border-pe-green/30';
    case 'medium': return 'text-gold bg-gold/10 border-gold/30';
    default: return 'text-pe-red bg-pe-red/10 border-pe-red/30';
  }
}

export function riskSeverityColor(s: RiskSeverity): string {
  switch (s) {
    case 'none': return 'text-pe-green bg-pe-green/10 border-pe-green/30';
    case 'low': return 'text-cyan bg-cyan/10 border-cyan/30';
    case 'medium': return 'text-gold bg-gold/10 border-gold/30';
    case 'high': return 'text-pe-red bg-pe-red/10 border-pe-red/30';
    case 'critical': return 'text-white bg-pe-red border-pe-red';
  }
}
