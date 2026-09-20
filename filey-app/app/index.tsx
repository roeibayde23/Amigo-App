import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useEnsureSession } from '@/src/features/auth/useEnsureSession';
import { AddFileFab } from '@/src/features/canvas/components/AddFileFab';
import { CanvasWorkspace } from '@/src/features/canvas/components/CanvasWorkspace';
import { useCanvasStore } from '@/src/features/canvas/state/useCanvasStore';
import { fetchFiles } from '@/src/features/files/api/filesApi';

export default function HomeScreen() {
  const { userId, error: authError } = useEnsureSession();
  const status = useCanvasStore((state) => state.status);
  const storeError = useCanvasStore((state) => state.error);
  const setAll = useCanvasStore((state) => state.setAll);
  const setLoading = useCanvasStore((state) => state.setLoading);
  const setError = useCanvasStore((state) => state.setError);

  useEffect(() => {
    if (!userId) return;
    setLoading();
    fetchFiles(userId)
      .then(setAll)
      .catch((error) => setError(error instanceof Error ? error.message : 'Failed to load files'));
  }, [userId, setAll, setError, setLoading]);

  const errorMessage = authError ?? storeError;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Filey</ThemedText>
      </ThemedView>

      {!userId && !authError ? (
        <ThemedView style={styles.centered}>
          <ActivityIndicator />
        </ThemedView>
      ) : errorMessage ? (
        <ThemedView style={styles.centered}>
          <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
        </ThemedView>
      ) : status === 'loading' || status === 'idle' ? (
        <ThemedView style={styles.centered}>
          <ActivityIndicator />
        </ThemedView>
      ) : (
        <ThemedView style={styles.canvasContainer}>
          <CanvasWorkspace />
          {userId && <AddFileFab ownerId={userId} />}
        </ThemedView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  canvasContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    textAlign: 'center',
    color: '#E0554F',
  },
});
