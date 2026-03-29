// Layer IDs for the 3D explorer
export type LayerId =
  | 'amenities'
  | 'schools'
  | 'transport'
  | 'flood'
  | 'greenspace'
  | 'crime'
  | 'commute_arcs'
  | 'distance_rings';

export interface ExplorerLayer {
  id: LayerId;
  label: string;
  icon: string;
  enabled: boolean;
  color: string;
}

export const DEFAULT_LAYERS: ExplorerLayer[] = [
  { id: 'commute_arcs', label: 'Commute Routes', icon: '🚇', enabled: true, color: '#00D9FF' },
  { id: 'distance_rings', label: 'Distance Rings', icon: '⭕', enabled: true, color: '#FFD700' },
  { id: 'flood', label: 'Flood Risk', icon: '💧', enabled: true, color: '#3B82F6' },
  { id: 'crime', label: 'Crime Heat', icon: '🔴', enabled: false, color: '#FF4444' },
  { id: 'amenities', label: 'Amenities', icon: '🛒', enabled: false, color: '#00E676' },
  { id: 'greenspace', label: 'Green Space', icon: '🌳', enabled: false, color: '#22C55E' },
];

export interface PropertyMarker {
  lat: number;
  lng: number;
  label: string;
  askingPrice: number;
  isPrimary: boolean;
}

export interface CommuteDestination {
  lat: number;
  lng: number;
  label: string;
  mode: string;
  durationMins: number;
}
