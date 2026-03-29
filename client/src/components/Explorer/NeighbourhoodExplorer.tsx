import { useState } from 'react';
import { Map, Layers, ExternalLink } from 'lucide-react';
import { CesiumViewer } from './CesiumViewer';
import type { FullAnalysisResult } from '../../types/analysis';
import type { PropertyMarker } from './cesium-types';

interface Props {
  result: FullAnalysisResult;
}

type ViewMode = '2d' | '3d';

export function NeighbourhoodExplorer({ result }: Props) {
  const [mode, setMode] = useState<ViewMode>('3d');
  const { neighbourhoodReport, valuationReport } = result;

  const lat = neighbourhoodReport.lat;
  const lng = neighbourhoodReport.lng;
  const hasCoords = lat !== null && lng !== null;

  if (!hasCoords) {
    return (
      <div className="w-full h-64 rounded-xl bg-navy-light border border-navy-border flex items-center justify-center">
        <p className="text-sm text-navy-300">Location coordinates unavailable for this property.</p>
      </div>
    );
  }

  const propertyMarker: PropertyMarker = {
    lat: lat!,
    lng: lng!,
    label: neighbourhoodReport.postcode,
    askingPrice: valuationReport.askingPrice,
    isPrimary: true,
  };

  const floodHighRisk = neighbourhoodReport.floodRisk?.zone3HighRisk ?? false;
  const floodMediumRisk = neighbourhoodReport.floodRisk?.zone2MediumRisk ?? false;

  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng! - 0.02},${lat! - 0.015},${lng! + 0.02},${lat! + 0.015}&layer=mapnik&marker=${lat},${lng}`;
  const osmLinkUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-navy-border">
      {/* Toggle bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-navy-light border-b border-navy-border">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-cyan" />
          <span className="text-xs font-semibold text-white">Location Explorer</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-navy-border p-0.5">
          <button
            onClick={() => setMode('2d')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === '2d'
                ? 'bg-cyan text-navy font-semibold'
                : 'text-navy-300 hover:text-white'
            }`}
          >
            <Map size={12} />
            2D Map
          </button>
          <button
            onClick={() => setMode('3d')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === '3d'
                ? 'bg-cyan text-navy font-semibold'
                : 'text-navy-300 hover:text-white'
            }`}
          >
            <Layers size={12} />
            3D Explorer
          </button>
        </div>
      </div>

      {/* Map area */}
      <div className="relative w-full h-[420px]">
        {mode === '3d' ? (
          <CesiumViewer
            property={propertyMarker}
            floodHighRisk={floodHighRisk}
            floodMediumRisk={floodMediumRisk}
            destinations={[]}
          />
        ) : (
          <div className="relative w-full h-full bg-navy">
            <iframe
              title="OpenStreetMap"
              src={osmUrl}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <a
              href={osmLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-navy-300/70 hover:text-white bg-navy/80 rounded px-2 py-1 transition-colors"
            >
              <ExternalLink size={10} />
              OpenStreetMap
            </a>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="px-4 py-2 bg-navy-light border-t border-navy-border">
        <p className="text-[11px] text-navy-300/70">
          {mode === '3d'
            ? 'Use scroll to zoom, drag to orbit. Layers panel top-left. Camera controls bottom-right.'
            : `${neighbourhoodReport.postcode} · ${neighbourhoodReport.adminDistrict || neighbourhoodReport.region}`}
        </p>
      </div>
    </div>
  );
}
