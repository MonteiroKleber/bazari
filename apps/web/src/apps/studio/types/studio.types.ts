/**
 * Tipos do Bazari Studio
 */

// === Environment ===

export interface ToolStatus {
  installed: boolean;
  version?: string;
}

export interface EnvironmentStatus {
  node: ToolStatus;
  npm: ToolStatus;
  rust: ToolStatus;
  cargoContract: ToolStatus;
}

export interface ServerStatus {
  connected: boolean;
  version?: string;
  platform?: string;
  nodeVersion?: string;
}

// === Project ===

export interface Project {
  id: string;
  name: string;
  path: string;
  description: string;
  category: string;
  author: string;
  version: string;
  type: 'app' | 'contract';
  template: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpenFile {
  path: string;
  content: string;
  isDirty: boolean;
  language: string;
}

// === Layout ===

export interface LayoutState {
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  terminalHeight: number;
  terminalVisible: boolean;
  previewWidth: number;
  previewVisible: boolean;
}

// === Build ===

export type BuildStatus = 'idle' | 'building' | 'success' | 'error';

export interface BuildResult {
  success: boolean;
  output: string;
  buildInfo?: {
    hash: string;
    size: number;
    timestamp: string;
  };
}

// === Sidebar ===

export type SidebarTab = 'files' | 'search' | 'ai' | 'settings';

// === Recent Projects ===

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  type: 'app' | 'contract';
  lastOpened: string;
}

// === Templates ===

export type TemplateCategory = 'starter' | 'commerce' | 'social' | 'finance' | 'tools' | 'contract';

export interface TemplateFile {
  path: string;
  content: string;
  isTemplate: boolean; // Se tem placeholders {{name}}, {{slug}}, etc
}

export interface TemplatePermission {
  id: string;
  reason: string;
  optional?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string; // Nome do icone Lucide
  color: string; // Gradient Tailwind (ex: 'from-blue-500 to-cyan-500')
  preview?: string; // URL de imagem preview
  tags: string[];
  files: TemplateFile[];
  defaultPermissions: TemplatePermission[];
  sdkFeatures: string[];
}

// === Distribution ===

export interface DistributionConfig {
  /** Publicar na Bazari App Store (IPFS) */
  appStore: boolean;
  /** Usar SDK em domínio externo (API Key) */
  external: boolean;
  /** Origens permitidas para SDK externo */
  allowedOrigins?: string[];
}

export interface ProjectConfig {
  name: string;
  slug: string;
  description: string;
  author: string;
  category: string;
  distribution?: DistributionConfig;
}
