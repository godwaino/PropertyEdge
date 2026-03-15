import { useState } from 'react';
import { PropertyInput } from '../types/property';

interface Props {
  onSubmit: (property: PropertyInput) => void;
  isLoading: boolean;
}

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
  'w-full bg-navy-light border border-navy-border rounded-lg pl-9 pr-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan/30 transition-all group-focus-within:border-cyan/60';

const selectBase =
  'w-full bg-navy-light border border-navy-border rounded-lg pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan/30 transition-all appearance-none cursor-pointer';

export default function PropertyForm({ onSubmit, isLoading }: Props) {
  const [tenure, setTenure] = useState('leasehold');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const property: PropertyInput = {
      address: fd.get('address') as string,
      postcode: fd.get('postcode') as string,
      askingPrice: Number(fd.get('askingPrice')),
      propertyType: fd.get('propertyType') as string,
      bedrooms: Number(fd.get('bedrooms')),
      sizeSqm: Number(fd.get('sizeSqm')),
      yearBuilt: Number(fd.get('yearBuilt')),
      tenure,
    };

    if (tenure === 'leasehold') {
      property.serviceCharge = Number(fd.get('serviceCharge')) || 0;
      property.groundRent = Number(fd.get('groundRent')) || 0;
      property.leaseYears = Number(fd.get('leaseYears')) || 99;
    }

    onSubmit(property);
  };

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
            <p className="text-xs text-slate-500">Enter the property information for analysis</p>
          </div>
        </div>
      </div>

      <div className="p-6">
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
                <input name="address" className={inputBase} defaultValue="10 Deansgate" placeholder="Street address" required />
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
                <input name="postcode" className={inputBase} defaultValue="M3 4LQ" placeholder="e.g. M3 4LQ" required />
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
                    <path d="M12 2v2m0 16v2M6.34 6.34l-1.41-1.41m14.14 14.14l-1.41-1.41M4 12H2m20 0h-2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </FieldIcon>
                <input name="askingPrice" type="number" className={inputBase} defaultValue={285000} required />
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
                <select name="propertyType" className={selectBase} defaultValue="flat">
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
                <input name="bedrooms" type="number" className={inputBase} defaultValue={2} min={1} max={10} required />
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
                <input name="sizeSqm" type="number" className={inputBase} defaultValue={85} required />
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
                <input name="yearBuilt" type="number" className={inputBase} defaultValue={2019} required />
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

          {/* Tenure toggle */}
          <div className="inline-flex rounded-lg border border-navy-border p-0.5 bg-navy/60 gap-0.5 mb-4">
            {['leasehold', 'freehold'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTenure(t)}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                  tenure === t
                    ? 'bg-cyan/15 text-cyan border border-cyan/25 shadow-glow-cyan-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Leasehold fields */}
          {tenure === 'leasehold' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
              <FormField label="Service Charge" hint="(£/yr)">
                <div className="relative group">
                  <FieldIcon>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </FieldIcon>
                  <input name="serviceCharge" type="number" className={inputBase} defaultValue={1200} />
                </div>
              </FormField>

              <FormField label="Ground Rent" hint="(£/yr)">
                <div className="relative group">
                  <FieldIcon>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </FieldIcon>
                  <input name="groundRent" type="number" className={inputBase} defaultValue={250} />
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
                  <input name="leaseYears" type="number" className={inputBase} defaultValue={999} />
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
          {/* Shine effect */}
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
                  <path d="M9.5 3.5L5 8l4.5 4.5M14.5 20.5L19 16l-4.5-4.5M5 8h14M19 16H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
