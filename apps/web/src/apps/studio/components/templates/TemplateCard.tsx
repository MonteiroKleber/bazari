/**
 * TemplateCard - Individual template card for the gallery
 */

import React from 'react';
import type { Template } from '../../types/studio.types';
import {
  Store,
  Users,
  LineChart,
  Award,
  FileCode,
  Wrench,
  Layers,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  template: Template;
  isSelected?: boolean;
  onClick?: (template: Template) => void;
}

// Map icon names to Lucide components
const iconMap: Record<string, React.ElementType> = {
  FileCode: FileCode,
  Store: Store,
  Users: Users,
  LineChart: LineChart,
  Award: Award,
  Wrench: Wrench,
  Layers: Layers,
};

// Category labels
const categoryLabels: Record<string, string> = {
  starter: 'Starter',
  commerce: 'Commerce',
  social: 'Social',
  finance: 'Finance',
  tools: 'Tools',
  contract: 'Contract',
};

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSelected = false,
  onClick,
}) => {
  const IconComponent = iconMap[template.icon] || FileCode;

  const handleClick = () => {
    onClick?.(template);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(template);
    }
  };

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-xl border-2 bg-card p-4 transition-all hover:shadow-lg',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-transparent hover:border-muted-foreground/20'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Select ${template.name} template`}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <Check className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      {/* Icon */}
      <div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg"
        style={{ backgroundColor: template.color + '20' }}
      >
        <IconComponent
          className="h-6 w-6"
          style={{ color: template.color }}
        />
      </div>

      {/* Content */}
      <h3 className="mb-1 font-semibold text-foreground">{template.name}</h3>
      <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
        {template.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: template.color + '15',
            color: template.color,
          }}
        >
          {categoryLabels[template.category] || template.category}
        </span>
        {template.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* SDK Features (on hover) */}
      <div className="mt-3 hidden border-t border-border pt-3 group-hover:block">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">SDK:</span>{' '}
          {template.sdkFeatures.join(', ')}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Files:</span> {template.files.length}
        </p>
      </div>
    </div>
  );
};

export default TemplateCard;
