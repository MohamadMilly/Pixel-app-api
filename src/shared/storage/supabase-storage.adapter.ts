import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';
import { AppError } from '../errors/index.js';
import type { SignedUploadTarget, StoragePort, StoredObjectInfo } from './storage.port.js';

/**
 * Supabase Storage implementation of StoragePort.
 * Uses the service-role key (server-side only). Access for end users is additionally
 * governed by RLS policies on the bucket (configured in Supabase — see
 * prisma/sql/002_storage_bucket_policies.sql).
 */
export class SupabaseStorageAdapter implements StoragePort {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(client?: SupabaseClient, bucket: string = env.SUPABASE_BUCKET) {
    this.client =
      client ??
      createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    this.bucket = bucket;
  }

  private get storage() {
    return this.client.storage.from(this.bucket);
  }

  async createSignedUploadUrl(path: string): Promise<SignedUploadTarget> {
    const { data, error } = await this.storage.createSignedUploadUrl(path);
    if (error || !data) {
      throw new AppError(502, 'STORAGE_ERROR', `Could not create upload URL: ${error?.message ?? 'unknown'}`);
    }
    return { uploadUrl: data.signedUrl, token: data.token ?? null, path: data.path ?? path };
  }

  async createSignedDownloadUrl(path: string, ttlSeconds: number): Promise<string> {
    const { data, error } = await this.storage.createSignedUrl(path, ttlSeconds);
    if (error || !data) {
      throw new AppError(502, 'STORAGE_ERROR', `Could not sign URL: ${error?.message ?? 'unknown'}`);
    }
    return data.signedUrl;
  }

  async getObjectInfo(path: string): Promise<StoredObjectInfo | null> {
    // `info` returns object metadata (size + mimetype) for a single object.
    const { data, error } = await this.storage.info(path);
    if (error || !data) {
      return null;
    }
    const size = typeof data.size === 'number' ? data.size : Number(data.metadata?.['size'] ?? NaN);
    const mimeType =
      (typeof data.contentType === 'string' ? data.contentType : null) ??
      (typeof data.metadata?.['mimetype'] === 'string' ? (data.metadata['mimetype'] as string) : null);
    return { size: Number.isFinite(size) ? size : 0, mimeType };
  }

  async getObjectBytes(path: string, length: number): Promise<Uint8Array | null> {
    const { data, error } = await this.storage.download(path);
    if (error || !data) {
      return null;
    }
    const buffer = await data.arrayBuffer();
    return new Uint8Array(buffer).subarray(0, length);
  }

  async removeObject(path: string): Promise<void> {
    const { error } = await this.storage.remove([path]);
    if (error) {
      throw new AppError(502, 'STORAGE_ERROR', `Could not remove object: ${error.message}`);
    }
  }
}
