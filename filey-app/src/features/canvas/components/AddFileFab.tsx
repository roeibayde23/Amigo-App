import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { useCanvasStore } from '@/src/features/canvas/state/useCanvasStore';
import { uploadAndCreateFile, type PickedFile } from '@/src/features/files/api/filesApi';

interface AddFileFabProps {
  ownerId: string;
}

export function AddFileFab({ ownerId }: AddFileFabProps) {
  const [uploading, setUploading] = useState(false);
  const addFile = useCanvasStore((state) => state.addFile);

  async function handleUpload(picked: PickedFile) {
    setUploading(true);
    try {
      const fileCount = useCanvasStore.getState().order.length;
      const file = await uploadAndCreateFile(ownerId, picked, fileCount);
      addFile(file);
    } catch (error) {
      console.warn('Upload failed', error);
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Filey needs photo library access to add images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await handleUpload({
      uri: asset.uri,
      name: asset.fileName ?? `photo-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize,
    });
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await handleUpload({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? undefined,
    });
  }

  function presentOptions() {
    Alert.alert('Add to Filey', 'Choose what you want to bring onto your canvas.', [
      { text: 'Photo from library', onPress: pickImage },
      { text: 'File', onPress: pickDocument },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <Pressable
      style={[styles.fab, uploading && styles.fabDisabled]}
      onPress={presentOptions}
      disabled={uploading}
    >
      {uploading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Ionicons name="add" size={28} color="#fff" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5B8DEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabDisabled: {
    opacity: 0.7,
  },
});
