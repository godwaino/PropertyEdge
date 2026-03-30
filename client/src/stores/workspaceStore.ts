import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ShortlistEntry, ShortlistStatus, FullAnalysisResult } from '../types/analysis';
import type { PropertyInput } from '../types/property';

interface WorkspaceState {
  _uid: string | null;        // owner of the persisted data
  shortlist: ShortlistEntry[];
  compareIds: string[];

  addToShortlist: (property: PropertyInput, analysis: FullAnalysisResult) => void;
  removeFromShortlist: (propertyId: string) => void;
  updateStatus: (propertyId: string, status: ShortlistStatus) => void;
  isShortlisted: (propertyId: string) => boolean;
  clearShortlist: () => void;

  /** Called by authStore on every auth-state change. Clears data if the uid changes. */
  setOwner: (uid: string | null) => void;

  addToCompare: (analysisId: string) => void;
  removeFromCompare: (analysisId: string) => void;
  clearCompare: () => void;
  isInCompare: (analysisId: string) => boolean;
}

function makePropertyId(property: PropertyInput): string {
  return [property.postcode, property.address]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60);
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      _uid: null,
      shortlist: [],
      compareIds: [],

      addToShortlist: (property, analysis) => {
        const propertyId = makePropertyId(property);
        const existing = get().shortlist.find(e => e.propertyId === propertyId);
        if (existing) return;

        const entry: ShortlistEntry = {
          propertyId,
          analysisId: analysis.analysisId,
          address: property.address,
          postcode: property.postcode,
          askingPrice: property.askingPrice,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          addedAt: new Date().toISOString(),
          status: 'active',
          priority: get().shortlist.length + 1,
          scoreSnapshot: analysis.scores
            ? {
                overall: analysis.scores.overall.score,
                label: analysis.scores.overall.label,
                verdictCode: analysis.scores.overall.verdictCode,
              }
            : null,
          analysis,
        };

        set((s) => ({ shortlist: [entry, ...s.shortlist] }));
      },

      removeFromShortlist: (propertyId) =>
        set((s) => ({ shortlist: s.shortlist.filter(e => e.propertyId !== propertyId) })),

      updateStatus: (propertyId, status) =>
        set((s) => ({
          shortlist: s.shortlist.map(e =>
            e.propertyId === propertyId ? { ...e, status } : e,
          ),
        })),

      isShortlisted: (propertyId) =>
        get().shortlist.some(e => e.propertyId === propertyId),

      clearShortlist: () => set({ shortlist: [] }),

      setOwner: (uid) => {
        if (get()._uid !== uid) {
          // Different user — wipe shortlist so they start fresh
          set({ _uid: uid, shortlist: [], compareIds: [] });
        }
      },

      addToCompare: (analysisId) => {
        const ids = get().compareIds;
        if (ids.includes(analysisId) || ids.length >= 4) return;
        set({ compareIds: [...ids, analysisId] });
      },

      removeFromCompare: (analysisId) =>
        set((s) => ({ compareIds: s.compareIds.filter(id => id !== analysisId) })),

      clearCompare: () => set({ compareIds: [] }),

      isInCompare: (analysisId) => get().compareIds.includes(analysisId),
    }),
    {
      name: 'pe-workspace',
      partialize: (s) => ({ _uid: s._uid, shortlist: s.shortlist }),
    },
  ),
);
