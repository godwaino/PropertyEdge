import { useState, useEffect } from 'react';
import { PropertyInput } from '../types/property';

interface Props {
  onSubmit: (property: PropertyInput) => void;
  isLoading: boolean;
  autoOpenImport?: boolean;
  collapsed?: boolean;
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

function formatPrice(value: string): string {
  const num = value.replace(/[^0-9]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('en-GB');
}

function rawPrice(formatted: string): string {
  return formatted.replace(/[^0-9]/g, '');
}

export default function PropertyForm({ onSubmit, isLoading, autoOpenImport, collapsed }: Props) {
  const [fields, setFields] = useState<FormFields>(defaults);
  const [tenure, setTenure] = useState('leasehold');
  const [listingText, setListingText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showOptional, setShowOptional] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
  const [formExpanded, setFormExpanded] = useState(true);

  useEffect(() => {
    if (autoOpenImport) setShowImport(true);
  }, [autoOpenImport]);

  // Collapse form when results are shown
  useEffect(() => {
    if (collapsed) setFormExpanded(false);
    else setFormExpanded(true);
  }, [collapsed]);

  const setField = (name: keyof FormFields, value: string) => {
    setFields((prev) => ({ ...prev, [name]: value }));
    // Clear error on edit
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormFields, string>> = {};
    if (!fields.address.trim()) e.address = 'Required';
    if (!fields.postcode.trim()) e.postcode = 'Required';
    else if (!/^[A-Z]{1,2}\d[A-Z\d]?(\s*\d[A-Z]{2})?$/i.test(fields.postcode.trim()))
      e.postcode = 'Enter a full or partial postcode (e.g. "M3 4LQ" or "M3")';
    const price = Number(rawPrice(fields.askingPrice));
    if (!price || price < 1000) e.askingPrice = 'Enter a valid price';
    if (!fields.bedrooms || Number(fields.bedrooms) < 0) e.bedrooms = 'Required';
    const yb = Number(fields.yearBuilt);
    if (fields.yearBuilt && (yb < 1500 || yb > new Date().getFullYear() + 2))
      e.yearBuilt = '1500-' + (new Date().getFullYear() + 2);
    setErrors(e);
    return Object.keys(e).length === 0;
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
      if (!response.ok) throw new Error(data.message || 'Could not extract details');

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
      if (data.tenure) setTenure(data.tenure);
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
    if (!validate()) return;

    const property: PropertyInput = {
      address: fields.address,
      postcode: fields.postcode,
      askingPrice: Number(rawPrice(fields.askingPrice)),
      propertyType: fields.propertyType,
      bedrooms: Number(fields.bedrooms),
      sizeSqm: Number(fields.sizeSqm) || 0,
      yearBuilt: Number(fields.yearBuilt) || 2000,
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
  const errorInputClass =
    'w-full bg-navy-light border border-pe-red/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pe-red transition-colors';
  const labelClass = 'block text-gray-400 text-xs mb-1';
  const helperClass = 'text-gray-600 text-[11px] mt-0.5';
  const errorClass = 'text-pe-red text-[11px] mt-0.5';

  return (
    <form
      id="analyze"
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto bg-navy-card border border-gray-800 rounded-2xl p-6"
    >
      {/* Collapsed summary bar */}
      {!formExpanded && (
        <button
          type="button"
          onClick={() => setFormExpanded(true)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 text-xs">&#9654;</span>
            <span className="text-white font-medium truncate">{fields.address}, {fields.postcode}</span>
            <span className="text-gray-500">&middot;</span>
            <span className="text-gray-400">&pound;{formatPrice(fields.askingPrice)}</span>
            <span className="text-gray-500">&middot;</span>
            <span className="text-gray-400">{fields.bedrooms} bed {fields.propertyType}</span>
          </div>
          <span className="text-cyan text-xs whitespace-nowrap ml-4">Edit details</span>
        </button>
      )}

      {/* Full form - hidden when collapsed */}
      {formExpanded && <>
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
              Copy the listing text (title, price, description) and paste it below.
            </p>
            <textarea
              value={listingText}
              onChange={(e) => setListingText(e.target.value)}
              placeholder={"e.g. 2 bed flat for sale\n£285,000\nDeansgate, Manchester, M3 4LQ\n2 bedrooms, 85 sqm, leasehold..."}
              rows={4}
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
              {extractError && <p className="text-pe-red text-xs">{extractError}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 mb-5" />

      {/* Section A: Core Details */}
      <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
        Core Details
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={labelClass}>Address</label>
          <input
            className={errors.address ? errorInputClass : inputClass}
            value={fields.address}
            onChange={(e) => setField('address', e.target.value)}
          />
          {errors.address && <p className={errorClass}>{errors.address}</p>}
        </div>

        <div>
          <label className={labelClass}>Postcode</label>
          <input
            className={errors.postcode ? errorInputClass : inputClass}
            value={fields.postcode}
            onChange={(e) => setField('postcode', e.target.value.toUpperCase())}
            placeholder="e.g. SW1A 1AA"
          />
          {errors.postcode && <p className={errorClass}>{errors.postcode}</p>}
        </div>

        <div>
          <label className={labelClass}>Asking Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">&pound;</span>
            <input
              type="text"
              inputMode="numeric"
              className={`${errors.askingPrice ? errorInputClass : inputClass} pl-7`}
              value={formatPrice(fields.askingPrice)}
              onChange={(e) => setField('askingPrice', rawPrice(e.target.value))}
            />
          </div>
          {errors.askingPrice && <p className={errorClass}>{errors.askingPrice}</p>}
        </div>

        <div>
          <label className={labelClass}>Bedrooms</label>
          <input
            type="number"
            className={errors.bedrooms ? errorInputClass : inputClass}
            value={fields.bedrooms}
            onChange={(e) => setField('bedrooms', e.target.value)}
            min={0}
            max={20}
          />
          {errors.bedrooms && <p className={errorClass}>{errors.bedrooms}</p>}
        </div>

        <div>
          <label className={labelClass}>Property Type</label>
          <select
            className={inputClass}
            value={fields.propertyType}
            onChange={(e) => setField('propertyType', e.target.value)}
          >
            <option value="flat">Flat / Apartment</option>
            <option value="terraced">Terraced House</option>
            <option value="semi-detached">Semi-Detached</option>
            <option value="detached">Detached</option>
            <option value="bungalow">Bungalow</option>
          </select>
        </div>
      </div>

      {/* Section B: Optional Refinements */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="text-xs text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1.5"
        >
          <span className={`inline-block transition-transform ${showOptional ? 'rotate-90' : ''}`}>&#9654;</span>
          Optional refinements
          <span className="text-gray-600 ml-1">(approx is fine)</span>
        </button>

        {showOptional && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div>
              <label className={labelClass}>Size (sqm)</label>
              <input
                type="number"
                className={inputClass}
                value={fields.sizeSqm}
                onChange={(e) => setField('sizeSqm', e.target.value)}
                placeholder="Leave blank if unknown"
              />
              <p className={helperClass}>Approx is fine</p>
            </div>

            <div>
              <label className={labelClass}>Year Built</label>
              <input
                type="number"
                className={errors.yearBuilt ? errorInputClass : inputClass}
                value={fields.yearBuilt}
                onChange={(e) => setField('yearBuilt', e.target.value)}
                placeholder="e.g. 1990"
              />
              {errors.yearBuilt ? (
                <p className={errorClass}>{errors.yearBuilt}</p>
              ) : (
                <p className={helperClass}>Estimate OK</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Tenure</label>
              <div className="flex gap-2 mt-0.5">
                {(['leasehold', 'freehold'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTenure(t)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${
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
                  <input type="number" className={inputClass} value={fields.serviceCharge} onChange={(e) => setField('serviceCharge', e.target.value)} />
                  <p className={helperClass}>Leave blank if unknown</p>
                </div>
                <div>
                  <label className={labelClass}>Ground Rent (&pound;/yr)</label>
                  <input type="number" className={inputClass} value={fields.groundRent} onChange={(e) => setField('groundRent', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Lease Remaining (yrs)</label>
                  <input type="number" className={inputClass} value={fields.leaseYears} onChange={(e) => setField('leaseYears', e.target.value)} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 w-full py-3 rounded-xl font-semibold text-navy bg-cyan hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? 'Analysing...' : 'Analyse Property'}
      </button>

      {/* Trust cue */}
      <p className="mt-2 text-center text-gray-600 text-[11px]">
        Uses HM Land Registry sold prices, postcodes.io and AI analysis
      </p>
      </>}
    </form>
  );
}
