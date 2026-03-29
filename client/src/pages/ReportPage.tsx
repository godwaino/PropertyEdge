import { useParams, Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ReportShell } from '../components/report/ReportShell';
import { EmptyState } from '../components/ui/EmptyState';
import { getReport, reportCache } from './AnalysePage';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import type { FullAnalysisResult } from '../types/analysis';
import type { PropertyInput } from '../types/property';

function getReportWithFallback(id: string) {
  const mem = getReport(id);
  if (mem) return mem;
  // Try sessionStorage (survives page refresh within same tab)
  try {
    const raw = sessionStorage.getItem(`pe-report-${id}`);
    if (raw) {
      const entry = JSON.parse(raw) as { result: FullAnalysisResult; property: PropertyInput };
      reportCache.set(id, entry); // warm in-memory cache
      return entry;
    }
  } catch { /* corrupt data — ignore */ }
  return undefined;
}

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const cached = id ? getReportWithFallback(id) : undefined;

  if (!cached) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto mt-16">
          <EmptyState
            icon={<FileQuestion size={28} />}
            title="Report not found"
            description="This report may have expired or the URL is incorrect. Start a new analysis to generate a fresh report."
            action={
              <Link
                to="/analyse"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan text-navy font-semibold text-sm"
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
            className="flex items-center gap-1.5 text-sm text-navy-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> New analysis
          </Link>
        </div>
        <ReportShell result={cached.result} property={cached.property} />
      </div>
    </AppShell>
  );
}
