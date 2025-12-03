/**
 * Serviço para lançamento de apps no BazariOS
 * Suporta apps internos (SPA) e externos (nova aba com auth)
 */

import type { BazariApp } from '../types';
import { getAccessToken } from '@/modules/auth/session';

/**
 * Resultado do lançamento de um app
 */
export interface LaunchResult {
  success: boolean;
  error?: string;
  url?: string;
}

/**
 * Gera a URL autenticada para um app externo
 */
async function buildAuthenticatedUrl(app: BazariApp): Promise<string> {
  const baseUrl = app.externalUrl;

  if (!baseUrl) {
    throw new Error(`App "${app.id}" não tem externalUrl definida`);
  }

  const url = new URL(baseUrl);

  // Aplica método de autenticação
  switch (app.authMethod) {
    case 'vr-token': {
      const accessToken = getAccessToken();

      if (!accessToken) {
        throw new Error('Nenhuma sessão ativa. Faça login primeiro.');
      }

      // Chama API para gerar token VR
      const response = await fetch('https://bazari.libervia.xyz/api/auth/issue-vr-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar token VR');
      }

      const { vrToken } = await response.json();
      url.searchParams.set('token', vrToken);
      break;
    }

    case 'oauth':
      // Futuro: implementar OAuth flow
      throw new Error('Método OAuth ainda não implementado');

    case 'none':
      // Sem autenticação - usa URL direta
      break;

    case 'session':
    default:
      // Para session em apps externos, poderia passar o token como header
      // Por segurança, não passamos token na URL por padrão
      break;
  }

  return url.toString();
}

/**
 * Lança um app externo em nova aba
 */
export async function launchExternalApp(app: BazariApp): Promise<LaunchResult> {
  try {
    const url = await buildAuthenticatedUrl(app);

    // Abre em nova aba
    const newWindow = window.open(url, '_blank');

    if (!newWindow) {
      return {
        success: false,
        error: 'Pop-up bloqueado. Permita pop-ups para este site.',
      };
    }

    return {
      success: true,
      url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao lançar app',
    };
  }
}

/**
 * Obtém a URL de navegação para um app interno
 */
export function getInternalAppUrl(app: BazariApp): string {
  return app.entryPoint;
}

/**
 * Verifica se um app é externo
 */
export function isExternalApp(app: BazariApp): boolean {
  return app.launchMode === 'external';
}

/**
 * Verifica se um app pode ser lançado (tem componente ou é externo)
 */
export function canLaunchApp(app: BazariApp): boolean {
  if (app.launchMode === 'external') {
    return !!app.externalUrl;
  }
  return !!app.component;
}
