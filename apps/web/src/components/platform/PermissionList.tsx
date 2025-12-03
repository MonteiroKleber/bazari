import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import * as icons from 'lucide-react';
import type { PermissionDefinition, PermissionRisk } from '@/platform/types';

interface PermissionListProps {
  permissions: PermissionDefinition[];
  selectable?: boolean;
  selected?: string[];
  onSelect?: (permissionIds: string[]) => void;
  showRisk?: boolean;
  className?: string;
}

const riskColors: Record<PermissionRisk, string> = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
};

const riskLabels: Record<PermissionRisk, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  critical: 'Crítico',
};

export function PermissionList({
  permissions,
  selectable = false,
  selected = [],
  onSelect,
  showRisk = true,
  className,
}: PermissionListProps) {
  const handleToggle = (permissionId: string) => {
    if (!onSelect) return;

    const newSelected = selected.includes(permissionId)
      ? selected.filter((id) => id !== permissionId)
      : [...selected, permissionId];

    onSelect(newSelected);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {permissions.map((permission) => {
        const IconComponent = icons[permission.icon as keyof typeof icons] as React.ComponentType<{
          className?: string;
        }>;
        const isSelected = selected.includes(permission.id);

        return (
          <div
            key={permission.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border',
              selectable && 'cursor-pointer hover:bg-accent/50',
              isSelected && 'border-primary bg-primary/5'
            )}
            onClick={() => selectable && handleToggle(permission.id)}
          >
            {selectable && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggle(permission.id)}
                className="mt-0.5"
              />
            )}

            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                riskColors[permission.risk]
              )}
            >
              {IconComponent && <IconComponent className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{permission.name}</span>
                {showRisk && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      riskColors[permission.risk]
                    )}
                  >
                    {riskLabels[permission.risk]}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {permission.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
