import { appRegistry } from './app-registry';
import { NATIVE_APPS } from './native-apps';
import { registerSDKHandlers } from '../sdk/register-handlers';
import type { BazariApp } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Busca apps publicados na API e os converte para o formato BazariApp
 */
async function fetchPublishedApps(): Promise<BazariApp[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/apps/store`);
    if (!response.ok) {
      console.warn('[AppRegistry] Failed to fetch published apps:', response.status);
      return [];
    }

    const data = await response.json();
    const apps: BazariApp[] = (data.apps || []).map((app: any) => ({
      id: app.slug, // Usar slug como ID principal (consistente com URLs e permissões)
      appId: app.appId,
      prismaId: app.id, // Manter referência ao Prisma ID para operações de API
      name: app.name,
      slug: app.slug,
      description: app.description,
      longDescription: app.longDescription,
      category: app.category,
      tags: app.tags || [],
      icon: app.icon || 'Package',
      color: app.color || 'from-gray-500 to-gray-600',
      screenshots: app.screenshots || [],
      version: app.currentVersion,
      bundleUrl: app.bundleUrl,
      bundleHash: app.bundleHash,
      permissions: app.permissions || [],
      rating: app.rating ? parseFloat(app.rating) : undefined,
      ratingCount: app.ratingCount,
      installCount: app.installCount,
      developer: {
        id: app.developer?.id,
        name: app.developer?.profile?.displayName || app.developer?.profile?.handle || 'Unknown',
        avatarUrl: app.developer?.profile?.avatarUrl,
      },
      // Marcar como app externo (não nativo)
      native: false,
      status: 'stable' as const,
      // Apps externos usam iframe e rota /app/external/:slug
      launchMode: 'iframe' as const,
      entryPoint: `/app/external/${app.slug}`,
      // Monetização
      monetizationType: app.monetizationType,
      price: app.price ? parseFloat(app.price) : undefined,
    }));

    console.log('[AppRegistry] Loaded', apps.length, 'published apps from API');
    return apps;
  } catch (error) {
    console.error('[AppRegistry] Error fetching published apps:', error);
    return [];
  }
}

/**
 * Inicializa o registry com todos os apps nativos
 * Deve ser chamado uma vez no bootstrap da aplicação
 */
export function initializeAppRegistry(): void {
  if (appRegistry.isInitialized()) {
    console.warn('[AppRegistry] Já inicializado, ignorando...');
    return;
  }

  console.log('[AppRegistry] Inicializando com', NATIVE_APPS.length, 'apps nativos...');

  // Registrar handlers do SDK para apps externos
  registerSDKHandlers();

  appRegistry.registerMany(NATIVE_APPS);
  appRegistry.markInitialized();

  // Carregar apps externos de forma assíncrona
  fetchPublishedApps().then((externalApps) => {
    if (externalApps.length > 0) {
      appRegistry.registerMany(externalApps);
      console.log('[AppRegistry] Total apps:', appRegistry.count());
    }
  });

  console.log('[AppRegistry] Inicialização completa');
}
