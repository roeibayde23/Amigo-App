import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

import type { CanvasFile, CanvasLayout } from '@/src/features/canvas/types';
import { DEFAULT_CARD_SIZE } from '@/src/features/canvas/types';
import { supabase } from '@/src/lib/supabase/client';
import type { Database } from '@/src/lib/supabase/database.types';

const BUCKET = 'files';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

type FileRow = Database['public']['Tables']['files']['Row'];

function rowToCanvasFile(row: FileRow): CanvasFile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    x: row.pos_x,
    y: row.pos_y,
    width: row.width,
    height: row.height,
    zIndex: row.z_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchFiles(ownerId: string): Promise<CanvasFile[]> {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('owner_id', ownerId)
    .order('z_index', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToCanvasFile);
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

/**
 * Stagger new cards so they don't all land in the exact same spot, mimicking
 * how photos fan out on a real desk.
 */
function nextDropPosition(existingCount: number) {
  const step = 28;
  const cols = 3;
  const col = existingCount % cols;
  const row = Math.floor(existingCount / cols);
  return { x: 24 + col * step, y: 24 + row * step };
}

export async function uploadAndCreateFile(
  ownerId: string,
  picked: PickedFile,
  existingCount: number
): Promise<CanvasFile> {
  const fileId = Crypto.randomUUID();
  const safeName = picked.name.replace(/[^\w.\-]+/g, '_');
  const storagePath = `${ownerId}/${fileId}-${safeName}`;

  const base64 = await FileSystem.readAsStringAsync(picked.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToUint8Array(base64);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: picked.mimeType,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { x, y } = nextDropPosition(existingCount);

  const { data, error } = await supabase
    .from('files')
    .insert({
      id: fileId,
      owner_id: ownerId,
      name: picked.name,
      mime_type: picked.mimeType,
      size_bytes: picked.size ?? bytes.byteLength,
      storage_path: storagePath,
      pos_x: x,
      pos_y: y,
      width: DEFAULT_CARD_SIZE,
      height: DEFAULT_CARD_SIZE,
      z_index: existingCount + 1,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  return rowToCanvasFile(data);
}

export async function updateFileLayout(id: string, layout: CanvasLayout) {
  const { error } = await supabase
    .from('files')
    .update({
      pos_x: layout.x,
      pos_y: layout.y,
      width: layout.width,
      height: layout.height,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function updateFileZIndex(id: string, zIndex: number) {
  const { error } = await supabase.from('files').update({ z_index: zIndex }).eq('id', id);
  if (error) throw error;
}

export async function deleteFile(id: string, storagePath: string) {
  const { error } = await supabase.from('files').delete().eq('id', id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([storagePath]);
}

export async function getPreviewUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.warn('Failed to sign preview URL', error.message);
    return null;
  }
  return data.signedUrl;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = globalThis.atob ? globalThis.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
