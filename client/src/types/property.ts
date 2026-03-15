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

export interface DataSources {
  landRegistry: { total: number; sameType: number; avgPrice: number | null } | null;
  epc: boolean;
  postcode: boolean;
  crime: { total: number; months: number } | null;
  floodRisk: { zone3: boolean; zone2: boolean } | null;
  unemployment: { rate: number; area: string } | null;
}

export interface AnalysisResult {
  valuation: { amount: number; confidence: number };
  verdict: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED';
  savings: number;
  red_flags: AnalysisItem[];
  warnings: AnalysisItem[];
  positives: AnalysisItem[];
  dataSources?: DataSources;
}
