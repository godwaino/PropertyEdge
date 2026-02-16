import { useState } from 'react';
import { PropertyInput } from '../types/property';

interface Props {
  onSubmit: (property: PropertyInput) => void;
  isLoading: boolean;
}

interface FormFields {
  address: string;
  postcode: string;
  askingPrice: string;
  propertyType: string;
  bedrooms: string;
  sizeSqm: string;
  yearBuilt: string;
  serviceCharge: string;
  groundRent: string;
  leaseYears: string;
}

const defaults: FormFields = {
  address: '10 Deansgate',
  postcode: 'M3 4LQ',
  askingPrice: '285000',
  propertyType: 'flat',
  bedrooms: '2',
  sizeSqm: '85',
  yearBuilt: '2019',
  serviceCharge: '1200',
  groundRent: '250',
  leaseYears: '999',
};

export default function PropertyForm({ onSubmit, isLoading }: Props) {
  const [fields, setFields] = useState<FormFields>(defaults);
  const [tenure, setTenure] = useState('leasehold');
  const [listingText, setListingText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const setField = (name: keyof FormFields, value: string) => {
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleExtract = async () => {
    if (!listingText.trim()) return;

    setIsExtracting(true);
    setExtractError(null);

    try {
      const response = await fetch('/api/extract-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: listingText.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not extract details');
      }

      // Update all fields that have real values (not 0 or empty)
      setFields((prev) => ({
        ...prev,
        ...(data.address ? { address: data.address } : {}),
        ...(data.postcode ? { postcode: data.postcode } : {}),
        ...(data.askingPrice ? { askingPrice: String(data.askingPrice) } : {}),
        ...(data.propertyType ? { propertyType: data.propertyType } : {}),
        ...(data.bedrooms ? { bedrooms: String(data.bedrooms) } : {}),
        ...(data.sizeSqm ? { sizeSqm: String(data.sizeSqm) } : {}),
        ...(data.yearBuilt ? { yearBuilt: String(data.yearBuilt) } : {}),
        ...(data.serviceCharge ? { serviceCharge: String(data.serviceCharge) } : {}),
        ...(data.groundRent ? { groundRent: String(data.groundRent) } : {}),
        ...(data.leaseYears ? { leaseYears: String(data.leaseYears) } : {}),
      }));

      if (data.tenure) {
        setTenure(data.tenure);
      }

      setShowImport(false);
      setListingText('');
    } catch (err: any) {
      setExtractError(err.message || 'Could not extract details');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const property: PropertyInput = {
      address: fields.address,
      postcode: fields.postcode,
      askingPrice: Number(fields.askingPrice),
      propertyType: fields.propertyType,
      bedrooms: Number(fields.bedrooms),
      sizeSqm: Number(fields.sizeSqm),
      yearBuilt: Number(fields.yearBuilt),
      tenure,
    };

    if (tenure === 'leasehold') {
      property.serviceCharge = Number(fields.serviceCharge) || 0;
      property.groundRent = Number(fields.groundRent) || 0;
      property.leaseYears = Number(fields.leaseYears) || 99;
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
      {/* Import from listing toggle */}
      <div className="mb-5">
        <button
          type="button"
          onClick={() => setShowImport(!showImport)}
          className="text-sm text-cyan hover:text-cyan/80 transition-colors flex items-center gap-1.5"
        >
          <span className={`inline-block transition-transform ${showImport ? 'rotate-90' : ''}`}>&#9654;</span>
          Paste Rightmove / Zoopla listing to auto-fill
        </button>

        {showImport && (
          <div className="mt-3">
            <p className="text-gray-500 text-xs mb-2">
              Copy the listing text from Rightmove or Zoopla (title, price, description) and paste it below.
            </p>
            <textarea
              value={listingText}
              onChange={(e) => setListingText(e.target.value)}
              placeholder={"e.g. 2 bed flat for sale\n£285,000\nDeansgate, Manchester, M3 4LQ\n2 bedrooms, 85 sqm, leasehold..."}
              rows={5}
              className={`${inputClass} resize-none`}
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting || !listingText.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan/10 border border-cyan text-cyan hover:bg-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isExtracting ? 'Extracting...' : 'Extract & Auto-fill'}
              </button>
              {extractError && (
                <p className="text-pe-red text-xs">{extractError}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 mb-5" />

      <h2 className="text-lg font-semibold text-white mb-4">Property Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelClass}>Address</label>
          <input name="address" className={inputClass} value={fields.address} onChange={(e) => setField('address', e.target.value)} required />
        </div>

        <div>
          <label className={labelClass}>Postcode</label>
          <input name="postcode" className={inputClass} value={fields.postcode} onChange={(e) => setField('postcode', e.target.value)} required />
        </div>

        <div>
          <label className={labelClass}>Asking Price (&pound;)</label>
          <input name="askingPrice" type="number" className={inputClass} value={fields.askingPrice} onChange={(e) => setField('askingPrice', e.target.value)} required />
        </div>

        <div>
          <label className={labelClass}>Property Type</label>
          <select name="propertyType" className={inputClass} value={fields.propertyType} onChange={(e) => setField('propertyType', e.target.value)}>
            <option value="flat">Flat / Apartment</option>
            <option value="terraced">Terraced House</option>
            <option value="semi-detached">Semi-Detached</option>
            <option value="detached">Detached</option>
            <option value="bungalow">Bungalow</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Bedrooms</label>
          <input name="bedrooms" type="number" className={inputClass} value={fields.bedrooms} onChange={(e) => setField('bedrooms', e.target.value)} required />
        </div>

        <div>
          <label className={labelClass}>Size (sqm)</label>
          <input name="sizeSqm" type="number" className={inputClass} value={fields.sizeSqm} onChange={(e) => setField('sizeSqm', e.target.value)} required />
        </div>

        <div>
          <label className={labelClass}>Year Built</label>
          <input name="yearBuilt" type="number" className={inputClass} value={fields.yearBuilt} onChange={(e) => setField('yearBuilt', e.target.value)} required />
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
              <label className={labelClass}>Service Charge (&pound;/yr)</label>
              <input name="serviceCharge" type="number" className={inputClass} value={fields.serviceCharge} onChange={(e) => setField('serviceCharge', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Ground Rent (&pound;/yr)</label>
              <input name="groundRent" type="number" className={inputClass} value={fields.groundRent} onChange={(e) => setField('groundRent', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Lease Remaining (years)</label>
              <input name="leaseYears" type="number" className={inputClass} value={fields.leaseYears} onChange={(e) => setField('leaseYears', e.target.value)} />
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
