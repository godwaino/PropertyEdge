export default function LoadingState() {
  const steps = [
    'Analyzing property details...',
    'Checking local market data...',
    'Evaluating risk factors...',
    'Generating valuation report...',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="bg-navy-card border border-gray-800 rounded-2xl p-8 text-center">
        {/* Spinner */}
        <div className="mx-auto w-12 h-12 border-2 border-gray-700 border-t-cyan rounded-full animate-spin mb-6" />

        <div className="space-y-3">
          {steps.map((step, i) => (
            <p
              key={i}
              className="text-gray-400 text-sm animate-pulse"
              style={{ animationDelay: `${i * 0.5}s` }}
            >
              {step}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
