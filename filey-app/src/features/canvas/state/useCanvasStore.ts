import { create } from 'zustand';

import type { CanvasFile, CanvasLayout } from '@/src/features/canvas/types';

interface CanvasState {
  items: Record<string, CanvasFile>;
  order: string[];
  topZIndex: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;

  setLoading: () => void;
  setError: (message: string) => void;
  setAll: (files: CanvasFile[]) => void;
  addFile: (file: CanvasFile) => void;
  removeFile: (id: string) => void;
  updateLayout: (id: string, layout: Partial<CanvasLayout>) => void;
  bringToFront: (id: string) => number;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  items: {},
  order: [],
  topZIndex: 0,
  status: 'idle',
  error: null,

  setLoading: () => set({ status: 'loading', error: null }),

  setError: (message) => set({ status: 'error', error: message }),

  setAll: (files) => {
    const items: Record<string, CanvasFile> = {};
    let topZIndex = 0;
    for (const file of files) {
      items[file.id] = file;
      if (file.zIndex > topZIndex) topZIndex = file.zIndex;
    }
    set({
      items,
      order: files.map((f) => f.id),
      topZIndex,
      status: 'ready',
      error: null,
    });
  },

  addFile: (file) =>
    set((state) => ({
      items: { ...state.items, [file.id]: file },
      order: [...state.order, file.id],
      topZIndex: Math.max(state.topZIndex, file.zIndex),
    })),

  removeFile: (id) =>
    set((state) => {
      const next = { ...state.items };
      delete next[id];
      return { items: next, order: state.order.filter((itemId) => itemId !== id) };
    }),

  updateLayout: (id, layout) =>
    set((state) => {
      const existing = state.items[id];
      if (!existing) return state;
      return {
        items: {
          ...state.items,
          [id]: { ...existing, ...layout },
        },
      };
    }),

  bringToFront: (id) => {
    const nextZ = get().topZIndex + 1;
    set((state) => {
      const existing = state.items[id];
      if (!existing) return state;
      return {
        items: { ...state.items, [id]: { ...existing, zIndex: nextZ } },
        topZIndex: nextZ,
      };
    });
    return nextZ;
  },
}));
