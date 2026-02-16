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

  const handleAnalyze = async (property: PropertyInput) => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setLastProperty(property);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(property),
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

  return (
    <div className="min-h-screen bg-navy">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 pb-16">
        <Header />

        <main className="px-4 mt-4">
          <PropertyForm onSubmit={handleAnalyze} isLoading={isLoading} />

          {error && (
            <div className="w-full max-w-4xl mx-auto mt-6">
              <div className="bg-pe-red/10 border border-pe-red/30 rounded-xl p-4 text-center">
                <p className="text-pe-red font-medium">{error}</p>
                <p className="text-gray-400 text-sm mt-1">
                  Check your API key and try again.
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
