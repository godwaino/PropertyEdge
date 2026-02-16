import { useState } from 'react';
import { PropertyInput } from '../types/property';

interface Props {
  onSubmit: (property: PropertyInput) => void;
  isLoading: boolean;
}

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

  const inputClass =
    'w-full bg-navy-light border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan transition-colors';
  const labelClass = 'block text-gray-400 text-xs mb-1';

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto bg-navy-card border border-gray-800 rounded-2xl p-6"
    >
      <h2 className="text-lg font-semibold text-white mb-4">Property Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelClass}>Address</label>
          <input name="address" className={inputClass} defaultValue="10 Deansgate" required />
        </div>

        <div>
          <label className={labelClass}>Postcode</label>
          <input name="postcode" className={inputClass} defaultValue="M3 4LQ" required />
        </div>

        <div>
          <label className={labelClass}>Asking Price (£)</label>
          <input name="askingPrice" type="number" className={inputClass} defaultValue={285000} required />
        </div>

        <div>
          <label className={labelClass}>Property Type</label>
          <select name="propertyType" className={inputClass} defaultValue="flat">
            <option value="flat">Flat / Apartment</option>
            <option value="terraced">Terraced House</option>
            <option value="semi-detached">Semi-Detached</option>
            <option value="detached">Detached</option>
            <option value="bungalow">Bungalow</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Bedrooms</label>
          <input name="bedrooms" type="number" className={inputClass} defaultValue={2} required />
        </div>

        <div>
          <label className={labelClass}>Size (sqm)</label>
          <input name="sizeSqm" type="number" className={inputClass} defaultValue={85} required />
        </div>

        <div>
          <label className={labelClass}>Year Built</label>
          <input name="yearBuilt" type="number" className={inputClass} defaultValue={2019} required />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Tenure</label>
          <div className="flex gap-4 mt-1">
            {['leasehold', 'freehold'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTenure(t)}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                  tenure === t
                    ? 'border-cyan bg-cyan/10 text-cyan'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tenure === 'leasehold' && (
          <>
            <div>
              <label className={labelClass}>Service Charge (£/yr)</label>
              <input name="serviceCharge" type="number" className={inputClass} defaultValue={1200} />
            </div>
            <div>
              <label className={labelClass}>Ground Rent (£/yr)</label>
              <input name="groundRent" type="number" className={inputClass} defaultValue={250} />
            </div>
            <div>
              <label className={labelClass}>Lease Remaining (years)</label>
              <input name="leaseYears" type="number" className={inputClass} defaultValue={999} />
            </div>
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 w-full py-3 rounded-xl font-semibold text-navy bg-cyan hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? 'Analyzing...' : 'Analyze Property'}
      </button>
    </form>
  );
}
