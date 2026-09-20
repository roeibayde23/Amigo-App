import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { getPreviewUrl } from '@/src/features/files/api/filesApi';
import type { CanvasFile, CanvasLayout } from '@/src/features/canvas/types';
import { MAX_CARD_SIZE, MIN_CARD_SIZE } from '@/src/features/canvas/types';

interface FileCardProps {
  file: CanvasFile;
  canvasWidth: number;
  canvasHeight: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onLayoutCommit: (id: string, layout: CanvasLayout) => void;
}

function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

function extensionLabel(name: string, mimeType: string) {
  const dot = name.lastIndexOf('.');
  if (dot > -1 && dot < name.length - 1) return name.slice(dot + 1).toUpperCase();
  return mimeType.split('/')[1]?.toUpperCase() ?? 'FILE';
}

export function FileCard({
  file,
  canvasWidth,
  canvasHeight,
  isSelected,
  onSelect,
  onLayoutCommit,
}: FileCardProps) {
  const translateX = useSharedValue(file.x);
  const translateY = useSharedValue(file.y);
  const width = useSharedValue(file.width);
  const height = useSharedValue(file.height);

  // Anchors captured at gesture start so onUpdate can compute deltas from a
  // fixed baseline instead of drifting frame-to-frame.
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startWidth = useSharedValue(0);
  const startHeight = useSharedValue(0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (isImage(file.mimeType)) {
      getPreviewUrl(file.storagePath).then((url) => {
        if (!cancelled) setPreviewUrl(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [file.mimeType, file.storagePath]);

  const commitLayout = () => {
    onLayoutCommit(file.id, {
      x: translateX.value,
      y: translateY.value,
      width: width.value,
      height: height.value,
    });
  };

  const selectFile = () => onSelect(file.id);

  const dragGesture = Gesture.Pan()
    .minDistance(4)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      runOnJS(selectFile)();
    })
    .onUpdate((event) => {
      const maxX = Math.max(0, canvasWidth - width.value);
      const maxY = Math.max(0, canvasHeight - height.value);
      translateX.value = Math.min(Math.max(startX.value + event.translationX, 0), maxX);
      translateY.value = Math.min(Math.max(startY.value + event.translationY, 0), maxY);
    })
    .onEnd(() => {
      runOnJS(commitLayout)();
    });

  const resizeGesture = Gesture.Pan()
    .onStart(() => {
      startWidth.value = width.value;
      startHeight.value = height.value;
      runOnJS(selectFile)();
    })
    .onUpdate((event) => {
      const maxWidth = Math.min(MAX_CARD_SIZE, canvasWidth - translateX.value);
      const maxHeight = Math.min(MAX_CARD_SIZE, canvasHeight - translateY.value);
      width.value = Math.min(Math.max(startWidth.value + event.translationX, MIN_CARD_SIZE), maxWidth);
      height.value = Math.min(Math.max(startHeight.value + event.translationY, MIN_CARD_SIZE), maxHeight);
    })
    .onEnd(() => {
      runOnJS(commitLayout)();
    });

  dragGesture.requireExternalGestureToFail(resizeGesture);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    width: width.value,
    height: height.value,
    zIndex: file.zIndex,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    zIndex: file.zIndex + 1,
  }));

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View style={[styles.card, cardStyle, isSelected && styles.cardSelected]}>
        <View style={styles.previewArea}>
          {previewUrl ? (
            <Image source={{ uri: previewUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={styles.filePlaceholder}>
              <ThemedText style={styles.fileExt}>{extensionLabel(file.name, file.mimeType)}</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.nameTag} pointerEvents="none">
          <Text numberOfLines={1} style={styles.nameText}>
            {file.name}
          </Text>
        </View>

        <GestureDetector gesture={resizeGesture}>
          <Animated.View style={[styles.resizeHandle, handleStyle]}>
            <View style={styles.resizeKnob} />
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#5B8DEF',
  },
  previewArea: {
    flex: 1,
    backgroundColor: '#EEF1F6',
  },
  filePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileExt: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5B6472',
    letterSpacing: 0.5,
  },
  nameTag: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  nameText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  resizeHandle: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resizeKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#5B8DEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});
