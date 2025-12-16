import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.bazari');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const MANIFEST_FILE = 'bazari.manifest.json';

export interface BazariConfig {
  apiUrl: string;
  token?: string;
  developerId?: string;
}

/**
 * Configuração de distribuição do app
 */
export interface DistributionConfig {
  /** Publicar na Bazari App Store */
  appStore: boolean;
  /** Usar SDK em domínio externo */
  external: boolean;
  /** Origens permitidas para SDK externo (obrigatório se external=true) */
  allowedOrigins?: string[];
}

export interface AppManifest {
  appId: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  longDescription?: string;
  category: string;
  tags: string[];
  icon: string;
  color: string;
  entryPoint: string;
  screenshots?: string[];
  permissions: Array<{
    id: string;
    reason: string;
    optional?: boolean;
  }>;
  sdkVersion: string;
  /** Configuração de distribuição */
  distribution?: DistributionConfig;
  // Monetization
  monetizationType?: 'FREE' | 'PAID' | 'FREEMIUM' | 'SUBSCRIPTION';
  price?: string;
}

export async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
}

export async function loadConfig(): Promise<BazariConfig> {
  await ensureConfigDir();

  if (await fs.pathExists(CONFIG_FILE)) {
    return fs.readJson(CONFIG_FILE);
  }

  return {
    apiUrl: 'https://bazari.libervia.xyz/api',
  };
}

export async function saveConfig(config: BazariConfig): Promise<void> {
  await ensureConfigDir();
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
}

export async function loadManifest(dir: string = process.cwd()): Promise<AppManifest | null> {
  const manifestPath = path.join(dir, MANIFEST_FILE);

  if (await fs.pathExists(manifestPath)) {
    return fs.readJson(manifestPath);
  }

  return null;
}

export async function saveManifest(manifest: AppManifest, dir: string = process.cwd()): Promise<void> {
  const manifestPath = path.join(dir, MANIFEST_FILE);
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
}

export function getManifestPath(dir: string = process.cwd()): string {
  return path.join(dir, MANIFEST_FILE);
}

export async function isLoggedIn(): Promise<boolean> {
  const config = await loadConfig();
  return !!config.token;
}

export async function getToken(): Promise<string | null> {
  const config = await loadConfig();
  return config.token || null;
}

export async function setToken(token: string, developerId: string): Promise<void> {
  const config = await loadConfig();
  config.token = token;
  config.developerId = developerId;
  await saveConfig(config);
}

export async function clearToken(): Promise<void> {
  const config = await loadConfig();
  delete config.token;
  delete config.developerId;
  await saveConfig(config);
}
