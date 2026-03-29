interface Props {
  label: string;
  score: number; // 0–100
  note?: string;
  weight: number; // 0–10 importance weight
}

function fitColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 55) return 'bg-cyan';
  if (score >= 40) return 'bg-gold';
  return 'bg-red-500';
}

function fitLabel(score: number): string {
  if (score >= 80) return 'Excellent fit';
  if (score >= 65) return 'Good fit';
  if (score >= 50) return 'Moderate fit';
  if (score >= 35) return 'Partial fit';
  return 'Poor fit';
}

export function FitDimensionBar({ label, score, note, weight }: Props) {
  const color = fitColor(score);
  const roundedScore = Math.round(score);

  return (
    <div className="py-3 border-b border-navy-border/50 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-charcoal">{label}</span>
          {weight >= 8 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
              Priority
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-navy-300">{fitLabel(roundedScore)}</span>
          <span className="text-sm font-semibold text-charcoal tabular-nums w-9 text-right">
            {roundedScore}
          </span>
        </div>
      </div>
      <div className="h-2 bg-navy-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${roundedScore}%` }}
        />
      </div>
      {note && <p className="text-xs text-navy-300 mt-1.5">{note}</p>}
    </div>
  );
}
