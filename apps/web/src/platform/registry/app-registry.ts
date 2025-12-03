import type { BazariApp, AppCategory, AppFilters } from '../types';

/**
 * Registry central de apps do BazariOS
 * Singleton que mantém todos os apps registrados
 */
class AppRegistry {
  private apps: Map<string, BazariApp> = new Map();
  private initialized = false;

  /**
   * Registra um app no sistema
   */
  register(app: BazariApp): void {
    if (this.apps.has(app.id)) {
      console.warn(`[AppRegistry] App "${app.id}" já registrado, sobrescrevendo...`);
    }
    this.apps.set(app.id, app);
  }

  /**
   * Registra múltiplos apps de uma vez
   */
  registerMany(apps: BazariApp[]): void {
    for (const app of apps) {
      this.register(app);
    }
  }

  /**
   * Remove um app do registry
   */
  unregister(appId: string): boolean {
    return this.apps.delete(appId);
  }

  /**
   * Obtém um app pelo ID
   */
  get(appId: string): BazariApp | undefined {
    return this.apps.get(appId);
  }

  /**
   * Verifica se um app existe
   */
  has(appId: string): boolean {
    return this.apps.has(appId);
  }

  /**
   * Retorna todos os apps
   */
  getAll(): BazariApp[] {
    return Array.from(this.apps.values());
  }

  /**
   * Retorna apps por categoria
   */
  getByCategory(category: AppCategory): BazariApp[] {
    return this.getAll().filter((app) => app.category === category);
  }

  /**
   * Retorna apenas apps nativos
   */
  getNativeApps(): BazariApp[] {
    return this.getAll().filter((app) => app.native);
  }

  /**
   * Retorna apps em destaque
   */
  getFeaturedApps(): BazariApp[] {
    return this.getAll().filter((app) => app.featured);
  }

  /**
   * Retorna apps pré-instalados
   */
  getPreInstalledApps(): BazariApp[] {
    return this.getAll().filter((app) => app.preInstalled);
  }

  /**
   * Busca apps com filtros
   */
  search(filters: AppFilters): BazariApp[] {
    let results = this.getAll();

    if (filters.category) {
      results = results.filter((app) => app.category === filters.category);
    }

    if (filters.status) {
      results = results.filter((app) => app.status === filters.status);
    }

    if (filters.native !== undefined) {
      results = results.filter((app) => app.native === filters.native);
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      results = results.filter(
        (app) =>
          app.name.toLowerCase().includes(query) ||
          app.description.toLowerCase().includes(query) ||
          app.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return results;
  }

  /**
   * Retorna IDs de todos os apps
   */
  getAllIds(): string[] {
    return Array.from(this.apps.keys());
  }

  /**
   * Retorna contagem de apps
   */
  count(): number {
    return this.apps.size;
  }

  /**
   * Retorna contagem por categoria
   */
  countByCategory(): Record<AppCategory, number> {
    const counts: Record<AppCategory, number> = {
      finance: 0,
      social: 0,
      commerce: 0,
      tools: 0,
      governance: 0,
      entertainment: 0,
    };

    for (const app of this.apps.values()) {
      counts[app.category]++;
    }

    return counts;
  }

  /**
   * Limpa todos os apps (útil para testes)
   */
  clear(): void {
    this.apps.clear();
    this.initialized = false;
  }

  /**
   * Marca como inicializado
   */
  markInitialized(): void {
    this.initialized = true;
  }

  /**
   * Verifica se foi inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const appRegistry = new AppRegistry();
