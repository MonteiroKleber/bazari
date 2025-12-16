/**
 * TemplateGallery - Grid view of available templates with filtering
 */

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TemplateCard } from './TemplateCard';
import type { Template, TemplateCategory } from '../../types/studio.types';
import { templatesService } from '../../services/templates.service';
import { Search, Grid3X3, List, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateGalleryProps {
  onSelect: (template: Template) => void;
  selectedTemplate?: Template | null;
}

// Category display config
const categoryConfig: Record<
  TemplateCategory,
  { label: string; description: string }
> = {
  starter: {
    label: 'Starter',
    description: 'Basic templates to get started quickly',
  },
  commerce: {
    label: 'Commerce',
    description: 'E-commerce and store templates',
  },
  social: {
    label: 'Social',
    description: 'Community and social app templates',
  },
  finance: {
    label: 'Finance',
    description: 'DeFi and financial app templates',
  },
  tools: {
    label: 'Tools',
    description: 'Utility and tool templates',
  },
  contract: {
    label: 'Contract',
    description: 'Smart contract templates',
  },
};

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onSelect,
  selectedTemplate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const allTemplates = templatesService.getAll();
  const categories = templatesService.getCategories();

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;

    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return templates;
  }, [allTemplates, selectedCategory, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search and filters bar */}
      <div className="mb-4 flex items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center rounded-lg border border-border p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All ({allTemplates.length})
        </Button>
        {categories.map((category) => {
          const config = categoryConfig[category];
          const count = allTemplates.filter((t) => t.category === category).length;
          return (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {config?.label || category} ({count})
            </Button>
          );
        })}
      </div>

      {/* Templates grid/list */}
      <div className="flex-1 overflow-auto">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No templates found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
            {searchQuery && (
              <Button
                variant="link"
                className="mt-2"
                onClick={handleClearSearch}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col gap-3'
            )}
          >
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onClick={onSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected template preview (if any) */}
      {selectedTemplate && (
        <div className="mt-4 rounded-lg border border-primary bg-primary/5 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-foreground">
                Selected: {selectedTemplate.name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {selectedTemplate.files.length} files •{' '}
                {selectedTemplate.defaultPermissions.length} permissions •{' '}
                {selectedTemplate.sdkFeatures.join(', ')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect(selectedTemplate)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateGallery;
