import { confidenceColor } from '../../utils/scores';
import type { Confidence } from '../../types/analysis';

interface Props {
  confidence: Confidence | string;
  showIcon?: boolean;
}

const icons: Record<string, string> = { high: '●', medium: '◑', low: '○' };

export function ConfidencePill({ confidence, showIcon = true }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${confidenceColor(confidence)}`}>
      {showIcon && <span>{icons[confidence] ?? '○'}</span>}
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
    </span>
  );
}
