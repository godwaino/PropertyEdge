import { formatCurrency, formatMonthYear, propertyTypeLabel } from '../../../utils/formatters';
import type { Comparable } from '../../../types/analysis';

interface Props {
  comparables: Comparable[];
  askingPrice: number;
}

export function ComparablesSalesTable({ comparables, askingPrice }: Props) {
  if (comparables.length === 0) {
    return (
      <div className="text-center py-8 text-navy-300 text-sm">
        No comparable sales data available for this area.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-border">
            <th className="text-left text-xs font-medium text-navy-300 pb-2 pr-4">Address</th>
            <th className="text-right text-xs font-medium text-navy-300 pb-2 pr-4">Sold</th>
            <th className="text-right text-xs font-medium text-navy-300 pb-2 pr-4">Date</th>
            <th className="text-right text-xs font-medium text-navy-300 pb-2">vs Asking</th>
          </tr>
        </thead>
        <tbody>
          {comparables.map((c, i) => {
            const diff = ((c.price - askingPrice) / askingPrice) * 100;
            const diffLabel = diff >= 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`;
            return (
              <tr key={i} className="border-b border-navy-border/50 hover:bg-navy-light/30 transition-colors">
                <td className="py-2.5 pr-4">
                  <p className="text-white text-xs truncate max-w-[180px]">{c.address}</p>
                  <p className="text-navy-300 text-[11px]">
                    {propertyTypeLabel(c.propertyType)} · {c.tenure}
                    {c.newBuild && ' · New build'}
                  </p>
                </td>
                <td className="py-2.5 pr-4 text-right font-semibold text-white tabular-nums">
                  {formatCurrency(c.price)}
                </td>
                <td className="py-2.5 pr-4 text-right text-navy-300 tabular-nums text-xs">
                  {formatMonthYear(c.date)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-xs font-medium">
                  <span className={diff < 0 ? 'text-pe-green' : 'text-pe-red'}>{diffLabel}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-navy-300 mt-3">
        Source: HM Land Registry · Prices paid data
      </p>
    </div>
  );
}
