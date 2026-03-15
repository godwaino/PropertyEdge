import { useState, useEffect } from 'react';

const steps = [
  {
    label: 'Analyzing property details',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Checking local market data',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M3 17l4-6 4 3 4-8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Evaluating risk factors',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Generating valuation report',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function LoadingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = steps.map((_, i) =>
      setTimeout(() => setActiveStep(i), i * 600)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = ((activeStep + 1) / steps.length) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-fade-in">
      <div className="glass-card rounded-2xl p-8">
        {/* Spinner + title */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full animate-pulse-glow" />
            {/* Spinning ring */}
            <div className="w-16 h-16 rounded-full border-2 border-navy-border border-t-cyan animate-spin" />
            {/* Inner icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-cyan">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <h3 className="text-white font-semibold text-base">Analyzing Property</h3>
          <p className="text-slate-500 text-sm mt-1">Running deep analysis on your property...</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-600">Progress</span>
            <span className="text-xs text-cyan font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 rounded-full bg-navy-border overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan/80 to-cyan transition-all duration-700 ease-out"
              style={{ width: `${progress}%`, boxShadow: '0 0 8px rgba(0,217,255,0.5)' }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2.5">
          {steps.map((step, i) => {
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${
                  isActive
                    ? 'bg-cyan/8 border border-cyan/15'
                    : isDone
                    ? 'opacity-50'
                    : 'opacity-25'
                }`}
              >
                {/* Status icon */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isDone
                      ? 'bg-pe-green/20 text-pe-green'
                      : isActive
                      ? 'bg-cyan/20 text-cyan'
                      : 'bg-navy-border/50 text-slate-600'
                  }`}
                >
                  {isDone ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
                  ) : (
                    <span className="text-xs font-mono">{i + 1}</span>
                  )}
                </div>

                {/* Step icon + label */}
                <div className={`transition-colors ${isActive ? 'text-cyan' : isDone ? 'text-slate-400' : 'text-slate-600'}`}>
                  {step.icon}
                </div>
                <p
                  className={`text-sm transition-colors ${
                    isActive ? 'text-white font-medium' : isDone ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {step.label}
                  {isActive && (
                    <span className="ml-1 inline-flex gap-0.5">
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="w-1 h-1 rounded-full bg-cyan inline-block animate-bounce"
                          style={{ animationDelay: `${d * 0.15}s` }}
                        />
                      ))}
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
