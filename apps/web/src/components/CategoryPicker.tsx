// V-2: CategoryPicker with filter mode support - 2025-09-11
// Added mode="filter" for search page usage
// path: apps/web/src/components/CategoryPicker.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useCategories } from '../hooks/useCategories';

interface CategoryPickerProps {
  mode?: 'default' | 'filter';
  value?: {
    categoryId?: string;
    categoryPath?: string[];
  };
  onChange: (category: { categoryId?: string; categoryPath?: string[] }) => void;
  className?: string;
}

export function CategoryPicker({ 
  mode = 'default', 
  value, 
  onChange, 
  className 
}: CategoryPickerProps) {
  const { t, i18n } = useTranslation();
  const { categories, loading, error } = useCategories();
  
  const [selectedPath, setSelectedPath] = useState<string[]>(value?.categoryPath || []);
  const [currentLevel, setCurrentLevel] = useState(0);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value?.categoryPath) {
      setSelectedPath(value.categoryPath);
      setCurrentLevel(value.categoryPath.length - 1);
    }
  }, [value]);

  // Get category name based on language
  const getCategoryName = (category: any) => {
    const lang = i18n.language?.split('-')[0] || 'pt';
    switch (lang) {
      case 'en': return category.nameEn || category.namePt;
      case 'es': return category.nameEs || category.namePt;
      default: return category.namePt;
    }
  };

  // Filter categories by level and parent path
  const getCategoriesForLevel = (level: number) => {
    if (!categories) return [];
    
    return categories.filter(cat => {
      if (cat.level !== level + 1) return false;
      
      if (level === 0) {
        // First level - show products/services
        return cat.pathSlugs.length === 2;
      }
      
      // Check if category matches selected path up to current level
      for (let i = 0; i < level; i++) {
        if (cat.pathSlugs[i] !== selectedPath[i]) return false;
      }
      
      return true;
    });
  };

  // Handle category selection
  const handleSelect = (category: any) => {
    const newPath = category.pathSlugs.slice(0, category.level);
    setSelectedPath(newPath);
    
    // Check if this category has children
    const hasChildren = categories.some(cat => 
      cat.level === category.level + 1 &&
      cat.pathSlugs.slice(0, category.level).every((slug: string, i: number) => 
        slug === newPath[i]
      )
    );

    if (hasChildren) {
      // Move to next level
      setCurrentLevel(category.level);
    } else {
      // Final selection
      onChange({
        categoryId: category.id,
        categoryPath: newPath
      });
      
      // In filter mode, don't reset view
      if (mode !== 'filter') {
        setCurrentLevel(category.level);
      }
    }
  };

  // Clear selection (filter mode only)
  const handleClear = () => {
    setSelectedPath([]);
    setCurrentLevel(0);
    onChange({});
  };

  // Navigate to previous level
  const handleBack = () => {
    if (currentLevel > 0) {
      const newPath = selectedPath.slice(0, currentLevel - 1);
      setSelectedPath(newPath);
      setCurrentLevel(currentLevel - 1);
    }
  };

  if (loading) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-destructive">{t('categories.error')}</p>
      </div>
    );
  }

  const currentCategories = getCategoriesForLevel(currentLevel);
  const isFilterMode = mode === 'filter';

  return (
    <div className={className}>
      {/* Selected Path Display */}
      {selectedPath.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {selectedPath.map((slug, index) => {
              const cat = categories.find(c => 
                c.pathSlugs[index] === slug && c.level === index + 1
              );
              return (
                <React.Fragment key={index}>
                  {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  <Badge 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => {
                      const newPath = selectedPath.slice(0, index + 1);
                      setSelectedPath(newPath);
                      setCurrentLevel(index);
                    }}
                  >
                    {cat ? getCategoryName(cat) : slug}
                  </Badge>
                </React.Fragment>
              );
            })}
            {isFilterMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      {currentLevel > 0 && !isFilterMode && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="mb-3"
        >
          {t('common.back')}
        </Button>
      )}

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {currentCategories.map((category) => {
          const isSelected = selectedPath[currentLevel] === category.pathSlugs[currentLevel];
          const hasChildren = categories.some(cat => 
            cat.level === category.level + 1 &&
            cat.pathSlugs.slice(0, category.level).every((slug: string, i: number) => 
              slug === category.pathSlugs[i]
            )
          );

          return (
            <Card
              key={category.id}
              className={`
                cursor-pointer transition-all hover:shadow-md
                ${isSelected ? 'ring-2 ring-primary' : ''}
              `}
              onClick={() => handleSelect(category)}
            >
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {getCategoryName(category)}
                  </span>
                  {isSelected && !hasChildren && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  {hasChildren && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {!hasChildren && isFilterMode && (
                  <span className="text-xs text-muted-foreground">
                    {t('categories.can_select')}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Level Indicator */}
      <div className="mt-3 text-center">
        <span className="text-xs text-muted-foreground">
          {t('categories.level_indicator', {
            current: currentLevel + 1,
            max: 4
          })}
        </span>
      </div>
    </div>
  );
}