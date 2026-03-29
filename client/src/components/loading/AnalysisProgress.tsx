import { CheckCircle, Loader2, Clock } from 'lucide-react';

const STEPS = [
  { id: 'parsing', label: 'Parsing listing data', sub: 'Extracting property details' },
  { id: 'market', label: 'Checking market data', sub: 'Land Registry sold prices' },
  { id: 'neighbourhood', label: 'Analysing neighbourhood', sub: 'Crime, flood, environment' },
  { id: 'valuation', label: 'Calculating valuation', sub: 'AI-powered comparable analysis' },
  { id: 'synthesis', label: 'Synthesising report', sub: 'Building your decision view' },
];

interface Props {
  currentStep?: number; // 0-based index
}

export function AnalysisProgress({ currentStep = 0 }: Props) {
  return (
    <div className="max-w-md mx-auto py-16 px-4">
      {/* Spinner */}
      <div className="flex justify-center mb-8">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-cyan/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-cyan border-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-cyan/30 animate-pulse" />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white text-center mb-2">
        Analysing property
      </h2>
      <p className="text-sm text-navy-300 text-center mb-10">
        Checking live market data and building your report…
      </p>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                active ? 'bg-cyan/10 border border-cyan/20' :
                done ? 'opacity-50' : 'opacity-30'
              }`}
            >
              <div className="flex-shrink-0">
                {done ? (
                  <CheckCircle size={20} className="text-pe-green" />
                ) : active ? (
                  <Loader2 size={20} className="text-cyan animate-spin" />
                ) : (
                  <Clock size={20} className="text-navy-300" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${active ? 'text-cyan' : done ? 'text-white' : 'text-navy-300'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-navy-300">{step.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-8 h-1 bg-navy-light rounded-full overflow-hidden">
        <div
          className="h-full bg-cyan rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.round(((currentStep + 1) / STEPS.length) * 100)}%` }}
        />
      </div>
    </div>
  );
}
