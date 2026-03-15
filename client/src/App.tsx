import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
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
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setApiKeyConfigured(data.apiKeyConfigured);
        if (!data.apiKeyConfigured) setDemoMode(true);
      })
      .catch(() => setDemoMode(true));
  }, []);

  const handleAnalyze = async (property: PropertyInput) => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setLastProperty(property);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

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
        await new Promise((r) => setTimeout(r, 2500));
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-cyan/[0.04] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-[-5%] w-[500px] h-[500px] bg-gold/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-[-5%] w-[300px] h-[300px] bg-cyan/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 pb-20">
        <Header />

        {/* Controls bar */}
        <div className="max-w-4xl mx-auto px-4 mb-3 flex justify-end items-center gap-3">
          {demoMode && !apiKeyConfigured && (
            <span className="text-xs text-slate-600 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-slate-700">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              No API key detected
            </span>
          )}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
              demoMode
                ? 'border-gold/30 bg-gold/10 text-gold'
                : 'border-navy-border text-slate-500 hover:border-slate-600 hover:text-slate-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${demoMode ? 'bg-gold animate-pulse' : 'bg-slate-600'}`}
            />
            {demoMode ? 'Demo Mode' : 'Live Mode'}
          </button>
        </div>

        <main className="px-4">
          <PropertyForm onSubmit={handleAnalyze} isLoading={isLoading} />

          {error && (
            <div className="w-full max-w-4xl mx-auto mt-6 animate-fade-in">
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-pe-red to-pe-red/30" />
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pe-red/10 border border-pe-red/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-pe-red">
                        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Analysis failed</p>
                      <p className="text-pe-red text-xs mt-0.5">{error}</p>
                    </div>
                  </div>
                  {!demoMode && (
                    <button
                      onClick={() => { setDemoMode(true); setError(null); }}
                      className="text-xs px-4 py-2 rounded-lg border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 transition-all whitespace-nowrap flex-shrink-0"
                    >
                      Switch to Demo Mode
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={resultsRef} className="scroll-mt-6">
            {isLoading && <LoadingState />}

            {result && lastProperty && !isLoading && (
              <AnalysisResults result={result} property={lastProperty} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
