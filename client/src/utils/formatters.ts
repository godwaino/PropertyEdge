export const formatCurrency = (amount: number, compact = false): string => {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `£${(amount / 1_000_000).toFixed(2)}m`;
  }
  if (compact && Math.abs(amount) >= 1_000) {
    return `£${(amount / 1_000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount);
};

export const formatDelta = (delta: number): string => {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${formatCurrency(delta)}`;
};

export const formatPct = (pct: number, decimals = 1): string => {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
};

export const formatDistance = (metres: number): string => {
  if (metres < 1000) return `${Math.round(metres)}m`;
  return `${(metres / 1000).toFixed(1)}km`;
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatMonthYear = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

export const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

export const slugify = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const propertyTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    terraced: 'Terraced',
    semi: 'Semi-detached',
    semi_detached: 'Semi-detached',
    detached: 'Detached',
    flat: 'Flat / Apartment',
    bungalow: 'Bungalow',
    other: 'Other',
  };
  return map[type.toLowerCase()] ?? type;
};
