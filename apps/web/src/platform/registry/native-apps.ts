import { walletApp } from '@/apps/wallet/manifest';
import { feedApp } from '@/apps/feed/manifest';
import { marketplaceApp } from '@/apps/marketplace/manifest';
import { bazchatApp } from '@/apps/bazchat/manifest';
import { p2pApp } from '@/apps/p2p/manifest';
import { governanceApp } from '@/apps/governance/manifest';
import { analyticsApp } from '@/apps/analytics/manifest';
import { vestingApp } from '@/apps/vesting/manifest';
import { rewardsApp } from '@/apps/rewards/manifest';
import { deliveryApp } from '@/apps/delivery/manifest';
import { discoverApp } from '@/apps/discover/manifest';
import { affiliatesApp } from '@/apps/affiliates/manifest';
import { storesApp } from '@/apps/stores/manifest';
import { vrApp } from '@/apps/vr/manifest';
import { developerPortalApp } from '@/apps/developer-portal/manifest';
import { adminPanelApp } from '@/apps/admin-panel/manifest';
import { studioApp } from '@/apps/studio/manifest';
import { workApp } from '@/apps/work/manifest';
import { payApp } from '@/apps/pay/manifest';

import type { BazariApp } from '../types';

/**
 * Lista de todos os apps nativos do Bazari
 */
export const NATIVE_APPS: BazariApp[] = [
  walletApp,
  feedApp,
  marketplaceApp,
  bazchatApp,
  p2pApp,
  governanceApp,
  analyticsApp,
  vestingApp,
  rewardsApp,
  deliveryApp,
  discoverApp,
  affiliatesApp,
  storesApp,
  vrApp,
  workApp,
  payApp,
  developerPortalApp,
  adminPanelApp,
  studioApp,
];

/**
 * Apps que vêm pré-instalados para novos usuários
 */
export const PRE_INSTALLED_APPS = NATIVE_APPS
  .filter((app) => app.preInstalled)
  .map((app) => app.id);

/**
 * Mapa de apps por ID para acesso rápido
 */
export const NATIVE_APPS_MAP = new Map<string, BazariApp>(
  NATIVE_APPS.map((app) => [app.id, app])
);
