import { formatCurrency } from '../../../utils/formatters';

interface Props {
  low: number;
  central: number;
  high: number;
  asking: number;
}

export function ValuationRangeBar({ low, central, high, asking }: Props) {
  const range = high - low;
  const askPos = Math.max(0, Math.min(100, ((asking - low) / range) * 100));
  const centralPos = Math.max(0, Math.min(100, ((central - low) / range) * 100));

  const askingAbove = asking > high;
  const askingBelow = asking < low;

  return (
    <div className="select-none">
      <div className="flex justify-between text-xs text-navy-300 mb-2">
        <span>{formatCurrency(low, true)}</span>
        <span className="text-white font-medium">Fair value range</span>
        <span>{formatCurrency(high, true)}</span>
      </div>

      {/* Track */}
      <div className="relative h-8 flex items-center">
        {/* Background range */}
        <div className="absolute inset-x-0 h-3 bg-navy-light rounded-full" />

        {/* Green band (fair value zone) */}
        <div
          className="absolute h-3 bg-pe-green/20 border-y border-pe-green/30 rounded-full"
          style={{ left: '0%', right: '0%' }}
        />

        {/* Central estimate marker */}
        <div
          className="absolute flex flex-col items-center"
          style={{ left: `${centralPos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-0.5 h-5 bg-cyan/60" />
          <div className="w-2 h-2 rounded-full bg-cyan" />
        </div>

        {/* Asking price marker */}
        <div
          className={`absolute flex flex-col items-center ${askingAbove || askingBelow ? 'opacity-70' : ''}`}
          style={{
            left: askingAbove ? '100%' : askingBelow ? '0%' : `${askPos}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className={`w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent ${asking <= central ? 'border-b-pe-green' : 'border-b-pe-red'}`} />
          <div className={`w-2 h-2 rounded-full ${asking <= central ? 'bg-pe-green' : 'bg-pe-red'}`} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan" />
          <span className="text-navy-300">Fair value: <span className="text-white">{formatCurrency(central)}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${asking <= central ? 'bg-pe-green' : 'bg-pe-red'}`} />
          <span className="text-navy-300">Asking: <span className="text-white">{formatCurrency(asking)}</span></span>
        </div>
      </div>
    </div>
  );
}
