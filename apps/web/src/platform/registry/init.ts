import { appRegistry } from './app-registry';
import { NATIVE_APPS } from './native-apps';

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

  appRegistry.registerMany(NATIVE_APPS);
  appRegistry.markInitialized();

  console.log('[AppRegistry] Inicialização completa');
}
