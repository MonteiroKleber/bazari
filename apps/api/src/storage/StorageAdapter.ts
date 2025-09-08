export interface StorageOptions {
  filename: string;
  mime: string;
}

export interface StorageResult {
  url: string;
  contentHash: string;
  size: number;
}

export abstract class StorageAdapter {
  abstract put(buffer: Buffer, options: StorageOptions): Promise<StorageResult>;
  abstract get(pathOrKey: string): Promise<Buffer | null>;
  abstract delete(pathOrKey: string): Promise<void>;
  abstract url(pathOrKey: string): Promise<string>;
}