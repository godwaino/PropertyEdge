import { Brain, Search, BarChart3, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const steps = [
  { icon: Search, text: 'Scanning property details...' },
  { icon: Brain, text: 'Analyzing with AI...' },
  { icon: BarChart3, text: 'Calculating valuation...' },
  { icon: CheckCircle, text: 'Generating insights...' },
];

export default function LoadingState() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="glass-card rounded-2xl p-8 md:p-12 animate-pulse-glow">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan/20 flex items-center justify-center">
            <Brain className="w-8 h-8 text-cyan spinner" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Analyzing Property
          </h2>
          <p className="text-gray-400">
            Our AI is evaluating your property...
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeStep;
            const isDone = i < activeStep;

            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                  isActive
                    ? 'bg-cyan/10 border border-cyan/30'
                    : isDone
                      ? 'opacity-50'
                      : 'opacity-30'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? 'text-cyan'
                      : isDone
                        ? 'text-pe-green'
                        : 'text-gray-600'
                  }`}
                />
                <span
                  className={`text-sm ${
                    isActive ? 'text-white font-medium' : 'text-gray-500'
                  }`}
                >
                  {step.text}
                </span>
                {isDone && (
                  <CheckCircle className="w-4 h-4 text-pe-green ml-auto" />
                )}
                {isActive && (
                  <div className="ml-auto w-4 h-4 border-2 border-cyan border-t-transparent rounded-full spinner" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
