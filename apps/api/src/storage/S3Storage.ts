import { StorageAdapter, StorageOptions, StorageResult } from './StorageAdapter.js';
import { createHash } from 'crypto';
import { env } from '../env.js';

// Mock simples do S3 - em produção você usaria @aws-sdk/client-s3
export class S3Storage extends StorageAdapter {
  private region: string;
  private bucket: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private publicBaseUrl: string;

  constructor() {
    super();
    this.region = env.S3_REGION!;
    this.bucket = env.S3_BUCKET!;
    this.accessKeyId = env.S3_ACCESS_KEY_ID!;
    this.secretAccessKey = env.S3_SECRET_ACCESS_KEY!;
    this.publicBaseUrl = env.S3_PUBLIC_BASEURL!;
  }

  async put(buffer: Buffer, options: StorageOptions): Promise<StorageResult> {
    // Calcular hash do conteúdo
    const contentHash = createHash('sha256').update(buffer).digest('hex');
    
    // Gerar chave S3 única
    const ext = options.filename.split('.').pop() || 'bin';
    const key = `uploads/${contentHash}.${ext}`;

    // Aqui você faria o upload real para S3
    // const s3Client = new S3Client({ region: this.region, credentials: {...} });
    // await s3Client.send(new PutObjectCommand({
    //   Bucket: this.bucket,
    //   Key: key,
    //   Body: buffer,
    //   ContentType: options.mime,
    // }));

    console.log(`[S3 Mock] Upload simulado: ${key}`);

    return {
      url: `${this.publicBaseUrl}/${key}`,
      contentHash,
      size: buffer.length,
    };
  }

  async get(pathOrKey: string): Promise<Buffer | null> {
    // Aqui você faria o download real do S3
    console.log(`[S3 Mock] Get simulado: ${pathOrKey}`);
    return null;
  }

  async delete(pathOrKey: string): Promise<void> {
    // Aqui você faria a deleção real no S3
    console.log(`[S3 Mock] Delete simulado: ${pathOrKey}`);
  }

  async url(pathOrKey: string): Promise<string> {
    // Gerar URL pré-assinada se necessário
    if (pathOrKey.startsWith('http')) {
      return pathOrKey;
    }
    return `${this.publicBaseUrl}/${pathOrKey}`;
  }
}