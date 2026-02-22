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
      address: '15 Deansgate Square', postcode: 'M3 4LQ', askingPrice: 310000,
      propertyType: 'flat', bedrooms: 2, sizeSqm: 72, yearBuilt: 2019,
      tenure: 'leasehold', serviceCharge: 2400, groundRent: 300, leaseYears: 250,
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
      address: '42 North Street, Southville', postcode: 'BS3 1HJ', askingPrice: 385000,
      propertyType: 'terraced', bedrooms: 3, sizeSqm: 95, yearBuilt: 1895, tenure: 'freehold',
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
      address: '8 Millharbour', postcode: 'E14 9TS', askingPrice: 425000,
      propertyType: 'flat', bedrooms: 1, sizeSqm: 52, yearBuilt: 2005,
      tenure: 'leasehold', serviceCharge: 3200, groundRent: 400, leaseYears: 115,
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
      address: '7 Alwoodley Lane', postcode: 'LS17 7DR', askingPrice: 550000,
      propertyType: 'detached', bedrooms: 4, sizeSqm: 155, yearBuilt: 1965, tenure: 'freehold',
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
      address: '31 Beech Road', postcode: 'M21 9FL', askingPrice: 295000,
      propertyType: 'semi-detached', bedrooms: 2, sizeSqm: 78, yearBuilt: 1930, tenure: 'freehold',
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
      address: '1 Broad Street', postcode: 'B1 2HF', askingPrice: 265000,
      propertyType: 'flat', bedrooms: 2, sizeSqm: 62, yearBuilt: 2023,
      tenure: 'leasehold', serviceCharge: 1800, groundRent: 250, leaseYears: 999,
    },
  },
];

const VERDICT = {
  GOOD_DEAL: { dot: 'bg-cyan', badge: 'text-cyan bg-cyan/10 border-cyan/25', topBar: 'from-cyan/20', label: '✓ Good deal' },
  FAIR:      { dot: 'bg-gold', badge: 'text-gold bg-gold/10 border-gold/25', topBar: 'from-gold/15', label: '~ Fair price' },
  OVERPRICED:{ dot: 'bg-pe-red', badge: 'text-pe-red bg-pe-red/10 border-pe-red/25', topBar: 'from-pe-red/15', label: '↑ Overpriced' },
};

function fmt(n: number) { return '£' + n.toLocaleString(); }

interface Props {
  onSelect: (property: PropertyInput) => void;
  visible: boolean;
}

export default function FeaturedProperties({ onSelect, visible }: Props) {
  if (!visible) return null;

  return (
    <section className="max-w-5xl mx-auto px-5 py-12 animate-float-in">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-th-heading text-xl font-bold tracking-tight">Try an example</h2>
          <p className="text-th-muted text-sm mt-0.5">Click any card to run a live analysis</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-th-faint">
          {(['GOOD_DEAL', 'FAIR', 'OVERPRICED'] as const).map((v) => (
            <span key={v} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${VERDICT[v].dot}`} />
              {VERDICT[v].label.split(' ').slice(1).join(' ')}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURED.map((fp, i) => {
          const v = VERDICT[fp.verdict];
          const diff = fp.askingPrice - fp.valuation;
          const diffPct = Math.round(Math.abs(diff) / fp.valuation * 100);
          return (
            <button
              key={i}
              onClick={() => onSelect(fp.property)}
              className="group relative bg-th-card border border-th-border rounded-2xl overflow-hidden text-left hover:border-th-muted hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/8 transition-all duration-200 elevation-1"
            >
              {/* Coloured top accent bar */}
              <div className={`h-1 w-full bg-gradient-to-r ${v.topBar} to-transparent`} />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-th-heading text-sm font-semibold leading-tight group-hover:text-cyan transition-colors truncate">
                      {fp.label}
                    </p>
                    <p className="text-th-muted text-xs mt-0.5">{fp.location}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${v.badge}`}>
                    {v.label}
                  </span>
                </div>

                {/* Price comparison */}
                <div className="bg-th-surface rounded-xl p-3 mb-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-th-faint text-[10px] uppercase tracking-wide mb-0.5">Asking</p>
                      <p className="text-th-heading text-base font-bold">{fmt(fp.askingPrice)}</p>
                    </div>
                    <div className="text-center px-2">
                      <div className={`text-xs font-bold ${diff > 0 ? 'text-pe-red' : 'text-cyan'}`}>
                        {diff > 0 ? '▲' : '▼'} {diffPct}%
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-th-faint text-[10px] uppercase tracking-wide mb-0.5">Est. value</p>
                      <p className={`text-base font-bold ${diff > 0 ? 'text-pe-red' : 'text-cyan'}`}>
                        {fmt(fp.valuation)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signals */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-pe-red text-[10px] font-bold flex-shrink-0">⚠</span>
                    <p className="text-th-secondary text-[11px] leading-snug">{fp.flag}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-cyan text-[10px] font-bold flex-shrink-0">✓</span>
                    <p className="text-th-secondary text-[11px] leading-snug">{fp.positive}</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-4 flex items-center justify-end gap-1 text-th-faint group-hover:text-cyan transition-colors">
                  <span className="text-[11px] font-medium">Analyse this property</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
