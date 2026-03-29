import { Layers, X } from 'lucide-react';
import type { ExplorerLayer, LayerId } from './cesium-types';

interface Props {
  layers: ExplorerLayer[];
  onToggle: (id: LayerId) => void;
  onClose?: () => void;
}

export function LayerPanel({ layers, onToggle, onClose }: Props) {
  return (
    <div className="absolute top-4 left-4 z-10 w-52 glass-card rounded-xl border border-navy-border shadow-xl">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-navy-border">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-cyan" />
          <span className="text-xs font-semibold text-white">Layers</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-navy-300 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="py-1">
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => onToggle(layer.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors hover:bg-navy-light ${
              layer.enabled ? 'text-white' : 'text-navy-300'
            }`}
          >
            {/* Toggle indicator */}
            <div
              className={`w-7 h-3.5 rounded-full border transition-all flex-shrink-0 ${
                layer.enabled ? 'border-transparent' : 'border-navy-border bg-navy-light'
              }`}
              style={layer.enabled ? { backgroundColor: layer.color } : {}}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  layer.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                } mt-[1px]`}
              />
            </div>
            <span>{layer.icon}</span>
            <span className="flex-1 text-left">{layer.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
