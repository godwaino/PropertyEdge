import { Link, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { EmptyState } from '../components/ui/EmptyState';
import { VerdictBadge } from '../components/ui/VerdictBadge';
import { ScoreBar } from '../components/ui/ScoreBar';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { ShortlistStatus, ShortlistEntry } from '../types/analysis';
import { formatCurrency, formatRelativeTime, propertyTypeLabel } from '../utils/formatters';
import { LayoutGrid, Trash2, GitCompare, Home, ArrowRight, BarChart2 } from 'lucide-react';

const STATUS_OPTIONS: ShortlistStatus[] = [
  'active', 'watching', 'viewing_booked', 'offer_pending', 'rejected', 'archived',
];

const STATUS_LABEL: Record<ShortlistStatus, string> = {
  active: 'Active',
  watching: 'Watching',
  viewing_booked: 'Viewing Booked',
  offer_pending: 'Offer Pending',
  rejected: 'Rejected',
  archived: 'Archived',
};

const STATUS_COLOR: Record<ShortlistStatus, string> = {
  active: 'text-cyan bg-cyan/10 border-cyan/30',
  watching: 'text-gold bg-gold/10 border-gold/30',
  viewing_booked: 'text-pe-green bg-pe-green/10 border-pe-green/30',
  offer_pending: 'text-white bg-pe-green/20 border-pe-green/40',
  rejected: 'text-navy-300 bg-navy-light border-navy-border',
  archived: 'text-navy-300 bg-navy-light border-navy-border',
};

function PropertyCard({ entry }: { entry: ShortlistEntry }) {
  const { updateStatus, removeFromShortlist, addToCompare, isInCompare } = useWorkspaceStore();
  const inCompare = isInCompare(entry.analysisId);

  return (
    <div className="glass-card rounded-2xl border border-navy-border p-5 hover:border-navy-300/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-white font-medium truncate">{entry.address}</p>
          <p className="text-xs text-navy-300 mt-0.5">
            {entry.postcode} · {entry.bedrooms}bd · {propertyTypeLabel(entry.propertyType)}
          </p>
        </div>
        <div className="flex-shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLOR[entry.status]}`}>
            {STATUS_LABEL[entry.status]}
          </span>
        </div>
      </div>

      {/* Price + score */}
      <div className="flex items-center gap-4 mb-3">
        <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(entry.askingPrice)}</p>
        {entry.scoreSnapshot && (
          <VerdictBadge code={entry.scoreSnapshot.verdictCode} label={entry.scoreSnapshot.label} size="sm" />
        )}
      </div>

      {/* Score bar */}
      {entry.scoreSnapshot && (
        <div className="mb-4">
          <ScoreBar score={entry.scoreSnapshot.overall} size="sm" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          to={`/report/${entry.analysisId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-light border border-navy-border text-navy-300 hover:text-white text-xs font-medium transition-colors"
        >
          View report <ArrowRight size={12} />
        </Link>

        <button
          onClick={() => addToCompare(entry.analysisId)}
          disabled={inCompare}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            inCompare
              ? 'bg-cyan/10 border-cyan/30 text-cyan'
              : 'bg-navy-light border-navy-border text-navy-300 hover:text-white'
          }`}
        >
          <BarChart2 size={12} />
          {inCompare ? 'In compare' : 'Compare'}
        </button>

        <div className="ml-auto flex items-center gap-1">
          <select
            value={entry.status}
            onChange={e => updateStatus(entry.propertyId, e.target.value as ShortlistStatus)}
            className="text-xs bg-navy-light border border-navy-border rounded-lg px-2 py-1 text-navy-300 focus:outline-none"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>

          <button
            onClick={() => removeFromShortlist(entry.propertyId)}
            className="w-7 h-7 rounded-lg hover:bg-pe-red/10 text-navy-300 hover:text-pe-red flex items-center justify-center transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-navy-300 mt-2">Added {formatRelativeTime(entry.addedAt)}</p>
    </div>
  );
}

function CompareView() {
  const { shortlist, compareIds, removeFromCompare, clearCompare } = useWorkspaceStore();
  const selected = shortlist.filter(e => compareIds.includes(e.analysisId));

  if (selected.length < 2) {
    return (
      <EmptyState
        icon={<GitCompare size={28} />}
        title="Select properties to compare"
        description="Add at least 2 properties from your shortlist to start comparing."
        action={
          <Link to="/workspace" className="text-sm text-cyan hover:underline">
            Go to shortlist
          </Link>
        }
      />
    );
  }

  const DIMS = ['Valuation', 'Neighbourhood', 'Risk', 'Overall'] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Comparing {selected.length} properties</h2>
        <button onClick={clearCompare} className="text-xs text-navy-300 hover:text-white">
          Clear
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-navy-300 font-medium pb-4 pr-6 w-32">Dimension</th>
              {selected.map(e => (
                <th key={e.propertyId} className="text-center pb-4 px-3 min-w-[180px]">
                  <div className="text-white font-medium truncate">{e.address}</div>
                  <div className="text-xs text-navy-300">{formatCurrency(e.askingPrice)}</div>
                  <button
                    onClick={() => removeFromCompare(e.analysisId)}
                    className="text-[11px] text-navy-300/60 hover:text-navy-300 mt-1"
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIMS.map(dim => {
              const key = dim.toLowerCase() as 'valuation' | 'neighbourhood' | 'risk' | 'overall';
              return (
                <tr key={dim} className="border-t border-navy-border">
                  <td className="py-3 pr-6 text-xs font-medium text-navy-300">{dim}</td>
                  {selected.map(e => {
                    const score = e.analysis?.scores?.[key]?.score ?? null;
                    const label = e.analysis?.scores?.[key]?.label ?? '—';
                    const best = score !== null
                      ? Math.max(...selected.map(s => s.analysis?.scores?.[key]?.score ?? 0)) === score
                      : false;
                    return (
                      <td key={e.propertyId} className={`py-3 px-3 text-center ${best ? 'bg-pe-green/5' : ''}`}>
                        {score !== null ? (
                          <>
                            <p className={`text-base font-bold tabular-nums ${best ? 'text-pe-green' : 'text-white'}`}>{score}</p>
                            <p className="text-[11px] text-navy-300">{label}</p>
                            <div className="mt-1">
                              <ScoreBar score={score} showNumber={false} size="sm" />
                            </div>
                          </>
                        ) : (
                          <span className="text-navy-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WorkspacePage() {
  const location = useLocation();
  const isCompare = location.pathname.includes('compare');
  const { shortlist } = useWorkspaceStore();

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isCompare ? 'Compare' : 'Workspace'}
            </h1>
            {!isCompare && (
              <p className="text-sm text-navy-300 mt-0.5">
                {shortlist.length} saved {shortlist.length === 1 ? 'property' : 'properties'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/workspace"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                !isCompare ? 'bg-cyan/10 border-cyan/20 text-cyan' : 'border-navy-border text-navy-300 hover:text-white'
              }`}
            >
              <LayoutGrid size={14} /> Shortlist
            </Link>
            <Link
              to="/workspace/compare"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                isCompare ? 'bg-cyan/10 border-cyan/20 text-cyan' : 'border-navy-border text-navy-300 hover:text-white'
              }`}
            >
              <GitCompare size={14} /> Compare
            </Link>
          </div>
        </div>

        {isCompare ? (
          <div className="glass-card rounded-2xl border border-navy-border p-6">
            <CompareView />
          </div>
        ) : shortlist.length === 0 ? (
          <EmptyState
            icon={<Home size={28} />}
            title="Your shortlist is empty"
            description="Analyse a property and save it to start building your shortlist."
            action={
              <Link
                to="/analyse"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan text-navy font-semibold text-sm"
              >
                Analyse a property <ArrowRight size={14} />
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortlist.map(entry => (
              <PropertyCard key={entry.propertyId} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
