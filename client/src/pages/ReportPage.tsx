import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ReportShell } from '../components/report/ReportShell';
import { EmptyState } from '../components/ui/EmptyState';
import { getReport, reportCache } from './AnalysePage';
import { loadReport } from '../lib/firestoreService';
import { useAuthStore } from '../stores/authStore';
import { ArrowLeft, FileQuestion, Loader2 } from 'lucide-react';
import type { FullAnalysisResult } from '../types/analysis';
import type { PropertyInput } from '../types/property';

type Entry = { result: FullAnalysisResult; property: PropertyInput };

function getLocal(id: string): Entry | undefined {
  const mem = getReport(id);
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(`pe-report-${id}`);
    if (raw) {
      const entry = JSON.parse(raw) as Entry;
      reportCache.set(id, entry);
      return entry;
    }
  } catch { /* ignore */ }
  return undefined;
}

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [entry, setEntry] = useState<Entry | undefined>(() => id ? getLocal(id) : undefined);
  const [checking, setChecking] = useState(!entry && !!user && !!id);

  useEffect(() => {
    if (entry || !id || !user) { setChecking(false); return; }
    setChecking(true);
    loadReport(user.uid, id).then((remote) => {
      if (remote) {
        reportCache.set(id, remote);
        setEntry(remote);
      }
    }).catch(() => {}).finally(() => setChecking(false));
  }, [id, user]);

  if (checking) {
    return (
      <AppShell>
        <div className="flex items-center justify-center mt-32">
          <Loader2 size={24} className="animate-spin text-cyan" />
          <span className="ml-3 text-sm text-navy-300">Loading report…</span>
        </div>
      </AppShell>
    );
  }

  if (!entry) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto mt-16">
          <EmptyState
            icon={<FileQuestion size={28} />}
            title="Report not found"
            description="This report may have expired. Start a new analysis, or sign in to access your saved reports."
            action={
              <Link
                to="/analyse"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan text-white font-semibold text-sm"
              >
                <ArrowLeft size={14} /> New analysis
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/analyse"
            className="flex items-center gap-1.5 text-sm text-navy-300 hover:text-charcoal transition-colors"
          >
            <ArrowLeft size={14} /> New analysis
          </Link>
          <Link
            to="/workspace"
            className="flex items-center gap-1.5 text-sm text-navy-300 hover:text-charcoal transition-colors"
          >
            Workspace
          </Link>
        </div>
        <ReportShell result={entry.result} property={entry.property} />
      </div>
    </AppShell>
  );
}
