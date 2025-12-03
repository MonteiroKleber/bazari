import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * Categoria de um app no BazariOS
 */
export type AppCategory =
  | 'finance'
  | 'social'
  | 'commerce'
  | 'tools'
  | 'governance'
  | 'entertainment';

/**
 * Status de um app
 */
export type AppStatus = 'stable' | 'beta' | 'alpha' | 'deprecated';

/**
 * Modo de lançamento do app
 * - internal: Rota SPA interna (padrão)
 * - external: Abre URL externa em nova aba
 * - iframe: Carrega em iframe sandboxed (futuro: apps de terceiros)
 */
export type AppLaunchMode = 'internal' | 'external' | 'iframe';

/**
 * Método de autenticação para apps externos
 * - session: Usa sessão atual (padrão para internal)
 * - vr-token: Gera token VR via API específica
 * - oauth: OAuth flow (futuro)
 * - none: Sem autenticação
 */
export type AppAuthMethod = 'session' | 'vr-token' | 'oauth' | 'none';

/**
 * Role necessária para acessar um app
 */
export type AppRequiredRole = 'user' | 'seller' | 'dao_member' | 'delivery' | 'admin';

/**
 * Definição de um app no BazariOS
 */
export interface BazariApp {
  /** ID único do app (ex: "wallet", "bazchat") */
  id: string;

  /** Nome para exibição */
  name: string;

  /** Slug para URL */
  slug: string;

  /** Versão semver */
  version: string;

  /** Nome do ícone Lucide */
  icon: string;

  /** Cor primária (classe Tailwind ou hex) */
  color: string;

  /** Descrição curta (max 100 chars) */
  description: string;

  /** Categoria do app */
  category: AppCategory;

  /** Tags para busca */
  tags: string[];

  /** Rota de entrada (ex: "/app/wallet") - usado para launchMode: 'internal' */
  entryPoint: string;

  /** Componente React lazy-loaded - opcional para apps externos */
  component?: LazyExoticComponent<ComponentType<unknown>>;

  /** Modo de lançamento do app (default: 'internal') */
  launchMode?: AppLaunchMode;

  /** URL externa - obrigatório se launchMode: 'external' */
  externalUrl?: string;

  /** Método de autenticação para apps externos (default: 'session') */
  authMethod?: AppAuthMethod;

  /** Permissões requeridas */
  permissions: AppPermissionRequest[];

  /** Roles necessárias (undefined = qualquer usuário) */
  requiredRoles?: AppRequiredRole[];

  /** Status do app */
  status: AppStatus;

  /** Se é um app nativo Bazari */
  native: boolean;

  /** Se deve aparecer em destaque */
  featured?: boolean;

  /** Contagem de instalações (para store) */
  installCount?: number;

  /** Rating médio (para store) */
  rating?: number;

  /** Screenshots para store */
  screenshots?: string[];

  /** Descrição longa para store */
  longDescription?: string;

  /** Ordem padrão no launcher */
  defaultOrder?: number;

  /** Se vem pré-instalado */
  preInstalled?: boolean;
}

/**
 * Requisição de permissão de um app
 */
export interface AppPermissionRequest {
  /** ID da permissão */
  id: string;

  /** Motivo pelo qual o app precisa */
  reason: string;

  /** Se é opcional */
  optional?: boolean;
}

/**
 * Dados mínimos de um app para listagem
 */
export type AppSummary = Pick<
  BazariApp,
  'id' | 'name' | 'icon' | 'color' | 'description' | 'category' | 'status' | 'entryPoint'
>;

/**
 * Filtros para busca de apps
 */
export interface AppFilters {
  category?: AppCategory;
  status?: AppStatus;
  search?: string;
  installed?: boolean;
  native?: boolean;
}
