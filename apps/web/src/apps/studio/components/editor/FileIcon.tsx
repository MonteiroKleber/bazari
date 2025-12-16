/**
 * FileIcon - Icon component for file types
 */

import React from 'react';
import {
  FileText,
  FileJson,
  FileCode,
  File,
  Folder,
  FolderOpen,
  Image,
  Settings,
  Database,
  Lock,
  Package,
  type LucideIcon,
} from 'lucide-react';
import { detectLanguage } from '../../utils/languageDetection';

interface FileIconProps {
  filePath: string;
  isFolder?: boolean;
  isOpen?: boolean;
  size?: number;
  className?: string;
}

// Language to icon mapping
const languageIconMap: Record<string, LucideIcon> = {
  javascript: FileCode,
  typescript: FileCode,
  html: FileCode,
  css: FileCode,
  scss: FileCode,
  json: FileJson,
  yaml: Settings,
  toml: Settings,
  markdown: FileText,
  rust: FileCode,
  plaintext: FileText,
  dockerfile: Package,
  shell: FileCode,
  sql: Database,
};

// File extension to color mapping
const extensionColorMap: Record<string, string> = {
  '.js': 'text-yellow-400',
  '.jsx': 'text-yellow-400',
  '.ts': 'text-blue-400',
  '.tsx': 'text-blue-400',
  '.html': 'text-orange-400',
  '.css': 'text-blue-300',
  '.scss': 'text-pink-400',
  '.json': 'text-yellow-300',
  '.yaml': 'text-red-300',
  '.yml': 'text-red-300',
  '.md': 'text-gray-300',
  '.rs': 'text-orange-500',
  '.toml': 'text-gray-400',
  '.lock': 'text-gray-500',
  '.env': 'text-green-400',
  '.sql': 'text-blue-500',
  '.graphql': 'text-pink-500',
  '.svg': 'text-orange-300',
  '.png': 'text-purple-400',
  '.jpg': 'text-purple-400',
  '.gif': 'text-purple-400',
};

// Special filename mappings
const filenameIconMap: Record<string, { icon: LucideIcon; color: string }> = {
  'package.json': { icon: Package, color: 'text-green-400' },
  'package-lock.json': { icon: Lock, color: 'text-yellow-500' },
  'pnpm-lock.yaml': { icon: Lock, color: 'text-yellow-500' },
  'yarn.lock': { icon: Lock, color: 'text-blue-400' },
  'Cargo.toml': { icon: Package, color: 'text-orange-500' },
  'Cargo.lock': { icon: Lock, color: 'text-orange-400' },
  'tsconfig.json': { icon: Settings, color: 'text-blue-400' },
  'vite.config.ts': { icon: Settings, color: 'text-purple-400' },
  '.gitignore': { icon: FileText, color: 'text-gray-500' },
  '.env': { icon: Lock, color: 'text-green-400' },
  '.env.local': { icon: Lock, color: 'text-green-400' },
  Dockerfile: { icon: Package, color: 'text-blue-400' },
  'docker-compose.yml': { icon: Package, color: 'text-blue-400' },
};

export const FileIcon: React.FC<FileIconProps> = ({
  filePath,
  isFolder = false,
  isOpen = false,
  size = 16,
  className = '',
}) => {
  // Handle folders
  if (isFolder) {
    const FolderIcon = isOpen ? FolderOpen : Folder;
    return (
      <FolderIcon
        size={size}
        className={`text-yellow-500 ${className}`}
      />
    );
  }

  // Extract filename from path
  const filename = filePath.split('/').pop() || filePath;

  // Check special filenames first
  if (filenameIconMap[filename]) {
    const { icon: Icon, color } = filenameIconMap[filename];
    return <Icon size={size} className={`${color} ${className}`} />;
  }

  // Get extension
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';

  // Get color based on extension
  const color = extensionColorMap[ext] || 'text-gray-400';

  // Get icon based on language
  const language = detectLanguage(filePath);
  const Icon = languageIconMap[language] || File;

  // Special icons for images
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext)) {
    return <Image size={size} className={`${color} ${className}`} />;
  }

  return <Icon size={size} className={`${color} ${className}`} />;
};

/**
 * Get language display name
 */
export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    json: 'JSON',
    yaml: 'YAML',
    toml: 'TOML',
    markdown: 'Markdown',
    rust: 'Rust',
    plaintext: 'Plain Text',
    dockerfile: 'Dockerfile',
    shell: 'Shell',
    sql: 'SQL',
    graphql: 'GraphQL',
    python: 'Python',
    go: 'Go',
    java: 'Java',
  };

  return displayNames[language] || language.charAt(0).toUpperCase() + language.slice(1);
}

export default FileIcon;
