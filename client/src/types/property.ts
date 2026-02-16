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
}

export interface NegotiationData {
  offer_low: number;
  offer_high: number;
  walk_away: number;
  reasoning: string;
}

export interface AnalysisResult {
  valuation: { amount: number; confidence: number; basis?: string };
  verdict: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED';
  savings: number;
  summary?: string;
  comparables_used?: number;
  comparables?: ComparableSale[];
  negotiation?: NegotiationData;
  red_flags: AnalysisItem[];
  warnings: AnalysisItem[];
  positives: AnalysisItem[];
}
