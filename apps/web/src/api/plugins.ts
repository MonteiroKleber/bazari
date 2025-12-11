/**
 * Plugin API Client
 *
 * Funções para comunicação com a API de plugins
 */

import { api } from '@/lib/api';

// Tipos
export interface PluginDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  category: string;
  pricingType: 'FREE' | 'FREEMIUM' | 'PAID';
  priceMonthly?: number;
  iconUrl?: string;
  bannerUrl?: string;
  developerName: string;
  isOfficial: boolean;
  configSchema: Record<string, unknown>;
  defaultConfig: Record<string, unknown>;
  components: Record<string, string>;
}

export interface PluginInstance {
  id: string;
  pluginId: string;
  storeId: string;
  enabled: boolean;
  config: Record<string, unknown>;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
  plugin: PluginDefinition;
  stats?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface PluginCategory {
  id: string;
  name: string;
  description: string;
}

// ============================================
// Catálogo de Plugins (público)
// ============================================

export async function fetchAvailablePlugins(category?: string): Promise<{ plugins: PluginDefinition[] }> {
  const params = category ? { category } : undefined;
  const data = await api.get<PluginDefinition[] | { plugins: PluginDefinition[] }>('/plugins', params);
  // API retorna array direto
  const plugins = Array.isArray(data) ? data : (data.plugins || []);
  return { plugins };
}

export async function fetchPluginDetails(slug: string): Promise<{ plugin: PluginDefinition }> {
  const plugin = await api.get<PluginDefinition>(`/plugins/${slug}`);
  return { plugin };
}

export async function fetchPluginCategories(): Promise<{ categories: PluginCategory[] }> {
  const categories = await api.get<PluginCategory[]>('/plugins/categories');
  return { categories };
}

// ============================================
// Plugins do Vendedor (autenticado)
// ============================================

export async function fetchSellerPlugins(): Promise<{ plugins: PluginInstance[] }> {
  const data = await api.get<PluginInstance[] | { instances: PluginInstance[] }>('/seller/plugins');
  // API pode retornar array direto ou { instances: [...] }
  const plugins = Array.isArray(data) ? data : (data.instances || []);
  return { plugins };
}

export async function fetchPluginInstance(instanceId: string): Promise<{ instance: PluginInstance }> {
  const instance = await api.get<PluginInstance>(`/seller/plugins/${instanceId}`);
  return { instance };
}

export async function installPlugin(
  slug: string,
  config: Record<string, unknown>,
  branding: Record<string, unknown>
): Promise<{ instance: PluginInstance }> {
  const instance = await api.post<PluginInstance>('/seller/plugins', {
    pluginSlug: slug,
    config,
    branding,
  });
  return { instance };
}

export async function updatePluginConfig(
  instanceId: string,
  config: Record<string, unknown>,
  branding?: Record<string, unknown>
): Promise<{ instance: PluginInstance }> {
  const instance = await api.put<PluginInstance>(`/seller/plugins/${instanceId}`, {
    config,
    branding,
  });
  return { instance };
}

export async function togglePlugin(
  instanceId: string,
  enabled: boolean
): Promise<{ instance: PluginInstance }> {
  const instance = await api.put<PluginInstance>(`/seller/plugins/${instanceId}`, {
    enabled,
  });
  return { instance };
}

export async function uninstallPlugin(instanceId: string): Promise<void> {
  await api.delete(`/seller/plugins/${instanceId}`);
}
