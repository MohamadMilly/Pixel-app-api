/** Metadata read back from the storage provider after an upload. */
export interface StoredObjectInfo {
  readonly size: number;
  readonly mimeType: string | null;
}

export interface SignedUploadTarget {
  /** The pre-signed URL the client PUTs the bytes to. */
  readonly uploadUrl: string;
  /** Opaque token some providers return alongside the URL. */
  readonly token: string | null;
  /** The object key the file will live at. */
  readonly path: string;
}

/**
 * Storage abstraction (port). The app depends only on this interface, so the
 * Supabase implementation can be swapped for a mock in tests and the feature
 * code never imports the provider SDK directly.
 */
export interface StoragePort {
  createSignedUploadUrl(path: string, ttlSeconds: number): Promise<SignedUploadTarget>;
  /** Temporary download URL; null-safe callers decide whether to expose it. */
  createSignedDownloadUrl(path: string, ttlSeconds: number): Promise<string>;
  /** Object metadata, or null if the object does not exist yet. */
  getObjectInfo(path: string): Promise<StoredObjectInfo | null>;
  /** First `length` bytes of the object (for magic-byte validation), or null if absent. */
  getObjectBytes(path: string, length: number): Promise<Uint8Array | null>;
  removeObject(path: string): Promise<void>;
}
