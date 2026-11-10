import { SupabaseStorageAdapter } from './supabase-storage.adapter.js';
import type { StoragePort } from './storage.port.js';

export type { StoragePort, StoredObjectInfo, SignedUploadTarget } from './storage.port.js';
export { newBookFilePath } from './object-path.js';

/** Lazily-constructed singleton so env/Supabase client isn't created until first use. */
let instance: StoragePort | undefined;
export function getStorage(): StoragePort {
  instance ??= new SupabaseStorageAdapter();
  return instance;
}
