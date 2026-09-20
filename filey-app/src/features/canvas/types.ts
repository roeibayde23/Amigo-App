export interface CanvasFile {
  id: string;
  ownerId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  /** Signed URL for previewing the file, resolved lazily and cached in-memory. */
  previewUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_CARD_SIZE = 96;
export const MAX_CARD_SIZE = 320;
export const DEFAULT_CARD_SIZE = 160;
