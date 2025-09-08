import { StorageAdapter, StorageOptions, StorageResult } from './StorageAdapter.js';
import { resolve, join } from 'path';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { createHash } from 'crypto';

export class LocalFsStorage extends StorageAdapter {
  private uploadsDir: string;

  constructor() {
    super();
    this.uploadsDir = resolve(process.cwd(), 'uploads');
    this.ensureUploadsDir();
  }

  private async ensureUploadsDir() {
    if (!existsSync(this.uploadsDir)) {
      await mkdir(this.uploadsDir, { recursive: true });
    }
  }

  async put(buffer: Buffer, options: StorageOptions): Promise<StorageResult> {
    await this.ensureUploadsDir();

    // Calcular hash do conteúdo
    const contentHash = createHash('sha256').update(buffer).digest('hex');
    
    // Gerar nome único baseado no hash + extensão original
    const ext = options.filename.split('.').pop() || 'bin';
    const storedFilename = `${contentHash}.${ext}`;
    const filePath = join(this.uploadsDir, storedFilename);

    // Salvar arquivo
    await writeFile(filePath, buffer);

    return {
      url: `/static/${storedFilename}`,
      contentHash,
      size: buffer.length,
    };
  }

  async get(pathOrKey: string): Promise<Buffer | null> {
    try {
      // Remove prefixo /static/ se existir
      const filename = pathOrKey.replace(/^\/static\//, '');
      const filePath = join(this.uploadsDir, filename);
      
      if (!existsSync(filePath)) {
        return null;
      }

      return await readFile(filePath);
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      return null;
    }
  }

  async delete(pathOrKey: string): Promise<void> {
    try {
      const filename = pathOrKey.replace(/^\/static\//, '');
      const filePath = join(this.uploadsDir, filename);
      
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
    }
  }

  async url(pathOrKey: string): Promise<string> {
    // Em modo local, retorna a URL relativa
    if (pathOrKey.startsWith('/static/')) {
      return pathOrKey;
    }
    return `/static/${pathOrKey}`;
  }
}