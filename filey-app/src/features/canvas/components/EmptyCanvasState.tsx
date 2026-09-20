import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';

export function EmptyCanvasState() {
  return (
    <View style={styles.container} pointerEvents="none">
      <ThemedText type="subtitle" style={styles.title}>
        Your canvas is empty
      </ThemedText>
      <ThemedText style={styles.body}>
        Tap the + button to add a photo or file. Once it&rsquo;s here, drag it anywhere and pinch
        its corner to resize.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    textAlign: 'center',
    opacity: 0.6,
  },
});
