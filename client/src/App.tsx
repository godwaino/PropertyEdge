import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import PropertyForm from './components/PropertyForm';
import AnalysisResults from './components/AnalysisResults';
import LoadingState from './components/LoadingState';
import { PropertyInput, AnalysisResult } from './types/property';

export default function App() {
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
        body: JSON.stringify(property),
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

  // Scroll results into view when they appear
  useEffect(() => {
    if (result && !isLoading) {
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [result, isLoading]);

  const showHero = !result && !isLoading;

  return (
    <div className="min-h-screen bg-navy">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 pb-16">
        <Header />

        <div className="max-w-4xl mx-auto px-4 mb-2 flex justify-end items-center gap-2">
          {demoMode && !apiKeyConfigured && (
            <span className="text-gray-500 text-xs">No API key &mdash; using sample data</span>
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
                : 'border-gray-700 text-gray-500 hover:border-gray-500'
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

          {isLoading && <LoadingState />}

          {result && lastProperty && !isLoading && (
            <div id="results">
              <AnalysisResults result={result} property={lastProperty} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
