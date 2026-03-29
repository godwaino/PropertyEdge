interface Props {
  label: string;
  active?: boolean;
  estimated?: boolean;
}

export function SourceBadge({ label, active = true, estimated = false }: Props) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium';
  const color = !active
    ? 'text-navy-300 bg-navy-border/30 border-navy-border'
    : estimated
    ? 'text-gold bg-gold/10 border-gold/30'
    : 'text-cyan bg-cyan/10 border-cyan/30';

  return (
    <span className={`${base} ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? (estimated ? 'bg-gold' : 'bg-cyan') : 'bg-navy-300'}`} />
      {label}
      {estimated && <span className="opacity-60">(est.)</span>}
    </span>
  );
}
