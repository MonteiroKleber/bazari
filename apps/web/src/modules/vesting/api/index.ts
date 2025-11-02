// FASE 9: Vesting System - API Service
// path: apps/web/src/modules/vesting/api/index.ts

import type {
  ApiResponse,
  VestingAccounts,
  VestingSchedule,
  VestingStats,
  VestingScheduleData,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchJSON<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });
  return response.json();
}

export const vestingApi = {
  /**
   * GET /vesting/accounts
   * Lista todas as contas de vesting conhecidas
   */
  getVestingAccounts: () =>
    fetchJSON<VestingAccounts>('/vesting/accounts'),

  /**
   * GET /vesting/:account
   * Obtém informações de vesting para uma conta específica
   */
  getVestingSchedule: (account: string) =>
    fetchJSON<VestingSchedule>(`/vesting/${account}`),

  /**
   * GET /vesting/stats
   * Obtém estatísticas gerais de vesting de todas as categorias
   */
  getVestingStats: () =>
    fetchJSON<VestingStats>('/vesting/stats'),

  /**
   * GET /vesting/schedule/:account
   * Obtém o cronograma de vesting projetado para uma conta (para gráficos)
   */
  getVestingScheduleData: (
    account: string,
    options?: {
      interval?: 'daily' | 'weekly' | 'monthly';
      points?: number;
    }
  ) => {
    const params = new URLSearchParams();
    if (options?.interval) params.set('interval', options.interval);
    if (options?.points) params.set('points', options.points.toString());

    const query = params.toString();
    const path = `/vesting/schedule/${account}${query ? `?${query}` : ''}`;

    return fetchJSON<VestingScheduleData>(path);
  },
};
