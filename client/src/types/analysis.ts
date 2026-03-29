// ─── Core enums ───────────────────────────────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low';

export type VerdictCode =
  | 'strong_buy'
  | 'good_buy'
  | 'promising_verify'
  | 'fair_weak_fit'
  | 'watch_dont_rush'
  | 'avoid_unless_drops'
  | 'not_recommended';

export type PricingVerdict =
  | 'excellent_value'
  | 'good_value'
  | 'fair'
  | 'slightly_stretched'
  | 'overpriced'
  | 'significantly_overpriced';

export type RiskSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

// ─── Scores ───────────────────────────────────────────────────────────────────

export interface ScoreResult {
  score: number; // 0–100
  confidence: Confidence;
  label: string;
}

export interface OverallScore {
  score: number;
  label: string;
  verdictCode: VerdictCode;
  summary: string; // 1–2 sentence rationale
}

export interface ReportScores {
  valuation: ScoreResult;
  neighbourhood: ScoreResult;
  risk: ScoreResult;
  overall: OverallScore;
}

// ─── Valuation ────────────────────────────────────────────────────────────────

export interface Comparable {
  address: string;
  price: number;
  date: string;
  propertyType: string;
  tenure: string;
  newBuild: boolean;
}

export interface ValuationReport {
  askingPrice: number;
  fairValueLow: number;
  fairValueCentral: number;
  fairValueHigh: number;
  pricingVerdict: PricingVerdict;
  pricingVerdictLabel: string;
  confidenceScore: number;
  confidenceLabel: string;
  comparables: Comparable[];
  comparablesCount: number;
  negotiationAngles: string[];
  valuationNarrative: string;
  marketContextNote: string;
  savings: number; // positive = below asking, negative = above
}

// ─── Neighbourhood ────────────────────────────────────────────────────────────

export interface CrimeData {
  totalLast3Months: number;
  perMonthAverage: number;
  topCategories: Array<{ category: string; count: number }>;
  contextNote: string;
  dataMonths: number;
}

export interface FloodData {
  zone3HighRisk: boolean;
  zone2MediumRisk: boolean;
  label: string;
  severity: RiskSeverity;
}

export interface EnvironmentData {
  unemploymentRate: number | null;
  unemploymentArea: string | null;
  epcRating: string | null;
  floorAreaSqM: number | null;
}

export interface NeighbourhoodReport {
  postcode: string;
  region: string;
  adminDistrict: string;
  lat: number | null;
  lng: number | null;
  crime: CrimeData | null;
  floodRisk: FloodData | null;
  environment: EnvironmentData;
  characterNarrative: string;
}

// ─── Risks ────────────────────────────────────────────────────────────────────

export interface RiskItem {
  category: 'flood' | 'crime' | 'leasehold' | 'environmental' | 'market' | 'structural' | 'connectivity' | 'area';
  severity: RiskSeverity;
  label: string;
  explanation: string;
  source: string;
  recommendedAction: string;
  resolved: boolean;
}

export interface RiskReport {
  risks: RiskItem[];
  criticalRiskFound: boolean;
  riskNarrative: string;
}

// ─── Analysis items (legacy-compatible) ───────────────────────────────────────

export interface AnalysisItem {
  title: string;
  description: string;
  impact: number;
}

// ─── Next steps ───────────────────────────────────────────────────────────────

export interface NextSteps {
  primaryRecommendation: string;
  actionList: string[];
  viewingChecklist: string[];
  agentQuestions: string[];
  negotiationPrompts: string[];
  unresolvedChecks: string[];
}

// ─── Data sources ─────────────────────────────────────────────────────────────

export interface DataSources {
  landRegistry: { total: number; sameType: number; avgPrice: number | null } | null;
  epc: boolean;
  postcode: boolean;
  crime: { total: number; months: number } | null;
  floodRisk: { zone3: boolean; zone2: boolean } | null;
  unemployment: { rate: number; area: string } | null;
}

// ─── Full analysis result ─────────────────────────────────────────────────────

export interface FullAnalysisResult {
  analysisId: string;
  status: 'complete' | 'partial';
  demoMode: boolean;

  scores: ReportScores;
  valuationReport: ValuationReport;
  neighbourhoodReport: NeighbourhoodReport;
  riskReport: RiskReport;
  nextSteps: NextSteps;

  // Legacy fields kept for backward-compat during transition
  valuation: { amount: number; confidence: number };
  verdict: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED';
  savings: number;
  red_flags: AnalysisItem[];
  warnings: AnalysisItem[];
  positives: AnalysisItem[];
  dataSources?: DataSources;

  generatedAt: string;
  dataFreshnessWarnings: string[];
  missingDataFlags: string[];
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export type ShortlistStatus =
  | 'active'
  | 'watching'
  | 'viewing_booked'
  | 'offer_pending'
  | 'rejected'
  | 'archived';

export interface ShortlistEntry {
  propertyId: string;
  analysisId: string;
  address: string;
  postcode: string;
  askingPrice: number;
  propertyType: string;
  bedrooms: number;
  addedAt: string;
  status: ShortlistStatus;
  priority: number;
  scoreSnapshot: {
    overall: number;
    label: string;
    verdictCode: VerdictCode;
  } | null;
  analysis: FullAnalysisResult | null;
}
