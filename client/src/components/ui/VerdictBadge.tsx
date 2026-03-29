import { verdictBg } from '../../utils/scores';
import type { VerdictCode } from '../../types/analysis';

interface Props {
  code: VerdictCode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VerdictBadge({ code, label, size = 'md' }: Props) {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-block font-semibold rounded-full border ${padding} ${verdictBg(code)}`}>
      {label}
    </span>
  );
}
