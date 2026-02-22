import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturedProperties from './components/FeaturedProperties';
import PropertyForm from './components/PropertyForm';
import AnalysisResults from './components/AnalysisResults';
import LoadingState from './components/LoadingState';
import Admin from './components/Admin';
import { PropertyInput, AnalysisResult } from './types/property';
import { useTheme } from './hooks/useTheme';

// ─── Admin routing ────────────────────────────────────────────────────────────
function isAdminRoute() {
  return window.location.pathname.startsWith('/admin');
}

export default function App() {
  const { isDark, toggle: toggleTheme } = useTheme();

  // Render admin dashboard on /admin
  if (isAdminRoute()) {
    return (
      <div className="min-h-screen bg-th-page transition-colors duration-300">
        <Header isDark={isDark} onToggleTheme={toggleTheme} />
        <Admin isDark={isDark} onToggleTheme={toggleTheme} />
      </div>
    );
  }

  return <MainApp isDark={isDark} toggleTheme={toggleTheme} />;
}

// ─── Main application ─────────────────────────────────────────────────────────
function MainApp({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastProperty, setLastProperty] = useState<PropertyInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const [autoOpenImport, setAutoOpenImport] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
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

  const handleTryExample = (property: PropertyInput) => {
    handleAnalyze(property);
  };

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

      setIsExtracting(false);
      handleAnalyze(property);
    } catch {
      setIsExtracting(false);
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
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) {
      setTimeout(() => {
        document.getElementById('loading-state')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [isLoading]);

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
      {/* Background glow (dark mode only) */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-cyan/6 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] bg-cyan/4 rounded-full blur-[120px]" />
        </div>
      )}

      <div className="relative z-10">
        <Header onReset={handleReset} isDark={isDark} onToggleTheme={toggleTheme} />

        <Hero
          onAnalyseClick={handleAnalyseClick}
          onExtractListing={handleExtractListing}
          visible={showHero}
          isExtracting={isExtracting}
          selectedPersona={selectedPersona}
          onPersonaSelect={(p) => setSelectedPersona(p || null)}
        />

        <FeaturedProperties onSelect={handleTryExample} visible={showHero} />

        <main className="px-4 pb-8">
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
              <div className="bg-pe-red/8 border border-pe-red/25 rounded-2xl p-5 text-center">
                <p className="text-pe-red font-medium">{error}</p>
                {!demoMode && (
                  <button
                    onClick={() => { setDemoMode(true); setError(null); }}
                    className="mt-3 btn-pill text-sm px-5 py-2 border border-gold/50 bg-gold/8 text-gold hover:bg-gold/20"
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
                  className="btn-pill px-6 py-2.5 text-sm border border-th-border text-th-secondary hover:text-cyan hover:border-cyan/40 bg-th-card elevation-1"
                >
                  Analyse another property
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-th-border pt-8 pb-6 max-w-4xl mx-auto px-5">
          <p className="text-th-muted text-[10px] uppercase tracking-widest mb-4 text-center font-medium">
            Data sources
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              { name: 'HM Land Registry', desc: 'Sold prices & HPI' },
              { name: 'EPC Register',     desc: 'Energy & floor area' },
              { name: 'Police UK',        desc: 'Crime data' },
              { name: 'Env. Agency',      desc: 'Flood risk' },
              { name: 'PlanIt',           desc: 'Planning apps' },
              { name: 'postcodes.io',     desc: 'Geolocation' },
              { name: 'Claude AI',        desc: 'Valuation model' },
            ].map((s) => (
              <div key={s.name} className="chip">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan/50 flex-shrink-0" />
                <span className="font-medium text-th-body">{s.name}</span>
                <span className="text-th-faint">&middot; {s.desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-[11px] text-th-muted">
            <span>No account needed</span>
            <span>&middot;</span>
            <span>Searches not stored</span>
          </div>
          <p className="mt-4 text-th-faint text-[10px] text-center leading-relaxed max-w-lg mx-auto">
            Guidance only — not a formal valuation. Verify with a RICS surveyor or qualified agent before making offers.
          </p>
        </footer>
      </div>
    </div>
  );
}
