import { useState, useEffect } from 'react';

const steps = [
  { icon: '🏠', label: 'Fetching sold prices & comparables', sub: 'HM Land Registry' },
  { icon: '📊', label: 'Checking EPC, crime, flood & planning', sub: 'Gov data sources' },
  { icon: '📈', label: 'Analysing house price trends', sub: 'UK HPI' },
  { icon: '🤖', label: 'Running AI valuation analysis', sub: 'Claude AI' },
  { icon: '💬', label: 'Building negotiation playbook', sub: 'Strategy engine' },
];

export default function LoadingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.round(((activeStep + 1) / steps.length) * 100);

  return (
    <div className="w-full max-w-2xl mx-auto mt-10 px-4 animate-float-in">

      {/* Central status card */}
      <div className="bg-th-card border border-th-border rounded-2xl overflow-hidden elevation-2">

        {/* Progress bar */}
        <div className="h-1 bg-th-border overflow-hidden">
          <div
            className="h-full bg-cyan transition-all duration-700 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          {/* Current step indicator */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-10 h-10 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-cyan/20 animate-ping" />
              <div className="relative w-10 h-10 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center text-lg">
                {steps[activeStep].icon}
              </div>
            </div>
            <div>
              <p className="text-th-heading text-sm font-semibold leading-tight">
                {steps[activeStep].label}
              </p>
              <p className="text-th-muted text-xs mt-0.5">{steps[activeStep].sub}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-cyan text-sm font-bold">{progress}%</p>
              <p className="text-th-faint text-[10px]">complete</p>
            </div>
          </div>

          {/* Step trail */}
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] transition-all duration-500 ${
                  i < activeStep
                    ? 'border-cyan bg-cyan text-navy font-bold'
                    : i === activeStep
                    ? 'border-cyan bg-cyan/10 text-cyan'
                    : 'border-th-border text-th-faint'
                }`}>
                  {i < activeStep ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                {/* connector line */}
                {i < steps.length - 1 && (
                  <div className={`hidden sm:block absolute`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skeleton preview cards */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-th-card border border-th-border rounded-2xl p-4"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="skeleton-shimmer h-2 w-14 rounded mb-3 mx-auto" />
            <div className="skeleton-shimmer h-6 w-20 rounded mb-2 mx-auto" />
            <div className="skeleton-shimmer h-1.5 w-10 rounded mx-auto opacity-60" />
          </div>
        ))}
      </div>

      <div className="mt-4 bg-th-card border border-th-border rounded-2xl p-5">
        <div className="skeleton-shimmer h-3 w-32 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="skeleton-shimmer h-2 w-10 rounded mb-2" />
              <div className="skeleton-shimmer h-5 w-16 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="skeleton-shimmer h-2 w-full rounded opacity-50" />
          <div className="skeleton-shimmer h-2 w-4/5 rounded opacity-40" />
        </div>
      </div>

    </div>
  );
}
