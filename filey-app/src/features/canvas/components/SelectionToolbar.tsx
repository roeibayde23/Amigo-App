import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CanvasFile } from '@/src/features/canvas/types';

interface SelectionToolbarProps {
  file: CanvasFile;
  onDelete: (id: string) => void;
  onDismiss: () => void;
}

export function SelectionToolbar({ file, onDelete, onDismiss }: SelectionToolbarProps) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.bar}>
        <Text numberOfLines={1} style={styles.name}>
          {file.name}
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={onDismiss} hitSlop={8}>
            <Ionicons name="checkmark" size={18} color="#5B6472" />
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(file.id)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1E2733',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#E0554F',
  },
});
