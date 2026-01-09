'use client';

import { create } from 'zustand';

interface IframeMessageHandlerStore {
  parentUrl: string | null;
  setParentUrl: (url: string | null) => void;
}

export const useIframeMessageHandlerStore = create<IframeMessageHandlerStore>((set) => ({
  parentUrl: null,
  setParentUrl: (url) => set({ parentUrl: url }),
}));
