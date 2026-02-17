import { PropertyInput } from '../types/property';

export interface FeaturedProperty {
  label: string;
  location: string;
  verdict: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED';
  askingPrice: number;
  valuation: number;
  flag: string;
  positive: string;
  property: PropertyInput;
}

export const FEATURED: FeaturedProperty[] = [
  {
    label: '2-bed flat, Deansgate',
    location: 'Manchester M3',
    verdict: 'OVERPRICED',
    askingPrice: 310000,
    valuation: 275000,
    flag: 'Service charge 22% above area avg',
    positive: 'Modern build with NHBC warranty',
    property: {
      address: '15 Deansgate Square',
      postcode: 'M3 4LQ',
      askingPrice: 310000,
      propertyType: 'flat',
      bedrooms: 2,
      sizeSqm: 72,
      yearBuilt: 2019,
      tenure: 'leasehold',
      serviceCharge: 2400,
      groundRent: 300,
      leaseYears: 250,
    },
  },
  {
    label: '3-bed Victorian terrace',
    location: 'Bristol BS3',
    verdict: 'GOOD_DEAL',
    askingPrice: 385000,
    valuation: 410000,
    flag: 'Dated electrics need rewiring',
    positive: 'Sought-after Southville catchment',
    property: {
      address: '42 North Street, Southville',
      postcode: 'BS3 1HJ',
      askingPrice: 385000,
      propertyType: 'terraced',
      bedrooms: 3,
      sizeSqm: 95,
      yearBuilt: 1895,
      tenure: 'freehold',
    },
  },
  {
    label: '1-bed flat, Canary Wharf',
    location: 'London E14',
    verdict: 'FAIR',
    askingPrice: 425000,
    valuation: 420000,
    flag: 'Lease 115 yrs — extension needed in 30 yrs',
    positive: 'Strong rental yield area (5.2%)',
    property: {
      address: '8 Millharbour',
      postcode: 'E14 9TS',
      askingPrice: 425000,
      propertyType: 'flat',
      bedrooms: 1,
      sizeSqm: 52,
      yearBuilt: 2005,
      tenure: 'leasehold',
      serviceCharge: 3200,
      groundRent: 400,
      leaseYears: 115,
    },
  },
  {
    label: '4-bed detached',
    location: 'Leeds LS17',
    verdict: 'OVERPRICED',
    askingPrice: 550000,
    valuation: 485000,
    flag: 'Near flood monitoring zone',
    positive: 'Large plot with extension potential',
    property: {
      address: '7 Alwoodley Lane',
      postcode: 'LS17 7DR',
      askingPrice: 550000,
      propertyType: 'detached',
      bedrooms: 4,
      sizeSqm: 155,
      yearBuilt: 1965,
      tenure: 'freehold',
    },
  },
  {
    label: '2-bed semi, Chorlton',
    location: 'Manchester M21',
    verdict: 'GOOD_DEAL',
    askingPrice: 295000,
    valuation: 315000,
    flag: 'Single glazed bay windows',
    positive: 'Prices up 4.2% annually in M21',
    property: {
      address: '31 Beech Road',
      postcode: 'M21 9FL',
      askingPrice: 295000,
      propertyType: 'semi-detached',
      bedrooms: 2,
      sizeSqm: 78,
      yearBuilt: 1930,
      tenure: 'freehold',
    },
  },
  {
    label: 'New-build 2-bed flat',
    location: 'Birmingham B1',
    verdict: 'FAIR',
    askingPrice: 265000,
    valuation: 258000,
    flag: 'Ground rent doubles every 15 yrs',
    positive: '10-year NHBC + HS2 regeneration',
    property: {
      address: '1 Broad Street',
      postcode: 'B1 2HF',
      askingPrice: 265000,
      propertyType: 'flat',
      bedrooms: 2,
      sizeSqm: 62,
      yearBuilt: 2023,
      tenure: 'leasehold',
      serviceCharge: 1800,
      groundRent: 250,
      leaseYears: 999,
    },
  },
];

const verdictStyles: Record<string, { bg: string; text: string; label: string }> = {
  GOOD_DEAL: { bg: 'bg-cyan/10 border-cyan/30', text: 'text-cyan', label: 'Good Deal' },
  FAIR: { bg: 'bg-gold/10 border-gold/30', text: 'text-gold', label: 'Fair' },
  OVERPRICED: { bg: 'bg-pe-red/10 border-pe-red/30', text: 'text-pe-red', label: 'Overpriced' },
};

function fmt(n: number): string {
  return '£' + n.toLocaleString();
}

interface Props {
  onSelect: (property: PropertyInput) => void;
  visible: boolean;
}

export default function FeaturedProperties({ onSelect, visible }: Props) {
  if (!visible) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 pb-10 animate-slide-up">
      <div className="text-center mb-5">
        <p className="text-th-muted text-[10px] uppercase tracking-wider mb-1">Example properties</p>
        <h3 className="text-th-heading text-lg font-semibold">Featured Properties</h3>
        <p className="text-th-muted text-xs mt-1">Click any card to run a full live analysis</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURED.map((fp, i) => {
          const v = verdictStyles[fp.verdict];
          const diff = fp.askingPrice - fp.valuation;
          return (
            <button
              key={i}
              onClick={() => onSelect(fp.property)}
              className="bg-th-card border border-th-border rounded-2xl p-4 text-left hover:border-th-muted hover:shadow-lg transition-all group"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-th-heading text-sm font-semibold truncate group-hover:text-cyan transition-colors">{fp.label}</p>
                  <p className="text-th-muted text-xs">{fp.location}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${v.bg} ${v.text}`}>
                  {v.label}
                </span>
              </div>

              {/* Price row */}
              <div className="flex items-baseline gap-3 mb-3">
                <div>
                  <p className="text-th-muted text-[10px]">Asking</p>
                  <p className="text-th-heading text-sm font-bold">{fmt(fp.askingPrice)}</p>
                </div>
                <div>
                  <p className="text-th-muted text-[10px]">Est. value</p>
                  <p className={`text-sm font-bold ${v.text}`}>{fmt(fp.valuation)}</p>
                </div>
                {diff !== 0 && (
                  <p className={`text-[11px] font-medium ml-auto ${diff > 0 ? 'text-pe-red' : 'text-cyan'}`}>
                    {diff > 0 ? '+' : ''}{fmt(diff)}
                  </p>
                )}
              </div>

              {/* Flag + positive */}
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pe-red mt-1.5 flex-shrink-0" />
                  <p className="text-th-secondary text-[11px] leading-snug">{fp.flag}</p>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan mt-1.5 flex-shrink-0" />
                  <p className="text-th-secondary text-[11px] leading-snug">{fp.positive}</p>
                </div>
              </div>

              {/* CTA hint */}
              <p className="text-th-faint text-[10px] mt-3 group-hover:text-th-secondary transition-colors text-center">
                Click to analyse
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
