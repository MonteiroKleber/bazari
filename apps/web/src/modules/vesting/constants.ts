// FASE 9: Vesting System - Constants
// path: apps/web/src/modules/vesting/constants.ts

import type { VestingCategoryInfo } from './types';

export const VESTING_CATEGORIES: Record<string, VestingCategoryInfo> = {
  founders: {
    key: 'founders',
    label: 'Fundadores',
    labelEn: 'Founders',
    color: 'text-purple-600 dark:text-purple-400',
    icon: '👥',
    description: '150M BZR • 4 anos • 1 ano cliff',
    descriptionEn: '150M BZR • 4 years • 1 year cliff',
  },
  team: {
    key: 'team',
    label: 'Equipe',
    labelEn: 'Team',
    color: 'text-blue-600 dark:text-blue-400',
    icon: '🛠️',
    description: '100M BZR • 3 anos • 6 meses cliff',
    descriptionEn: '100M BZR • 3 years • 6 months cliff',
  },
  partners: {
    key: 'partners',
    label: 'Parceiros',
    labelEn: 'Partners',
    color: 'text-green-600 dark:text-green-400',
    icon: '🤝',
    description: '80M BZR • 2 anos • 3 meses cliff',
    descriptionEn: '80M BZR • 2 years • 3 months cliff',
  },
  marketing: {
    key: 'marketing',
    label: 'Marketing',
    labelEn: 'Marketing',
    color: 'text-orange-600 dark:text-orange-400',
    icon: '📢',
    description: '50M BZR • 1 ano • sem cliff',
    descriptionEn: '50M BZR • 1 year • no cliff',
  },
};

export const BLOCK_TIME_SECONDS = 6;
export const BLOCKS_PER_DAY = 14400; // 24 * 60 * 60 / 6
export const BLOCKS_PER_MONTH = BLOCKS_PER_DAY * 30;
export const BLOCKS_PER_YEAR = BLOCKS_PER_DAY * 365;

export const CHART_COLORS = {
  founders: '#9333ea', // purple-600
  team: '#2563eb', // blue-600
  partners: '#16a34a', // green-600
  marketing: '#ea580c', // orange-600
};
