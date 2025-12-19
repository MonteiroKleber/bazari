// path: apps/web/src/modules/work/components/SkillTagList.tsx
// Lista de skills com visual aprimorado

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SkillTagListProps {
  skills: string[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'default' | 'secondary' | 'outline';
  onSkillClick?: (skill: string) => void;
}

export function SkillTagList({
  skills,
  max,
  size = 'md',
  className,
  variant = 'secondary',
  onSkillClick,
}: SkillTagListProps) {
  const displayedSkills = max ? skills.slice(0, max) : skills;
  const remaining = max && skills.length > max ? skills.length - max : 0;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0',
    md: 'text-xs sm:text-sm px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {displayedSkills.map((skill) => (
        <Badge
          key={skill}
          variant={variant}
          className={cn(
            sizeClasses[size],
            onSkillClick && 'cursor-pointer hover:bg-primary/20 transition-colors'
          )}
          onClick={() => onSkillClick?.(skill)}
        >
          {skill}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className={sizeClasses[size]}>
          +{remaining}
        </Badge>
      )}
    </div>
  );
}

export default SkillTagList;
