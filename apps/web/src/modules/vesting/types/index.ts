// FASE 9: Vesting System - Frontend Types
// path: apps/web/src/modules/vesting/types/index.ts

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface VestingInfo {
  locked: string;
  perBlock: string;
  startingBlock: number;
}

export interface VestingSchedule {
  account: string;
  schedules: VestingInfo[];
  totalLocked: string;
  totalVested: string;
  totalUnvested: string;
  vestedPercentage: number;
  currentBlock: number;
}

export interface CategoryStats {
  account: string;
  totalLocked: string;
  vested: string;
  unvested: string;
  vestedPercentage: number;
  startBlock: number;
  duration: number;
  cliff: number;
}

export interface VestingStats {
  totalAllocated: string;
  totalVested: string;
  totalUnvested: string;
  vestedPercentage: number;
  currentBlock: number;
  categories: {
    founders: CategoryStats;
    team: CategoryStats;
    partners: CategoryStats;
    marketing: CategoryStats;
  };
}

export interface VestingAccounts {
  founders: string;
  team: string;
  partners: string;
  marketing: string;
}

export interface SchedulePoint {
  block: number;
  vested: string;
  unvested: string;
  percentage: number;
  isPast: boolean;
}

export interface VestingScheduleData {
  account: string;
  currentBlock: number;
  startingBlock: number;
  endBlock: number;
  totalDuration: number;
  schedule: SchedulePoint[];
}

export type VestingCategory = 'founders' | 'team' | 'partners' | 'marketing';

export interface VestingCategoryInfo {
  key: VestingCategory;
  label: string;
  labelEn: string;
  color: string;
  icon: string;
  description: string;
  descriptionEn: string;
}
