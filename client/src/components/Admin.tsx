import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ServerStats {
  uptime: number;
  startTime: number;
  totalRequests: number;
  analyzeRequests: number;
  demoRequests: number;
  extractRequests: number;
  cacheHits: number;
  rateLimitHits: number;
  errors: number;
  cacheSize: number;
  rateLimitActiveIps: number;
  recentRequests: RecentRequest[];
  apiKeyConfigured: boolean;
  adminKeyConfigured: boolean;
}

interface RecentRequest {
  ts: number;
  type: 'analyze' | 'demo' | 'extract';
  postcode?: string;
  verdict?: string;
  ms?: number;
  cached?: boolean;
}

interface AdminConfig {
  rateLimit: number;
  rateLimitWindowSec: number;
  cacheTtlMin: number;
  apiKeyConfigured: boolean;
  adminKeyConfigured: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const VERDICT_STYLES: Record<string, string> = {
  GOOD_DEAL:  'text-cyan bg-cyan/10 border-cyan/25',
  FAIR:       'text-gold bg-gold/10 border-gold/25',
  OVERPRICED: 'text-pe-red bg-pe-red/10 border-pe-red/25',
};

const TYPE_STYLES: Record<string, string> = {
  analyze: 'text-cyan bg-cyan/10',
  demo:    'text-gold bg-gold/10',
  extract: 'text-th-secondary bg-th-surface',
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`bg-th-card border rounded-2xl p-5 elevation-1 ${accent ? 'border-cyan/30' : 'border-th-border'}`}>
      <p className="text-th-muted text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${accent ? 'text-gradient-cyan' : 'text-th-heading'}`}>
        {value}
      </p>
      {sub && <p className="text-th-faint text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (key: string) => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-key': key.trim() },
      });
      if (res.ok) {
        onLogin(key.trim());
      } else {
        const data = await res.json();
        setError(data.message || 'Invalid admin key');
      }
    } catch {
      setError('Could not connect to server');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-th-page flex items-center justify-center px-4 hero-mesh">
      <div className="w-full max-w-sm animate-float-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-cyan mx-auto mb-4 flex items-center justify-center shadow-lg shadow-cyan/25">
            <svg className="w-7 h-7 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-th-heading tracking-tight">Admin dashboard</h1>
          <p className="text-th-muted text-sm mt-1">Property Scorecard control panel</p>
        </div>

        <div className="bg-th-card border border-th-border rounded-2xl p-6 elevation-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-th-body text-sm font-medium mb-1.5">Admin key</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter ADMIN_KEY…"
                className="w-full bg-th-input border border-th-border rounded-xl px-4 py-2.5 text-th-heading text-sm placeholder-th-muted focus:outline-none focus:border-cyan/60 focus:ring-1 focus:ring-cyan/20 transition-all"
                autoFocus
              />
            </div>
            {error && (
              <div className="bg-pe-red/10 border border-pe-red/25 rounded-xl px-4 py-2.5">
                <p className="text-pe-red text-sm">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="btn-pill w-full py-2.5 text-sm bg-cyan text-navy disabled:opacity-40 shadow-md shadow-cyan/20"
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
          </form>
          <p className="mt-4 text-th-faint text-xs text-center">
            Set <code className="font-mono bg-th-surface px-1 py-0.5 rounded text-th-muted">ADMIN_KEY</code> env var to enable access
          </p>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-th-muted text-xs hover:text-th-secondary transition-colors">
            ← Back to Property Scorecard
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ stats, config }: { stats: ServerStats; config: AdminConfig | null }) {
  const liveRatio = stats.totalRequests > 0
    ? Math.round((stats.analyzeRequests / stats.totalRequests) * 100)
    : 0;
  const cacheRatio = stats.analyzeRequests > 0
    ? Math.round((stats.cacheHits / stats.analyzeRequests) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Status row */}
      <div className="flex flex-wrap gap-2">
        <StatusPill ok={stats.apiKeyConfigured} label="API Key" ok_text="Configured" fail_text="Missing" />
        <StatusPill ok={stats.adminKeyConfigured} label="Admin Key" ok_text="Set" fail_text="Not set" />
        <StatusPill ok label="Server" ok_text={`Up ${fmtUptime(stats.uptime)}`} fail_text="Down" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total requests" value={stats.totalRequests} accent />
        <StatCard label="Live analyses" value={stats.analyzeRequests} sub={`${liveRatio}% of total`} />
        <StatCard label="Demo analyses" value={stats.demoRequests} />
        <StatCard label="Extractions" value={stats.extractRequests} />
        <StatCard label="Cache hits" value={stats.cacheHits} sub={`${cacheRatio}% of live`} />
        <StatCard label="Rate limited" value={stats.rateLimitHits} />
        <StatCard label="Errors" value={stats.errors} />
        <StatCard label="Cache size" value={stats.cacheSize} sub={`${stats.rateLimitActiveIps} active IPs`} />
      </div>

      {/* Config info */}
      {config && (
        <div className="bg-th-card border border-th-border rounded-2xl p-5 elevation-1">
          <h3 className="text-th-heading text-sm font-semibold mb-4">Server configuration</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-th-muted text-xs mb-0.5">Rate limit</p>
              <p className="text-th-heading font-semibold">{config.rateLimit} req / {config.rateLimitWindowSec}s</p>
            </div>
            <div>
              <p className="text-th-muted text-xs mb-0.5">Cache TTL</p>
              <p className="text-th-heading font-semibold">{config.cacheTtlMin} minutes</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ ok, label, ok_text, fail_text }: {
  ok: boolean; label: string; ok_text: string; fail_text: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
      ok
        ? 'bg-cyan/8 border-cyan/25 text-cyan'
        : 'bg-pe-red/8 border-pe-red/25 text-pe-red'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-cyan' : 'bg-pe-red'} animate-pulse`} />
      <span className="text-th-muted">{label}:</span>
      <span>{ok ? ok_text : fail_text}</span>
    </div>
  );
}

// ─── Cache tab ────────────────────────────────────────────────────────────────
function CacheTab({ stats, adminKey, onRefresh }: {
  stats: ServerStats; adminKey: string; onRefresh: () => void;
}) {
  const [clearing, setClearing] = useState(false);
  const [lastCleared, setLastCleared] = useState<string | null>(null);

  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/admin/cache/clear', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      setLastCleared(`Cleared ${data.cleared} entries at ${new Date().toLocaleTimeString('en-GB')}`);
      onRefresh();
    } catch {
      setLastCleared('Clear failed — server error');
    }
    setClearing(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-th-card border border-th-border rounded-2xl p-6 elevation-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-th-heading text-sm font-semibold mb-1">Valuation cache</h3>
            <p className="text-th-muted text-xs">
              Cached results prevent duplicate AI calls for the same property. TTL: 60 minutes.
            </p>
            {lastCleared && (
              <p className="text-cyan text-xs mt-2">{lastCleared}</p>
            )}
          </div>
          <button
            onClick={handleClear}
            disabled={clearing || stats.cacheSize === 0}
            className="btn-pill flex-shrink-0 px-5 py-2 text-sm bg-pe-red/10 text-pe-red border border-pe-red/25 hover:bg-pe-red hover:text-white disabled:opacity-40 transition-all"
          >
            {clearing ? 'Clearing…' : `Clear ${stats.cacheSize} entries`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Cached analyses" value={stats.cacheSize} accent />
        <StatCard label="Cache hits" value={stats.cacheHits} sub="saved AI calls" />
        <StatCard
          label="Hit rate"
          value={stats.analyzeRequests > 0 ? `${Math.round(stats.cacheHits / stats.analyzeRequests * 100)}%` : '—'}
          sub="of live analyses"
        />
      </div>
    </div>
  );
}

// ─── Requests tab ─────────────────────────────────────────────────────────────
function RequestsTab({ stats }: { stats: ServerStats }) {
  const requests = [...stats.recentRequests].reverse(); // newest first

  return (
    <div className="space-y-4">
      <div className="bg-th-card border border-th-border rounded-2xl overflow-hidden elevation-1">
        <div className="px-5 py-4 border-b border-th-border flex items-center justify-between">
          <h3 className="text-th-heading text-sm font-semibold">Recent requests</h3>
          <span className="text-th-muted text-xs">{requests.length} entries (newest first)</span>
        </div>
        {requests.length === 0 ? (
          <div className="px-5 py-10 text-center text-th-faint text-sm">
            No requests yet — run an analysis to see data here
          </div>
        ) : (
          <div className="divide-y divide-th-border">
            {requests.map((r, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-th-surface/50 transition-colors">
                {/* Type badge */}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${TYPE_STYLES[r.type] || ''}`}>
                  {r.type}
                </span>

                {/* Postcode */}
                <span className="text-th-heading text-sm font-mono font-medium flex-shrink-0 w-20">
                  {r.postcode || '—'}
                </span>

                {/* Verdict */}
                {r.verdict ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${VERDICT_STYLES[r.verdict] || 'text-th-muted border-th-border'}`}>
                    {r.verdict.replace('_', ' ')}
                  </span>
                ) : (
                  <span className="text-th-faint text-xs flex-shrink-0">—</span>
                )}

                {/* Cache badge */}
                {r.cached && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-th-surface text-th-muted flex-shrink-0">
                    cached
                  </span>
                )}

                {/* Duration */}
                {r.ms !== undefined && (
                  <span className="text-th-faint text-xs ml-auto flex-shrink-0">
                    {r.ms < 1000 ? `${r.ms}ms` : `${(r.ms / 1000).toFixed(1)}s`}
                  </span>
                )}

                {/* Time */}
                <span className="text-th-faint text-xs flex-shrink-0 tabular-nums" title={fmtDate(r.ts)}>
                  {fmtTime(r.ts)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin component ─────────────────────────────────────────────────────
type Tab = 'overview' | 'cache' | 'requests';

export default function Admin() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('pe_admin_key') || '');
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loadErr, setLoadErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const isLoggedIn = !!adminKey;

  const fetchData = useCallback(async () => {
    if (!adminKey) return;
    setRefreshing(true);
    try {
      const [statsRes, configRes] = await Promise.all([
        fetch('/api/admin/stats',  { headers: { 'x-admin-key': adminKey } }),
        fetch('/api/admin/config', { headers: { 'x-admin-key': adminKey } }),
      ]);
      if (!statsRes.ok) {
        setLoadErr('Session expired — please log in again');
        setAdminKey('');
        sessionStorage.removeItem('pe_admin_key');
        return;
      }
      setStats(await statsRes.json());
      if (configRes.ok) setConfig(await configRes.json());
      setLoadErr('');
    } catch {
      setLoadErr('Failed to fetch data');
    }
    setRefreshing(false);
  }, [adminKey]);

  const handleLogin = (key: string) => {
    setAdminKey(key);
    sessionStorage.setItem('pe_admin_key', key);
  };

  // Initial fetch
  useEffect(() => {
    if (adminKey) fetchData();
  }, [adminKey, fetchData]);

  // Auto-refresh every 15s
  useEffect(() => {
    if (!autoRefresh || !adminKey) return;
    const t = setInterval(fetchData, 15_000);
    return () => clearInterval(t);
  }, [autoRefresh, adminKey, fetchData]);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'cache',    label: 'Cache',    icon: '💾' },
    { id: 'requests', label: 'Requests', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-th-page">
      <div className="max-w-5xl mx-auto px-5 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-th-heading tracking-tight">Admin dashboard</h1>
            {stats && (
              <p className="text-th-muted text-sm mt-0.5">
                Server started {new Date(stats.startTime).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                autoRefresh
                  ? 'bg-cyan/10 border-cyan/30 text-cyan'
                  : 'border-th-border text-th-muted'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-cyan animate-pulse' : 'bg-th-muted'}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>

            {/* Manual refresh */}
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="btn-pill px-4 py-1.5 text-xs bg-th-card border border-th-border text-th-secondary hover:text-cyan hover:border-cyan/40 disabled:opacity-50 elevation-1"
            >
              {refreshing ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-th-border border-t-cyan rounded-full animate-spin-slow" />
                  Refreshing…
                </span>
              ) : 'Refresh'}
            </button>

            {/* Sign out */}
            <button
              onClick={() => {
                setAdminKey('');
                sessionStorage.removeItem('pe_admin_key');
              }}
              className="btn-pill px-4 py-1.5 text-xs border border-th-border text-th-muted hover:text-pe-red hover:border-pe-red/40 transition-all"
            >
              Sign out
            </button>
          </div>
        </div>

        {loadErr && (
          <div className="mb-6 bg-pe-red/10 border border-pe-red/25 rounded-xl px-4 py-3">
            <p className="text-pe-red text-sm">{loadErr}</p>
          </div>
        )}

        {!stats ? (
          <div className="flex items-center justify-center py-24 text-th-muted text-sm gap-3">
            <span className="w-5 h-5 border-2 border-th-border border-t-cyan rounded-full animate-spin-slow" />
            Loading…
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 bg-th-card border border-th-border rounded-2xl p-1 mb-6 w-fit elevation-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    tab === t.id
                      ? 'bg-cyan text-navy shadow-sm shadow-cyan/20'
                      : 'text-th-muted hover:text-th-secondary'
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="animate-fade-in">
              {tab === 'overview'  && <OverviewTab stats={stats} config={config} />}
              {tab === 'cache'     && <CacheTab stats={stats} adminKey={adminKey} onRefresh={fetchData} />}
              {tab === 'requests'  && <RequestsTab stats={stats} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
