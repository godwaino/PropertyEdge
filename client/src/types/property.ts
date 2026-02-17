export interface PropertyInput {
  address: string;
  postcode: string;
  askingPrice: number;
  propertyType: string;
  bedrooms: number;
  sizeSqm: number;
  yearBuilt: number;
  tenure: string;
  serviceCharge?: number;
  groundRent?: number;
  leaseYears?: number;
}

export interface AnalysisItem {
  title: string;
  description: string;
  impact: number;
}

export interface ComparableSale {
  price: number;
  date: string;
  address: string;
  propertyType: string;
  distance?: number;       // miles from subject property
  similarity?: number;     // 0-100 score
  excluded?: boolean;      // true if outlier
  excludeReason?: string;  // e.g. "Extreme outlier (farm)"
  epcRating?: string;      // e.g. "C"
  floorArea?: number;      // sqm from EPC
  pricePsm?: number;       // £/sqm derived
}

export interface NegotiationData {
  offer_low: number;
  offer_high: number;
  walk_away: number;
  reasoning: string;
  negotiation_points?: string[];  // Top 3 evidence-backed talking points
}

export interface FloodRiskData {
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very Low';
  activeWarnings: number;
  nearestStation?: string;
  description: string;
}

export interface HousePriceIndexData {
  averagePrice: number;
  annualChange: number;
  monthlyChange: number;
  salesVolume?: number;
  region: string;
  period: string;
}

export interface PlanningApplication {
  reference: string;
  address: string;
  description: string;
  status: string;
  decisionDate?: string;
  url?: string;
}

export interface PlanningData {
  total: number;
  recent: PlanningApplication[];
  largeDevelopments: number;
}

export interface AreaData {
  epcSummary?: { averageRating: string; averageFloorArea: number; totalCerts: number };
  crimeRate?: { total: number; topCategory: string; level: string };
  floodRisk?: FloodRiskData;
  housePriceIndex?: HousePriceIndexData;
  planning?: PlanningData;
}

export interface AnalysisResult {
  valuation: {
    amount: number;
    confidence: number;
    basis?: string;
    confidence_drivers?: string[];  // why confidence is high/low
  };
  verdict: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED';
  savings: number;
  summary?: string;
  comparables_used?: number;
  comparables?: ComparableSale[];
  negotiation?: NegotiationData;
  red_flags: AnalysisItem[];
  warnings: AnalysisItem[];
  positives: AnalysisItem[];
  area_data?: AreaData;
  data_sources?: string[];  // list of sources used in this analysis
}
