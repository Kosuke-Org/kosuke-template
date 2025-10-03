'use client';

import { create } from 'zustand';

export type ViewMode = 'list' | 'kanban';

interface ViewModeState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const useViewModeStore = create<ViewModeState>((set) => ({
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),
}));
