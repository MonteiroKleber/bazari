import type { MissionType } from '@/hooks/blockchain/useRewards';

/**
 * MissionTypeIcon - Display icon for each mission type
 *
 * Mission Types (7 types):
 * - CompleteOrders: 📦
 * - SpendAmount: 💰
 * - ReferUsers: 👥
 * - CreateStore: 🏪
 * - FirstPurchase: 🎉
 * - DailyStreak: 🔥
 * - Custom: ⭐
 */

const MISSION_TYPE_ICONS: Record<MissionType, string> = {
  CompleteOrders: '📦',
  SpendAmount: '💰',
  ReferUsers: '👥',
  CreateStore: '🏪',
  FirstPurchase: '🎉',
  DailyStreak: '🔥',
  Custom: '⭐',
};

const MISSION_TYPE_COLORS: Record<MissionType, string> = {
  CompleteOrders: 'from-blue-100 to-blue-200',
  SpendAmount: 'from-green-100 to-green-200',
  ReferUsers: 'from-purple-100 to-purple-200',
  CreateStore: 'from-orange-100 to-orange-200',
  FirstPurchase: 'from-pink-100 to-pink-200',
  DailyStreak: 'from-red-100 to-red-200',
  Custom: 'from-yellow-100 to-yellow-200',
};

interface MissionTypeIconProps {
  type: MissionType;
  size?: number;
  className?: string;
}

export const MissionTypeIcon = ({
  type,
  size = 24,
  className = '',
}: MissionTypeIconProps) => {
  const icon = MISSION_TYPE_ICONS[type] || MISSION_TYPE_ICONS.Custom;
  const colorClass = MISSION_TYPE_COLORS[type] || MISSION_TYPE_COLORS.Custom;

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${colorClass} rounded-xl ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.6,
      }}
      role="img"
      aria-label={`${type} mission`}
    >
      {icon}
    </div>
  );
};

/**
 * Get mission type display name
 */
export const getMissionTypeName = (type: MissionType): string => {
  const names: Record<MissionType, string> = {
    CompleteOrders: 'Complete Orders',
    SpendAmount: 'Spend Amount',
    ReferUsers: 'Refer Users',
    CreateStore: 'Create Store',
    FirstPurchase: 'First Purchase',
    DailyStreak: 'Daily Streak',
    Custom: 'Custom Mission',
  };
  return names[type] || type;
};
