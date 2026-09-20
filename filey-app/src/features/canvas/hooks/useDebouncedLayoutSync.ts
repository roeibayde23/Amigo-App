import { useEffect, useRef } from 'react';

import type { CanvasLayout } from '@/src/features/canvas/types';
import { updateFileLayout } from '@/src/features/files/api/filesApi';

const SYNC_DELAY_MS = 400;

/**
 * Batches rapid drag/resize updates into a single Supabase write per file,
 * fired shortly after the user's finger lifts, instead of hammering the
 * network on every gesture frame.
 */
export function useDebouncedLayoutSync() {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();
    };
  }, []);

  return (id: string, layout: CanvasLayout) => {
    const existingTimer = timers.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      timers.current.delete(id);
      updateFileLayout(id, layout).catch((error) => {
        console.warn('Failed to persist layout for file', id, error);
      });
    }, SYNC_DELAY_MS);

    timers.current.set(id, timer);
  };
}
