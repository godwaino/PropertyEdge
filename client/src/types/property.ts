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

export interface AnalysisResult {
  valuation: { amount: number; confidence: number; basis?: string };
  verdict: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED';
  savings: number;
  red_flags: AnalysisItem[];
  warnings: AnalysisItem[];
  positives: AnalysisItem[];
}
