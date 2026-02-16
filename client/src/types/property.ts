export interface PropertyInput {
  address: string;
  postcode: string;
  askingPrice: number;
  propertyType: 'flat' | 'house';
  bedrooms: number;
  sizeSqm: number;
  yearBuilt: number;
  tenure: 'freehold' | 'leasehold';
  serviceCharge?: number;
  groundRent?: number;
  leaseYears?: number;
}

export interface Finding {
  title: string;
  description: string;
  impact: number;
}

export interface AnalysisResult {
  valuation: {
    amount: number;
    confidence: number;
  };
  verdict: 'FAIR' | 'GOOD_DEAL' | 'OVERPRICED';
  savings: number;
  red_flags: Finding[];
  warnings: Finding[];
  positives: Finding[];
}
