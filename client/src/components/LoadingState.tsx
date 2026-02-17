import { useState, useEffect } from 'react';

const steps = [
  'Fetching sold prices and comparables',
  'Checking EPC, crime and flood risk data',
  'Running AI valuation analysis',
  'Building negotiation playbook',
];

export default function LoadingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-4 animate-slide-up">
      {/* Progress stepper */}
      <div className="bg-navy-card border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-cyan rounded-full animate-spin flex-shrink-0" />
          <p className="text-white text-sm font-medium">Analysing your property&hellip;</p>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                i < activeStep
                  ? 'border-cyan bg-cyan/20'
                  : i === activeStep
                  ? 'border-cyan animate-pulse'
                  : 'border-gray-700'
              }`}>
                {i < activeStep && (
                  <svg className="w-3 h-3 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm transition-colors duration-500 ${
                i < activeStep ? 'text-gray-500' : i === activeStep ? 'text-white' : 'text-gray-600'
              }`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton cards mimicking the 3-block summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-navy-card border border-gray-800 rounded-2xl p-5 animate-pulse">
            <div className="h-3 w-20 bg-gray-800 rounded mx-auto mb-3" />
            <div className="h-7 w-28 bg-gray-800 rounded mx-auto mb-2" />
            <div className="h-2 w-16 bg-gray-800/60 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Skeleton negotiation box */}
      <div className="bg-navy-card border border-gray-800 rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-40 bg-gray-800 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="text-center">
              <div className="h-2 w-12 bg-gray-800/60 rounded mx-auto mb-2" />
              <div className="h-6 w-20 bg-gray-800 rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-gray-800/40 rounded" />
          <div className="h-2 w-3/4 bg-gray-800/40 rounded" />
        </div>
      </div>
    </div>
  );
}
