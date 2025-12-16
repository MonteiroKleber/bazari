/**
 * Templates Service
 * Handles template operations for Bazari Studio
 */

import type { Template, TemplateCategory, ProjectConfig } from '../types/studio.types';
import { allTemplates, getTemplateById, getTemplatesByCategory } from '../data/templates';

export interface TemplateServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProcessedFile {
  path: string;
  content: string;
}

/**
 * Get all available templates
 */
export function getAllTemplates(): Template[] {
  return allTemplates;
}

/**
 * Get a template by ID
 */
export function getTemplate(id: string): Template | undefined {
  return getTemplateById(id);
}

/**
 * Get templates by category
 */
export function getTemplatesForCategory(category: TemplateCategory): Template[] {
  return getTemplatesByCategory(category);
}

/**
 * Get all unique categories from available templates
 */
export function getTemplateCategories(): TemplateCategory[] {
  const categories = new Set<TemplateCategory>();
  allTemplates.forEach((t) => categories.add(t.category));
  return Array.from(categories);
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): Template[] {
  const lowerQuery = query.toLowerCase();
  return allTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Process template placeholders
 */
export function processPlaceholders(content: string, config: ProjectConfig): string {
  return content
    .replace(/\{\{name\}\}/g, config.name)
    .replace(/\{\{slug\}\}/g, config.slug)
    .replace(/\{\{description\}\}/g, config.description)
    .replace(/\{\{author\}\}/g, config.author)
    .replace(/\{\{category\}\}/g, config.category);
}

/**
 * Process a single template file
 */
export function processTemplateFile(
  file: { path: string; content: string; isTemplate: boolean },
  config: ProjectConfig
): ProcessedFile {
  return {
    path: file.path,
    content: file.isTemplate ? processPlaceholders(file.content, config) : file.content,
  };
}

/**
 * Process all files in a template
 */
export function processTemplateFiles(template: Template, config: ProjectConfig): ProcessedFile[] {
  return template.files.map((file) => processTemplateFile(file, config));
}

/**
 * Generate a valid slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Validate project configuration
 */
export function validateProjectConfig(config: ProjectConfig): TemplateServiceResult<null> {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Project name is required');
  }

  if (!config.slug || config.slug.trim().length === 0) {
    errors.push('Project slug is required');
  } else if (!/^[a-z0-9-]+$/.test(config.slug)) {
    errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  if (config.slug && config.slug.length > 50) {
    errors.push('Slug must be 50 characters or less');
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(', ') };
  }

  return { success: true };
}

/**
 * Get template file count
 */
export function getTemplateFileCount(template: Template): number {
  return template.files.length;
}

/**
 * Get template permissions summary
 */
export function getPermissionsSummary(template: Template): string {
  const required = template.defaultPermissions.filter((p) => !p.optional).length;
  const optional = template.defaultPermissions.filter((p) => p.optional).length;

  if (optional > 0) {
    return `${required} required, ${optional} optional`;
  }
  return `${required} permissions`;
}

/**
 * Get SDK features as a string
 */
export function getSdkFeaturesSummary(template: Template): string {
  return template.sdkFeatures.join(', ');
}

/**
 * Export the service object
 */
export const templatesService = {
  getAll: getAllTemplates,
  getById: getTemplate,
  getByCategory: getTemplatesForCategory,
  getCategories: getTemplateCategories,
  search: searchTemplates,
  processFiles: processTemplateFiles,
  processFile: processTemplateFile,
  generateSlug,
  validateConfig: validateProjectConfig,
  getFileCount: getTemplateFileCount,
  getPermissionsSummary,
  getSdkFeaturesSummary,
};

export default templatesService;
