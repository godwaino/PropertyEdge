import { useState } from 'react';
import { Search, Home, Building, ChevronDown } from 'lucide-react';
import { PropertyInput } from '../types/property';

interface Props {
  onSubmit: (data: PropertyInput) => void;
  isLoading: boolean;
}

const TEST_PROPERTY: PropertyInput = {
  address: 'Flat 4B, 123 Deansgate',
  postcode: 'M3 4LZ',
  askingPrice: 285000,
  propertyType: 'flat',
  bedrooms: 2,
  sizeSqm: 85,
  yearBuilt: 2019,
  tenure: 'leasehold',
  serviceCharge: 1200,
  groundRent: 250,
  leaseYears: 999,
};

export default function PropertyForm({ onSubmit, isLoading }: Props) {
  const [form, setForm] = useState<PropertyInput>({
    address: '',
    postcode: '',
    askingPrice: 0,
    propertyType: 'flat',
    bedrooms: 2,
    sizeSqm: 0,
    yearBuilt: 2000,
    tenure: 'freehold',
    serviceCharge: 0,
    groundRent: 0,
    leaseYears: 0,
  });

  const update = (field: keyof PropertyInput, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const loadTestData = () => {
    setForm(TEST_PROPERTY);
  };

  const inputClass =
    'w-full bg-navy-lighter border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan" />
              Property Details
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Enter the property information for AI analysis
            </p>
          </div>
          <button
            type="button"
            onClick={loadTestData}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:text-cyan hover:border-cyan transition-colors"
          >
            Load Demo
          </button>
        </div>

        {/* Address & Postcode */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Address</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Flat 4B, 123 Deansgate"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Postcode</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. M3 4LZ"
              value={form.postcode}
              onChange={(e) => update('postcode', e.target.value.toUpperCase())}
              required
            />
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <label className={labelClass}>Asking Price (£)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
              £
            </span>
            <input
              type="number"
              className={`${inputClass} pl-8`}
              placeholder="285,000"
              value={form.askingPrice || ''}
              onChange={(e) => update('askingPrice', Number(e.target.value))}
              required
              min={1}
            />
          </div>
        </div>

        {/* Type, Beds, Size, Year */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className={labelClass}>Property Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => update('propertyType', 'flat')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg border text-sm font-medium transition-all ${
                  form.propertyType === 'flat'
                    ? 'border-cyan bg-cyan/10 text-cyan'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <Building className="w-4 h-4" />
                Flat
              </button>
              <button
                type="button"
                onClick={() => update('propertyType', 'house')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg border text-sm font-medium transition-all ${
                  form.propertyType === 'house'
                    ? 'border-cyan bg-cyan/10 text-cyan'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <Home className="w-4 h-4" />
                House
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Bedrooms</label>
            <div className="relative">
              <select
                className={`${inputClass} appearance-none cursor-pointer`}
                value={form.bedrooms}
                onChange={(e) => update('bedrooms', Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} bed
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Size (sqm)</label>
            <input
              type="number"
              className={inputClass}
              placeholder="85"
              value={form.sizeSqm || ''}
              onChange={(e) => update('sizeSqm', Number(e.target.value))}
              required
              min={1}
            />
          </div>
          <div>
            <label className={labelClass}>Year Built</label>
            <input
              type="number"
              className={inputClass}
              placeholder="2019"
              value={form.yearBuilt || ''}
              onChange={(e) => update('yearBuilt', Number(e.target.value))}
              required
              min={1800}
              max={2026}
            />
          </div>
        </div>

        {/* Tenure */}
        <div className="mb-4">
          <label className={labelClass}>Tenure</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update('tenure', 'freehold')}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                form.tenure === 'freehold'
                  ? 'border-pe-green bg-pe-green/10 text-pe-green'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              Freehold
            </button>
            <button
              type="button"
              onClick={() => update('tenure', 'leasehold')}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                form.tenure === 'leasehold'
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              Leasehold
            </button>
          </div>
        </div>

        {/* Leasehold Fields */}
        {form.tenure === 'leasehold' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 rounded-xl bg-navy/50 border border-gold/20 animate-fade-in">
            <div>
              <label className={labelClass}>
                Service Charge (£/yr)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <input
                  type="number"
                  className={`${inputClass} pl-8`}
                  placeholder="1,200"
                  value={form.serviceCharge || ''}
                  onChange={(e) =>
                    update('serviceCharge', Number(e.target.value))
                  }
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Ground Rent (£/yr)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <input
                  type="number"
                  className={`${inputClass} pl-8`}
                  placeholder="250"
                  value={form.groundRent || ''}
                  onChange={(e) =>
                    update('groundRent', Number(e.target.value))
                  }
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Lease Remaining (years)
              </label>
              <input
                type="number"
                className={inputClass}
                placeholder="999"
                value={form.leaseYears || ''}
                onChange={(e) =>
                  update('leaseYears', Number(e.target.value))
                }
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-cyan to-cyan-dark text-navy font-bold text-lg tracking-wide hover:shadow-lg hover:shadow-cyan/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full spinner" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Analyze Property
            </>
          )}
        </button>
      </div>
    </form>
  );
}
