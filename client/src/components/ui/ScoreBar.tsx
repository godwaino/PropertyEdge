import { scoreBarColor, scoreColor } from '../../utils/scores';

interface Props {
  score: number;
  label?: string;
  showNumber?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function ScoreBar({ score, label, showNumber = true, size = 'md', animated = true }: Props) {
  const barH = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className="w-full">
      {(label || showNumber) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className={`${textSize} text-navy-300`}>{label}</span>}
          {showNumber && (
            <span className={`${textSize} font-semibold tabular-nums ${scoreColor(score)}`}>
              {score}
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${barH} bg-navy-border rounded-full overflow-hidden`}>
        <div
          className={`${barH} rounded-full ${scoreBarColor(score)} ${animated ? 'transition-all duration-700 ease-out' : ''}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
