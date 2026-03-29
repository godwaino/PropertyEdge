import { create } from 'zustand';

interface UiState {
  demoMode: boolean;
  apiKeyConfigured: boolean;
  sidebarOpen: boolean;
  activeReportTab: string;

  setDemoMode: (v: boolean) => void;
  setApiKeyConfigured: (v: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  setActiveReportTab: (tab: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  demoMode: false,
  apiKeyConfigured: false,
  sidebarOpen: false,
  activeReportTab: 'overview',

  setDemoMode: (v) => set({ demoMode: v }),
  setApiKeyConfigured: (v) => set({ apiKeyConfigured: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setActiveReportTab: (tab) => set({ activeReportTab: tab }),
}));
