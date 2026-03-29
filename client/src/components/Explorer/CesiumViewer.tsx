import { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, Navigation, RotateCcw, Camera } from 'lucide-react';
import { LayerPanel } from './LayerPanel';
import { ThreeOverlay } from './ThreeOverlay';
import { DEFAULT_LAYERS } from './cesium-types';
import type { ExplorerLayer, LayerId, PropertyMarker, CommuteDestination } from './cesium-types';

// Cesium is loaded dynamically to keep the initial bundle small
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CesiumType = typeof import('cesium');

interface Props {
  property: PropertyMarker;
  floodHighRisk?: boolean;
  floodMediumRisk?: boolean;
  destinations?: CommuteDestination[];
  onClose?: () => void;
}

interface ScreenPos { x: number; y: number }

export function CesiumViewer({
  property,
  floodHighRisk = false,
  floodMediumRisk = false,
  destinations = [],
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const cesiumRef = useRef<CesiumType | null>(null);
  const [layers, setLayers] = useState<ExplorerLayer[]>(DEFAULT_LAYERS);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [cesiumReady, setCesiumReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Project geo coordinates to screen space (used by Three.js overlay)
  const projectToScreen = useCallback((lat: number, lng: number): ScreenPos | null => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!Cesium || !viewer) return null;
    try {
      const cartesian = Cesium.Cartesian3.fromDegrees(lng, lat);
      const scene = viewer.scene;
      const pos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, cartesian);
      if (!pos) return null;
      return { x: pos.x, y: pos.y };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { offsetWidth: w, offsetHeight: h } = container;
    setDimensions({ w, h });

    const observer = new ResizeObserver((entries) => {
      for (const e of entries) {
        setDimensions({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    observer.observe(container);

    // Dynamically import Cesium to avoid adding it to the initial bundle
    let destroyed = false;
    import('cesium').then(async (Cesium) => {
      if (destroyed || !containerRef.current) return;
      cesiumRef.current = Cesium;

      // Set Ion access token (optional — graceful degradation if absent)
      const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      if (ionToken) {
        Cesium.Ion.defaultAccessToken = ionToken;
      }

      try {
        // Configure viewer — use minimal UI for embedded mode
        const viewerOptions: Record<string, unknown> = {
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: document.createElement('div'), // hide credits
        };

        if (ionToken) {
          // Use Cesium World Terrain when Ion token is present
          viewerOptions.terrain = Cesium.Terrain.fromWorldTerrain({ requestWaterMask: true });
        }

        const viewer = new Cesium.Viewer(containerRef.current, viewerOptions);
        viewerRef.current = viewer;

        // Dark atmosphere
        viewer.scene.skyBox = new Cesium.SkyBox({
          sources: {
            positiveX: '', negativeX: '', positiveY: '',
            negativeY: '', positiveZ: '', negativeZ: '',
          },
        });
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#080e1a');
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.0002;

        // Add property marker
        viewer.entities.add({
          id: 'property-primary',
          position: Cesium.Cartesian3.fromDegrees(property.lng, property.lat),
          billboard: {
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            color: Cesium.Color.fromCssColorString('#00D9FF'),
            scale: 1.4,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            image: createPinCanvas('#00D9FF', property.label, '#080e1a'),
          },
          label: {
            text: `£${(property.askingPrice / 1000).toFixed(0)}k`,
            font: '12px Inter',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString('#080e1a'),
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, -46),
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });

        // Flood zone indicator (visual ring at property if high/medium risk)
        if (floodHighRisk || floodMediumRisk) {
          const color = floodHighRisk
            ? Cesium.Color.fromCssColorString('#FF4444').withAlpha(0.3)
            : Cesium.Color.fromCssColorString('#3B82F6').withAlpha(0.2);
          viewer.entities.add({
            id: 'flood-zone',
            position: Cesium.Cartesian3.fromDegrees(property.lng, property.lat),
            ellipse: {
              semiMajorAxis: 250,
              semiMinorAxis: 250,
              material: color,
              outline: true,
              outlineColor: floodHighRisk
                ? Cesium.Color.fromCssColorString('#FF4444').withAlpha(0.7)
                : Cesium.Color.fromCssColorString('#3B82F6').withAlpha(0.5),
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
          });
        }

        // Fly to property with cinematic arrival
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            property.lng,
            property.lat - 0.004, // slightly south of property so it's in the upper half of frame
            400,
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-30),
            roll: 0,
          },
          duration: 2.5,
          easingFunction: Cesium.EasingFunction.QUINTIC_IN_OUT,
        });

        setCesiumReady(true);
        setLoading(false);
      } catch (err) {
        console.warn('Cesium init error:', err);
        setError('3D view unavailable in this environment.');
        setLoading(false);
      }
    }).catch((err) => {
      console.warn('Cesium load error:', err);
      setError('Could not load 3D engine.');
      setLoading(false);
    });

    return () => {
      destroyed = true;
      observer.disconnect();
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch { /* ignore */ }
        viewerRef.current = null;
      }
    };
  }, [property.lat, property.lng, property.label, property.askingPrice, floodHighRisk, floodMediumRisk]);

  const handleToggleLayer = (id: LayerId) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l));
  };

  const handleFlyTo = () => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!Cesium || !viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(property.lng, property.lat - 0.004, 400),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30), roll: 0 },
      duration: 1.5,
    });
  };

  const handleResetTilt = () => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!Cesium || !viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(property.lng, property.lat, 600),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
      duration: 1,
    });
  };

  const layerEnabled = (id: LayerId) => layers.find(l => l.id === id)?.enabled ?? false;

  return (
    <div className="relative w-full h-full bg-navy overflow-hidden rounded-xl">
      {/* Cesium container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Three.js overlay */}
      {cesiumReady && (
        <ThreeOverlay
          cesiumContainer={containerRef.current}
          propertyLat={property.lat}
          propertyLng={property.lng}
          destinations={destinations}
          showArcs={layerEnabled('commute_arcs')}
          showRings={layerEnabled('distance_rings')}
          projectToScreen={projectToScreen}
          width={dimensions.w}
          height={dimensions.h}
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-navy flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-2 border-t-cyan border-navy-border animate-spin mx-auto mb-3" />
            <p className="text-sm text-navy-300">Loading 3D explorer…</p>
            <p className="text-xs text-navy-300/60 mt-1">Powered by CesiumJS</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 bg-navy flex items-center justify-center">
          <div className="text-center px-6">
            <p className="text-sm text-navy-300 mb-2">{error}</p>
            <p className="text-xs text-navy-300/60">
              WebGL may be unavailable. Try a different browser or device.
            </p>
          </div>
        </div>
      )}

      {/* Layer panel */}
      {cesiumReady && (
        <LayerPanel layers={layers} onToggle={handleToggleLayer} />
      )}

      {/* Camera controls */}
      {cesiumReady && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={handleFlyTo}
            className="w-9 h-9 rounded-lg bg-navy/90 border border-navy-border text-navy-300 hover:text-cyan flex items-center justify-center transition-colors"
            title="Fly to property"
          >
            <Navigation size={16} />
          </button>
          <button
            onClick={handleResetTilt}
            className="w-9 h-9 rounded-lg bg-navy/90 border border-navy-border text-navy-300 hover:text-cyan flex items-center justify-center transition-colors"
            title="Reset tilt"
          >
            <RotateCcw size={16} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-navy/90 border border-navy-border text-navy-300 hover:text-white flex items-center justify-center transition-colors"
              title="Exit 3D mode"
            >
              <Maximize2 size={16} />
            </button>
          )}
        </div>
      )}

      {/* Cesium attribution */}
      {cesiumReady && (
        <div className="absolute bottom-2 left-2 text-[10px] text-navy-300/40 pointer-events-none">
          Powered by CesiumJS
        </div>
      )}

      {/* Screenshot hint */}
      {cesiumReady && (
        <button
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-navy/80 border border-navy-border text-navy-300 hover:text-white flex items-center justify-center transition-colors"
          title="Capture view"
          onClick={() => {
            const viewer = viewerRef.current;
            if (!viewer) return;
            const canvas = viewer.scene.canvas as HTMLCanvasElement;
            const url = canvas.toDataURL();
            const a = document.createElement('a');
            a.download = 'neighbourhood-3d.png';
            a.href = url;
            a.click();
          }}
        >
          <Camera size={14} />
        </button>
      )}
    </div>
  );
}

// Create a pin marker canvas for the Cesium billboard
function createPinCanvas(color: string, label: string, bgColor: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 52;
  const ctx = canvas.getContext('2d')!;

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  // Pin body
  ctx.beginPath();
  ctx.arc(20, 18, 14, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Pin tail
  ctx.beginPath();
  ctx.moveTo(12, 28);
  ctx.lineTo(20, 52);
  ctx.lineTo(28, 28);
  ctx.fillStyle = color;
  ctx.fill();

  // Inner circle
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(20, 18, 8, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();

  // Label initial
  if (label) {
    ctx.fillStyle = color;
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 1).toUpperCase(), 20, 18);
  }

  return canvas;
}
