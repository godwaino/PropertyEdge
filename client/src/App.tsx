import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturedProperties from './components/FeaturedProperties';
import PropertyForm from './components/PropertyForm';
import AnalysisResults from './components/AnalysisResults';
import LoadingState from './components/LoadingState';
import { PropertyInput, AnalysisResult } from './types/property';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastProperty, setLastProperty] = useState<PropertyInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [autoOpenImport, setAutoOpenImport] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setApiKeyConfigured(data.apiKeyConfigured);
        if (!data.apiKeyConfigured) setDemoMode(true);
      })
      .catch(() => setDemoMode(true));
  }, []);

  const handleAnalyseClick = () => {
    setFormVisible(true);
    setAutoOpenImport(true);
    setTimeout(() => {
      document.getElementById('analyze')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Auto-fill from example card/button and immediately analyse
  const handleTryExample = (property: PropertyInput) => {
    handleAnalyze(property);
  };

  // Extract listing text from hero paste box, then auto-fill form and scroll
  const handleExtractListing = async (text: string) => {
    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      // Build a PropertyInput from extracted data and auto-submit
      const property: PropertyInput = {
        address: data.address || '',
        postcode: data.postcode || '',
        askingPrice: data.askingPrice || 0,
        propertyType: data.propertyType || 'flat',
        bedrooms: data.bedrooms || 0,
        sizeSqm: data.sizeSqm || 0,
        yearBuilt: data.yearBuilt || 2000,
        tenure: data.tenure || 'leasehold',
        serviceCharge: data.serviceCharge || 0,
        groundRent: data.groundRent || 0,
        leaseYears: data.leaseYears || 0,
      };

      // Auto-analyse immediately after extraction
      setIsExtracting(false);
      handleAnalyze(property);
    } catch {
      setIsExtracting(false);
      // Fallback: open the manual form
      handleAnalyseClick();
    }
  };

  const handleAnalyze = async (property: PropertyInput) => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setLastProperty(property);

    try {
      const endpoint = demoMode ? '/api/demo' : '/api/analyze';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...property, persona: selectedPersona || undefined }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Analysis failed (${response.status})`);
      }

      const data: AnalysisResult = await response.json();

      if (demoMode) {
        await new Promise((r) => setTimeout(r, 2000));
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll loading state into view when analysis starts
  useEffect(() => {
    if (isLoading) {
      setTimeout(() => {
        document.getElementById('loading-state')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [isLoading]);

  // Scroll results into view when they appear
  useEffect(() => {
    if (result && !isLoading) {
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [result, isLoading]);

  const handleReset = () => {
    setResult(null);
    setLastProperty(null);
    setError(null);
    setIsLoading(false);
    setFormVisible(false);
    setAutoOpenImport(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showHero = !result && !isLoading;

  return (
    <div className="min-h-screen bg-th-page transition-colors duration-300">
      {/* Decorative glow — only in dark mode */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px]" />
        </div>
      )}

      <div className="relative z-10 pb-8">
        <Header onReset={handleReset} isDark={isDark} onToggleTheme={toggleTheme} />

        <div className="max-w-4xl mx-auto px-4 mb-2 flex justify-end items-center gap-2">
          {demoMode && !apiKeyConfigured && (
            <span className="text-th-muted text-xs">No API key &mdash; using sample data</span>
          )}
          <button
            onClick={() => {
              if (!demoMode) {
                setDemoMode(true);
              } else if (apiKeyConfigured) {
                setDemoMode(false);
              }
            }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              demoMode
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-th-border text-th-muted hover:border-th-muted'
            }`}
          >
            {demoMode ? 'Try a demo' : 'Live Mode'}
          </button>
        </div>

        <Hero
          onAnalyseClick={handleAnalyseClick}
          onExtractListing={handleExtractListing}
          visible={showHero}
          isExtracting={isExtracting}
          selectedPersona={selectedPersona}
          onPersonaSelect={(p) => setSelectedPersona(p || null)}
        />

        <FeaturedProperties
          onSelect={handleTryExample}
          visible={showHero}
        />

        <main className="px-4 mt-2">
          {formVisible && (
            <PropertyForm
              onSubmit={handleAnalyze}
              isLoading={isLoading}
              autoOpenImport={autoOpenImport}
              collapsed={!!(result && !isLoading)}
            />
          )}

          {error && (
            <div className="w-full max-w-4xl mx-auto mt-6">
              <div className="bg-pe-red/10 border border-pe-red/30 rounded-xl p-4 text-center">
                <p className="text-pe-red font-medium">{error}</p>
                {!demoMode && (
                  <button
                    onClick={() => { setDemoMode(true); setError(null); }}
                    className="mt-3 text-sm px-4 py-2 rounded-lg border border-gold bg-gold/10 text-gold hover:bg-gold/20 transition-all"
                  >
                    Switch to Demo Mode
                  </button>
                )}
              </div>
            </div>
          )}

          {isLoading && <div id="loading-state"><LoadingState /></div>}

          {result && lastProperty && !isLoading && (
            <div id="results">
              <AnalysisResults result={result} property={lastProperty} />
              <div className="w-full max-w-4xl mx-auto mt-6 text-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl border border-th-border text-th-secondary hover:text-cyan hover:border-cyan/50 transition-all text-sm"
                >
                  Analyse another property
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Page footer — data sources + trust cues */}
        <footer className="mt-16 border-t border-th-border pt-8 pb-4 max-w-3xl mx-auto px-4">
          <p className="text-th-muted text-[10px] uppercase tracking-wider mb-3 text-center">Data sources</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: 'HM Land Registry', desc: 'Sold prices & HPI' },
              { name: 'EPC Register', desc: 'Energy & floor area' },
              { name: 'Police UK', desc: 'Crime data' },
              { name: 'Environment Agency', desc: 'Flood risk' },
              { name: 'PlanIt', desc: 'Planning apps' },
              { name: 'postcodes.io', desc: 'Geolocation' },
              { name: 'AI Analysis', desc: 'Valuation model' },
            ].map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 bg-th-card/40 border border-th-border rounded-lg px-2.5 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan/60 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-th-body text-[10px] font-medium leading-tight">{s.name}</p>
                  <p className="text-th-faint text-[9px] leading-tight">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-[11px] text-th-muted">
            <span>No account needed</span>
            <span>&middot;</span>
            <span>Searches not stored</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
