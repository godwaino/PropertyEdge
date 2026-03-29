import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BuyerProfile {
  // Budget
  budgetMax: number | null;
  // Property requirements
  minBedrooms: number;
  preferredTenure: 'freehold' | 'leasehold' | 'any';
  // Priority weights (0 = not important, 10 = critical)
  weightPrice: number;       // How much price-value matters
  weightSpace: number;       // Square footage / bedrooms
  weightLowCrime: number;    // Crime safety
  weightFloodSafety: number; // Flood risk avoidance
  weightCommute: number;     // Transport links
  weightSchools: number;     // School quality
  weightOutdoor: number;     // Green space
}

interface ProfileState {
  profile: BuyerProfile;
  updateProfile: (patch: Partial<BuyerProfile>) => void;
  resetProfile: () => void;
}

const DEFAULT_PROFILE: BuyerProfile = {
  budgetMax: null,
  minBedrooms: 2,
  preferredTenure: 'any',
  weightPrice: 7,
  weightSpace: 6,
  weightLowCrime: 7,
  weightFloodSafety: 8,
  weightCommute: 5,
  weightSchools: 4,
  weightOutdoor: 4,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,

      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      resetProfile: () => set({ profile: DEFAULT_PROFILE }),
    }),
    { name: 'pe-profile' },
  ),
);
