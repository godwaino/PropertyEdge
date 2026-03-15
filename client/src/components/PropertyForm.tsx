import { useState } from 'react';
import { PropertyInput } from '../types/property';

interface Props {
  onSubmit: (property: PropertyInput) => void;
  isLoading: boolean;
}

interface FormState {
  address: string;
  postcode: string;
  askingPrice: string;
  propertyType: string;
  bedrooms: string;
  sizeSqm: string;
  yearBuilt: string;
  tenure: string;
  serviceCharge: string;
  groundRent: string;
  leaseYears: string;
}

const DEFAULTS: FormState = {
  address: '10 Deansgate',
  postcode: 'M3 4LQ',
  askingPrice: '285000',
  propertyType: 'flat',
  bedrooms: '2',
  sizeSqm: '85',
  yearBuilt: '2019',
  tenure: 'leasehold',
  serviceCharge: '1200',
  groundRent: '250',
  leaseYears: '999',
};

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan transition-colors pointer-events-none">
      {children}
    </span>
  );
}

function FormField({
  label,
  hint,
  children,
  fullWidth,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-400 mb-1.5 tracking-wide uppercase">
        {label}
        {hint && <span className="ml-1 text-slate-600 normal-case">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputBase =
  'w-full bg-navy-light border border-navy-border rounded-lg pl-9 pr-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan/30 transition-all';

const selectBase =
  'w-full bg-navy-light border border-navy-border rounded-lg pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan/30 transition-all appearance-none cursor-pointer';

export default function PropertyForm({ onSubmit, isLoading }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [listingUrl, setListingUrl] = useState('');
  const [parseStatus, setParseStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [parseError, setParseError] = useState('');
  const [filledFields, setFilledFields] = useState<Set<string>>(new Set());

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleImport = async () => {
    if (!listingUrl.trim()) return;
    setParseStatus('loading');
    setParseError('');
    setFilledFields(new Set());
    try {
      const res = await fetch('/api/parse-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: listingUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse listing');

      const filled = new Set<string>();
      setForm((prev) => {
        const next = { ...prev };
        if (data.address) { next.address = data.address; filled.add('address'); }
        if (data.postcode) { next.postcode = data.postcode; filled.add('postcode'); }
        if (data.askingPrice) { next.askingPrice = String(data.askingPrice); filled.add('askingPrice'); }
        if (data.propertyType) { next.propertyType = data.propertyType; filled.add('propertyType'); }
        if (data.bedrooms) { next.bedrooms = String(data.bedrooms); filled.add('bedrooms'); }
        if (data.sizeSqm) { next.sizeSqm = String(data.sizeSqm); filled.add('sizeSqm'); }
        if (data.yearBuilt) { next.yearBuilt = String(data.yearBuilt); filled.add('yearBuilt'); }
        if (data.tenure) { next.tenure = data.tenure; filled.add('tenure'); }
        if (data.serviceCharge) { next.serviceCharge = String(data.serviceCharge); filled.add('serviceCharge'); }
        if (data.groundRent) { next.groundRent = String(data.groundRent); filled.add('groundRent'); }
        if (data.leaseYears) { next.leaseYears = String(data.leaseYears); filled.add('leaseYears'); }
        return next;
      });
      setFilledFields(filled);
      setParseStatus(filled.size > 0 ? 'success' : 'error');
      if (filled.size === 0) setParseError('No data could be extracted. The site may be blocking access.');
    } catch (err: any) {
      setParseStatus('error');
      setParseError(err.message || 'Failed to parse listing');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const property: PropertyInput = {
      address: form.address,
      postcode: form.postcode,
      askingPrice: Number(form.askingPrice),
      propertyType: form.propertyType,
      bedrooms: Number(form.bedrooms),
      sizeSqm: Number(form.sizeSqm),
      yearBuilt: Number(form.yearBuilt),
      tenure: form.tenure,
    };
    if (form.tenure === 'leasehold') {
      property.serviceCharge = Number(form.serviceCharge) || 0;
      property.groundRent = Number(form.groundRent) || 0;
      property.leaseYears = Number(form.leaseYears) || 99;
    }
    onSubmit(property);
  };

  const highlightClass = (field: string) =>
    filledFields.has(field) ? 'border-pe-green/60 ring-1 ring-pe-green/20' : '';

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto glass-card rounded-2xl overflow-hidden"
    >
      {/* Form header */}
      <div className="px-6 pt-6 pb-4 border-b border-navy-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-cyan">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Property Details</h2>
            <p className="text-xs text-slate-500">Enter details manually or import from a listing URL</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* URL Import */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-4 h-px bg-slate-700 inline-block" />
            Import from Listing
            <span className="flex-1 h-px bg-slate-800 inline-block" />
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan transition-colors pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <input
                type="url"
                value={listingUrl}
                onChange={(e) => { setListingUrl(e.target.value); setParseStatus('idle'); }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleImport())}
                placeholder="Paste a Rightmove or Zoopla listing URL..."
                className={`${inputBase} ${parseStatus === 'success' ? 'border-pe-green/40' : parseStatus === 'error' ? 'border-pe-red/40' : ''}`}
              />
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={!listingUrl.trim() || parseStatus === 'loading'}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap flex items-center gap-2"
            >
              {parseStatus === 'loading' ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="40 20" />
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Import
                </>
              )}
            </button>
          </div>

          {parseStatus === 'success' && (
            <p className="mt-2 text-xs text-pe-green flex items-center gap-1.5 animate-fade-in">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {filledFields.size} field{filledFields.size !== 1 ? 's' : ''} imported — review and adjust below
            </p>
          )}
          {parseStatus === 'error' && (
            <p className="mt-2 text-xs text-pe-red flex items-center gap-1.5 animate-fade-in">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {parseError}
            </p>
          )}
        </div>

        {/* Section: Location */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-4 h-px bg-slate-700 inline-block" />
            Location
            <span className="flex-1 h-px bg-slate-800 inline-block" />
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Address" fullWidth>
              <div className="relative group">
                <FieldIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </FieldIcon>
                <input value={form.address} onChange={set('address')} className={`${inputBase} ${highlightClass('address')}`} placeholder="Street address" required />
              </div>
            </FormField>

            <FormField label="Postcode">
              <div className="relative group">
                <FieldIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M7 10h10M7 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </FieldIcon>
                <input value={form.postcode} onChange={set('postcode')} className={`${inputBase} ${highlightClass('postcode')}`} placeholder="e.g. M3 4LQ" required />
              </div>
            </FormField>
          </div>
        </div>

        {/* Section: Property */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-4 h-px bg-slate-700 inline-block" />
            Property
            <span className="flex-1 h-px bg-slate-800 inline-block" />
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Asking Price" hint="(£)">
              <div className="relative group">
                <FieldIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </FieldIcon>
                <input type="number" value={form.askingPrice} onChange={set('askingPrice')} className={`${inputBase} ${highlightClass('askingPrice')}`} required />
              </div>
            </FormField>

            <FormField label="Property Type">
              <div className="relative group">
                <FieldIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </FieldIcon>
                <select value={form.propertyType} onChange={set('propertyType')} className={`${selectBase} ${highlightClass('propertyType')}`}>
                  <option value="flat">Flat / Apartment</option>
                  <option value="terraced">Terraced House</option>
                  <option value="semi-detached">Semi-Detached</option>
                  <option value="detached">Detached</option>
                  <option value="bungalow">Bungalow</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
            </FormField>

            <FormField label="Bedrooms">
              <div className="relative group">
                <FieldIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M3 7v10M3 13h18M21 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <rect x="5" y="4" width="14" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </FieldIcon>
                <input type="number" value={form.bedrooms} onChange={set('bedrooms')} min={1} max={10} className={`${inputBase} ${highlightClass('bedrooms')}`} required />
              </div>
            </FormField>

            <FormField label="Size" hint="(sqm)">
              <div className="relative group">
                <FieldIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3 8h5M8 3v5M16 21v-5m5 5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </FieldIcon>
                <input type="number" value={form.sizeSqm} onChange={set('sizeSqm')} className={`${inputBase} ${highlightClass('sizeSqm')}`} required />
              </div>
            </FormField>

            <FormField label="Year Built">
              <div className="relative group">
                <FieldIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </FieldIcon>
                <input type="number" value={form.yearBuilt} onChange={set('yearBuilt')} className={`${inputBase} ${highlightClass('yearBuilt')}`} required />
              </div>
            </FormField>
          </div>
        </div>

        {/* Section: Tenure */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-4 h-px bg-slate-700 inline-block" />
            Tenure
            <span className="flex-1 h-px bg-slate-800 inline-block" />
          </p>

          <div className="inline-flex rounded-lg border border-navy-border p-0.5 bg-navy/60 gap-0.5 mb-4">
            {['leasehold', 'freehold'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, tenure: t }))}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                  form.tenure === t
                    ? 'bg-cyan/15 text-cyan border border-cyan/25 shadow-glow-cyan-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {form.tenure === 'leasehold' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
              <FormField label="Service Charge" hint="(£/yr)">
                <div className="relative group">
                  <FieldIcon>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </FieldIcon>
                  <input type="number" value={form.serviceCharge} onChange={set('serviceCharge')} className={`${inputBase} ${highlightClass('serviceCharge')}`} />
                </div>
              </FormField>

              <FormField label="Ground Rent" hint="(£/yr)">
                <div className="relative group">
                  <FieldIcon>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </FieldIcon>
                  <input type="number" value={form.groundRent} onChange={set('groundRent')} className={`${inputBase} ${highlightClass('groundRent')}`} />
                </div>
              </FormField>

              <FormField label="Lease Remaining" hint="(yrs)">
                <div className="relative group">
                  <FieldIcon>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </FieldIcon>
                  <input type="number" value={form.leaseYears} onChange={set('leaseYears')} className={`${inputBase} ${highlightClass('leaseYears')}`} />
                </div>
              </FormField>
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="px-6 pb-6">
        <button
          type="submit"
          disabled={isLoading}
          className="relative w-full py-3.5 rounded-xl font-semibold text-sm text-navy bg-cyan hover:bg-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all overflow-hidden group shadow-glow-cyan-sm hover:shadow-glow-cyan"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
          <span className="relative flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="40 20" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Analyze Property
              </>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}
