import { useState } from 'react';
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

      // Add a small delay in demo mode so the loading animation is visible
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 3000));
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
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 pb-16">
        <Header />

        {/* Demo mode toggle */}
        <div className="max-w-4xl mx-auto px-4 mb-2 flex justify-end">
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              demoMode
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-gray-700 text-gray-500 hover:border-gray-500'
            }`}
          >
            {demoMode ? 'Demo Mode ON' : 'Demo Mode OFF'}
          </button>
        </div>

        <main className="px-4 mt-2">
          <PropertyForm onSubmit={handleAnalyze} isLoading={isLoading} />

          {error && (
            <div className="w-full max-w-4xl mx-auto mt-6">
              <div className="bg-pe-red/10 border border-pe-red/30 rounded-xl p-4 text-center">
                <p className="text-pe-red font-medium">{error}</p>
                <p className="text-gray-400 text-sm mt-1">
                  Check your API key or enable Demo Mode.
                </p>
              </div>
            </div>
          )}

          {isLoading && <LoadingState />}

          {result && lastProperty && !isLoading && (
            <AnalysisResults result={result} property={lastProperty} />
          )}
        </main>
      </div>
    </div>
  );
}
