import { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { EmptyCanvasState } from '@/src/features/canvas/components/EmptyCanvasState';
import { FileCard } from '@/src/features/canvas/components/FileCard';
import { SelectionToolbar } from '@/src/features/canvas/components/SelectionToolbar';
import { useDebouncedLayoutSync } from '@/src/features/canvas/hooks/useDebouncedLayoutSync';
import { useCanvasStore } from '@/src/features/canvas/state/useCanvasStore';
import type { CanvasLayout } from '@/src/features/canvas/types';
import { deleteFile, updateFileZIndex } from '@/src/features/files/api/filesApi';

export function CanvasWorkspace() {
  const items = useCanvasStore((state) => state.items);
  const order = useCanvasStore((state) => state.order);
  const updateLayout = useCanvasStore((state) => state.updateLayout);
  const bringToFront = useCanvasStore((state) => state.bringToFront);
  const removeFile = useCanvasStore((state) => state.removeFile);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const scheduleLayoutSync = useDebouncedLayoutSync();

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      const current = items[id];
      if (current && current.zIndex < useCanvasStore.getState().topZIndex) {
        const nextZ = bringToFront(id);
        updateFileZIndex(id, nextZ).catch((error) => {
          console.warn('Failed to persist z-index for file', id, error);
        });
      }
    },
    [bringToFront, items]
  );

  const handleLayoutCommit = useCallback(
    (id: string, layout: CanvasLayout) => {
      updateLayout(id, layout);
      scheduleLayoutSync(id, layout);
    },
    [scheduleLayoutSync, updateLayout]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const file = items[id];
      if (!file) return;
      setSelectedId(null);
      removeFile(id);
      try {
        await deleteFile(id, file.storagePath);
      } catch (error) {
        console.warn('Failed to delete file', id, error);
      }
    },
    [items, removeFile]
  );

  return (
    <View
      style={styles.canvas}
      onLayout={handleLayout}
      onTouchStart={() => setSelectedId(null)}
    >
      {order.length === 0 && <EmptyCanvasState />}

      {size.width > 0 &&
        order.map((id) => {
          const file = items[id];
          if (!file) return null;
          return (
            <FileCard
              key={id}
              file={file}
              canvasWidth={size.width}
              canvasHeight={size.height}
              isSelected={selectedId === id}
              onSelect={handleSelect}
              onLayoutCommit={handleLayoutCommit}
            />
          );
        })}

      {selectedId && items[selectedId] && (
        <SelectionToolbar file={items[selectedId]} onDelete={handleDelete} onDismiss={() => setSelectedId(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    position: 'relative',
  },
});
