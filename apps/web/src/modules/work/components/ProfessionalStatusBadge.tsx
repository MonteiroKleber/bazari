// path: apps/web/src/modules/work/components/ProfessionalStatusBadge.tsx
// Badge de status profissional

import { Badge } from '@/components/ui/badge';
import { Circle, Eye, EyeOff } from 'lucide-react';
import type { ProfessionalStatus } from '../api';

interface ProfessionalStatusBadgeProps {
  status: ProfessionalStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig: Record<ProfessionalStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Circle;
}> = {
  AVAILABLE: {
    label: 'Disponível',
    color: 'text-green-600',
    bgColor: 'bg-green-100 border-green-200',
    icon: Circle,
  },
  NOT_AVAILABLE: {
    label: 'Indisponível',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 border-amber-200',
    icon: Eye,
  },
  INVISIBLE: {
    label: 'Invisível',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 border-gray-200',
    icon: EyeOff,
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function ProfessionalStatusBadge({
  status,
  size = 'md',
  showLabel = true,
}: ProfessionalStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.color} ${sizeClasses[size]} gap-1.5 font-medium`}
    >
      <Icon className={`${iconSizes[size]} ${status === 'AVAILABLE' ? 'fill-green-500' : ''}`} />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}

export default ProfessionalStatusBadge;
