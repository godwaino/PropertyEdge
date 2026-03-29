import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { DemoModeBanner } from '../components/input/DemoModeBanner';
import { AnalysisProgress } from '../components/loading/AnalysisProgress';
import { useUiStore } from '../stores/uiStore';
import { analyseProperty, parseListing } from '../api/analyse';
import type { PropertyInput } from '../types/property';
import type { FullAnalysisResult } from '../types/analysis';
import { buildScores } from '../utils/scores';
import { Link, ExternalLink, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

// Session-level cache: analysisId → FullAnalysisResult
export const reportCache = new Map<string, { result: FullAnalysisResult; property: PropertyInput }>();

export function getReport(id: string) {
  return reportCache.get(id);
}

const DEFAULTS: PropertyInput = {
  address: '',
  postcode: '',
  askingPrice: 0,
  propertyType: 'terraced',
  bedrooms: 3,
  sizeSqm: 0,
  yearBuilt: 0,
  tenure: 'freehold',
  serviceCharge: 0,
  groundRent: 0,
  leaseYears: 0,
};

export function AnalysePage() {
  const navigate = useNavigate();
  const { demoMode, apiKeyConfigured } = useUiStore();

  const [form, setForm] = useState<PropertyInput>(DEFAULTS);
  const [importedFields, setImportedFields] = useState<Set<string>>(new Set());
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');

  const updateField = (k: keyof PropertyInput, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleImportUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    const isSupported =
      urlInput.includes('rightmove.co.uk') || urlInput.includes('zoopla.co.uk') || urlInput.includes('onthemarket.com');
    if (!isSupported) {
      setUrlError('Only Rightmove, Zoopla, and OnTheMarket URLs are supported.');
      return;
    }
    setUrlError('');
    setUrlLoading(true);
    try {
      const parsed = await parseListing(urlInput);
      const updated: PropertyInput = { ...form };
      const newImported = new Set<string>();
      (Object.keys(parsed) as Array<keyof PropertyInput>).forEach(k => {
        const v = parsed[k];
        if (v !== undefined && v !== null && v !== '' && v !== 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (updated as any)[k] = v;
          newImported.add(k);
        }
      });
      setForm(updated);
      setImportedFields(newImported);
      setShowManual(true);
    } catch (e) {
      setUrlError('Could not parse that URL. Please fill in the details manually.');
      setShowManual(true);
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput, form]);

  const handleAnalyse = async () => {
    if (!form.address || !form.postcode || !form.askingPrice) {
      setError('Please fill in address, postcode, and asking price.');
      return;
    }
    setError('');
    setLoading(true);
    setLoadingStep(0);

    // Simulate step progression
    const stepTimer = setInterval(() => {
      setLoadingStep(s => Math.min(s + 1, 4));
    }, demoMode ? 600 : 1500);

    try {
      const raw = await analyseProperty(form);

      // Enrich with computed scores if not already present
      if (!raw.scores?.overall) {
        raw.scores = buildScores(raw);
      }

      // Cache result (memory + sessionStorage for page-refresh survival)
      const id = raw.analysisId ?? `anlys-${Date.now()}`;
      raw.analysisId = id;
      const entry = { result: raw, property: form };
      reportCache.set(id, entry);
      try {
        sessionStorage.setItem(`pe-report-${id}`, JSON.stringify(entry));
      } catch { /* quota exceeded — graceful degradation */ }

      navigate(`/report/${id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Analysis failed. Please try again.';
      setError(msg);
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
      setLoadingStep(0);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <AnalysisProgress currentStep={loadingStep} />
      </AppShell>
    );
  }

  const isLeasehold = form.tenure === 'leasehold';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Analyse a property</h1>
          <p className="text-sm text-navy-300">Paste a listing URL or enter details manually.</p>
        </div>

        {/* Demo banner */}
        <div className="mb-4">
          <DemoModeBanner />
        </div>

        {/* API key warning */}
        {!demoMode && !apiKeyConfigured && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-pe-red/10 border border-pe-red/30 text-sm">
            <AlertCircle size={16} className="text-pe-red flex-shrink-0" />
            <p className="text-pe-red">
              No API key configured — <button className="underline" onClick={() => useUiStore.getState().setDemoMode(true)}>switch to demo mode</button>
            </p>
          </div>
        )}

        {/* URL import */}
        <div className="glass-card rounded-2xl border border-navy-border p-5 mb-4">
          <label className="block text-xs font-medium text-navy-300 uppercase tracking-wider mb-2">
            Import from listing URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleImportUrl()}
                placeholder="https://www.rightmove.co.uk/properties/..."
                className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-navy-light border border-navy-border text-sm text-white placeholder-navy-300 focus:outline-none focus:border-cyan/50 transition-colors"
              />
            </div>
            <button
              onClick={handleImportUrl}
              disabled={urlLoading || !urlInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-cyan text-navy font-semibold text-sm disabled:opacity-40 hover:bg-cyan/90 transition-colors"
            >
              {urlLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
              Import
            </button>
          </div>
          {urlError && <p className="text-xs text-pe-red mt-2">{urlError}</p>}
          {importedFields.size > 0 && (
            <p className="text-xs text-pe-green mt-2">
              ✓ Imported {importedFields.size} fields from listing
            </p>
          )}
        </div>

        {/* Manual form toggle */}
        <button
          onClick={() => setShowManual(s => !s)}
          className="flex items-center gap-2 text-sm text-navy-300 hover:text-white transition-colors mb-4 w-full"
        >
          {showManual ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showManual ? 'Hide manual entry' : 'Enter details manually'}
        </button>

        {/* Manual form */}
        {showManual && (
          <div className="glass-card rounded-2xl border border-navy-border p-5 mb-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">Property Details</h3>

            {/* Address */}
            <FieldRow>
              <Label>Address</Label>
              <input
                value={form.address}
                onChange={e => updateField('address', e.target.value)}
                placeholder="e.g. 14 Hartwell Close"
                className={inputCls(importedFields.has('address'))}
              />
            </FieldRow>

            <div className="grid grid-cols-2 gap-3">
              <FieldRow>
                <Label>Postcode</Label>
                <input
                  value={form.postcode}
                  onChange={e => updateField('postcode', e.target.value.toUpperCase())}
                  placeholder="e.g. RG1 3AB"
                  className={inputCls(importedFields.has('postcode'))}
                />
              </FieldRow>
              <FieldRow>
                <Label>Asking Price (£)</Label>
                <input
                  type="number"
                  value={form.askingPrice || ''}
                  onChange={e => updateField('askingPrice', Number(e.target.value))}
                  placeholder="e.g. 350000"
                  className={inputCls(importedFields.has('askingPrice'))}
                />
              </FieldRow>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FieldRow>
                <Label>Type</Label>
                <select
                  value={form.propertyType}
                  onChange={e => updateField('propertyType', e.target.value)}
                  className={selectCls(importedFields.has('propertyType'))}
                >
                  {['terraced', 'semi', 'detached', 'flat', 'bungalow', 'other'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow>
                <Label>Bedrooms</Label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.bedrooms || ''}
                  onChange={e => updateField('bedrooms', Number(e.target.value))}
                  className={inputCls(importedFields.has('bedrooms'))}
                />
              </FieldRow>
              <FieldRow>
                <Label>Size (m²)</Label>
                <input
                  type="number"
                  value={form.sizeSqm || ''}
                  onChange={e => updateField('sizeSqm', Number(e.target.value))}
                  placeholder="Optional"
                  className={inputCls(importedFields.has('sizeSqm'))}
                />
              </FieldRow>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldRow>
                <Label>Year Built</Label>
                <input
                  type="number"
                  value={form.yearBuilt || ''}
                  onChange={e => updateField('yearBuilt', Number(e.target.value))}
                  placeholder="Optional"
                  className={inputCls(importedFields.has('yearBuilt'))}
                />
              </FieldRow>
              <FieldRow>
                <Label>Tenure</Label>
                <div className="flex gap-2">
                  {['freehold', 'leasehold'].map(t => (
                    <button
                      key={t}
                      onClick={() => updateField('tenure', t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        form.tenure === t
                          ? 'bg-cyan/10 border-cyan/30 text-cyan'
                          : 'border-navy-border text-navy-300 hover:text-white'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </FieldRow>
            </div>

            {/* Leasehold fields */}
            {isLeasehold && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-navy-border">
                <FieldRow>
                  <Label>Service Charge (£/yr)</Label>
                  <input type="number" value={form.serviceCharge || ''} onChange={e => updateField('serviceCharge', Number(e.target.value))} className={inputCls(false)} />
                </FieldRow>
                <FieldRow>
                  <Label>Ground Rent (£/yr)</Label>
                  <input type="number" value={form.groundRent || ''} onChange={e => updateField('groundRent', Number(e.target.value))} className={inputCls(false)} />
                </FieldRow>
                <FieldRow>
                  <Label>Lease Years Left</Label>
                  <input type="number" value={form.leaseYears || ''} onChange={e => updateField('leaseYears', Number(e.target.value))} className={inputCls(false)} />
                </FieldRow>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-pe-red/10 border border-pe-red/30 text-sm text-pe-red">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyse}
          disabled={!form.address || !form.postcode || !form.askingPrice}
          className="w-full py-3.5 rounded-xl bg-cyan text-navy font-bold text-base hover:bg-cyan/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {demoMode ? 'Run demo analysis' : 'Analyse this property'}
        </button>

        <p className="text-[11px] text-navy-300 text-center mt-3">
          AI estimates only. Not financial, legal, or surveying advice.
        </p>
      </div>
    </AppShell>
  );
}

// Mini helpers
function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-navy-300">{children}</label>;
}

const inputCls = (imported: boolean) =>
  `w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-navy-300 focus:outline-none focus:border-cyan/50 transition-colors ${
    imported
      ? 'bg-pe-green/5 border-pe-green/30 text-pe-green'
      : 'bg-navy-light border-navy-border'
  }`;

const selectCls = (imported: boolean) =>
  `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-cyan/50 transition-colors ${
    imported
      ? 'bg-pe-green/5 border-pe-green/30 text-pe-green'
      : 'bg-navy-light border-navy-border text-white'
  }`;
