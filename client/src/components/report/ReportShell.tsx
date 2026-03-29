import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { OverviewSection } from './Overview/OverviewSection';
import { ValuationSection } from './Valuation/ValuationSection';
import { NeighbourhoodSection } from './Neighbourhood/NeighbourhoodSection';
import { RiskSection } from './Risks/RiskSection';
import { NextStepsSection } from './NextSteps/NextStepsSection';
import { FitSection } from './Fit/FitSection';
import { VerdictBadge } from '../ui/VerdictBadge';
import type { FullAnalysisResult } from '../../types/analysis';
import type { PropertyInput } from '../../types/property';
import { formatCurrency } from '../../utils/formatters';
import { Bookmark, BookmarkCheck, BarChart2, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'neighbourhood', label: 'Neighbourhood' },
  { id: 'risks', label: 'Risks' },
  { id: 'fit', label: 'Fit Score' },
  { id: 'next-steps', label: 'Next Steps' },
];

interface Props {
  result: FullAnalysisResult;
  property: PropertyInput;
}

export function ReportShell({ result, property }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [printing, setPrinting] = useState(false);
  const { addToShortlist, removeFromShortlist, isShortlisted, shortlist } = useWorkspaceStore();

  const handlePrint = () => {
    setPrinting(true);
  };

  useEffect(() => {
    if (!printing) return;
    // Give React one frame to render all sections, then print
    const timer = setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [printing]);

  const propertyId = [property.postcode, property.address].join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  const saved = isShortlisted(propertyId);

  const handleSave = () => {
    if (saved) removeFromShortlist(propertyId);
    else addToShortlist(property, result);
  };

  return (
    <div>
      {/* Property identity bar */}
      <div className="glass-card rounded-2xl border border-navy-border p-4 mb-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="min-w-0">
          <p className="text-xs text-navy-300 mb-0.5">{property.postcode}</p>
          <p className="text-white font-semibold truncate">{property.address}</p>
          <p className="text-sm text-navy-300 mt-0.5">
            {formatCurrency(property.askingPrice)} · {property.bedrooms}bd · {property.propertyType}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <VerdictBadge
            code={result.scores.overall.verdictCode}
            label={result.scores.overall.label}
          />
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              saved
                ? 'bg-cyan/10 border-cyan/30 text-cyan'
                : 'border-navy-border text-navy-300 hover:text-white hover:border-navy-300'
            }`}
          >
            {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {saved ? 'Saved' : 'Save'}
          </button>
          {saved && shortlist.length >= 2 && (
            <Link
              to="/workspace/compare"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-border text-navy-300 hover:text-white hover:border-navy-300 text-sm font-medium transition-colors"
            >
              <BarChart2 size={14} />
              Compare
            </Link>
          )}
          <button
            onClick={handlePrint}
            className="print:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-border text-navy-300 hover:text-white hover:border-navy-300 text-sm font-medium transition-colors"
            title="Export as PDF"
          >
            <Printer size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Tab navigation — hidden when printing */}
      {!printing && (
        <div className="print:hidden flex items-center gap-1 overflow-x-auto pb-1 mb-6 no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-cyan/10 text-cyan border border-cyan/20'
                  : 'text-navy-300 hover:text-white hover:bg-navy-light'
              }`}
            >
              {tab.label}
              {tab.id === 'risks' && result.riskReport.criticalRiskFound && (
                <span className="ml-1.5 w-4 h-4 rounded-full bg-pe-red text-white text-[10px] inline-flex items-center justify-center">!</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tab content — all sections shown when printing */}
      {printing ? (
        <div className="space-y-8">
          <OverviewSection result={result} onTabClick={setActiveTab} />
          <ValuationSection result={result} />
          <NeighbourhoodSection result={result} />
          <RiskSection result={result} />
          <FitSection
            result={result}
            askingPrice={property.askingPrice}
            bedrooms={property.bedrooms}
            tenure={property.tenure ?? 'Unknown'}
          />
          <NextStepsSection result={result} />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewSection result={result} onTabClick={setActiveTab} />
          )}
          {activeTab === 'valuation' && <ValuationSection result={result} />}
          {activeTab === 'neighbourhood' && <NeighbourhoodSection result={result} />}
          {activeTab === 'risks' && <RiskSection result={result} />}
          {activeTab === 'fit' && (
            <FitSection
              result={result}
              askingPrice={property.askingPrice}
              bedrooms={property.bedrooms}
              tenure={property.tenure ?? 'Unknown'}
            />
          )}
          {activeTab === 'next-steps' && <NextStepsSection result={result} />}
        </>
      )}
    </div>
  );
}
