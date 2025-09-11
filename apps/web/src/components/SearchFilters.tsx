// V-1: SearchFilters component for sidebar/topbar filters - 2025-09-11
// Modular component for all search filters
// path: apps/web/src/components/SearchFilters.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CategoryPicker } from './CategoryPicker';
import { Facets } from '../lib/api';
import { X } from 'lucide-react';

interface FilterValues {
  categoryId?: string;
  categoryPath?: string[];
  priceMin?: number;
  priceMax?: number;
  attributes?: Record<string, string | string[]>;
}

interface SearchFiltersProps {
  value: FilterValues;
  onChange: (filters: FilterValues) => void;
  facets?: Facets;
  className?: string;
}

export function SearchFilters({ value, onChange, facets, className }: SearchFiltersProps) {
  const { t } = useTranslation();

  // Handle category change
  const handleCategoryChange = (category: { categoryId?: string; categoryPath?: string[] }) => {
    onChange({
      ...value,
      categoryId: category.categoryId,
      categoryPath: category.categoryPath
    });
  };

  // Handle price change
  const handlePriceChange = (field: 'priceMin' | 'priceMax', val: string) => {
    const numVal = val ? parseFloat(val) : undefined;
    onChange({
      ...value,
      [field]: numVal
    });
  };

  // Handle attribute change
  const handleAttributeChange = (key: string, val: string | string[]) => {
    const newAttributes = { ...value.attributes };
    
    if (!val || (Array.isArray(val) && val.length === 0)) {
      delete newAttributes[key];
    } else {
      newAttributes[key] = val;
    }

    onChange({
      ...value,
      attributes: Object.keys(newAttributes).length > 0 ? newAttributes : undefined
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    onChange({});
  };

  // Check if has active filters
  const hasActiveFilters = Boolean(
    value.categoryId || 
    value.priceMin !== undefined || 
    value.priceMax !== undefined ||
    (value.attributes && Object.keys(value.attributes).length > 0)
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('search.filters.title')}</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              {t('search.filters.clear')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            {t('search.filters.category')}
          </Label>
          <CategoryPicker
            mode="filter"
            value={{ categoryId: value.categoryId, categoryPath: value.categoryPath }}
            onChange={handleCategoryChange}
          />
        </div>

        {/* Price Range */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            {t('search.filters.priceRange')}
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t('search.filters.priceMin')}
              value={value.priceMin || ''}
              onChange={(e) => handlePriceChange('priceMin', e.target.value)}
              min="0"
              step="0.01"
              className="w-full"
            />
            <span className="self-center text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder={t('search.filters.priceMax')}
              value={value.priceMax || ''}
              onChange={(e) => handlePriceChange('priceMax', e.target.value)}
              min="0"
              step="0.01"
              className="w-full"
            />
          </div>
        </div>

        {/* Dynamic Attributes from Facets */}
        {facets?.attributes && Object.keys(facets.attributes).length > 0 && (
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">
              {t('search.filters.attributes')}
            </Label>
            <div className="space-y-3">
              {Object.entries(facets.attributes).map(([key, facet]) => {
                const currentValue = value.attributes?.[key];
                const options = facet.options || [];
                
                // Decide render type based on number of options
                const isMultiSelect = options.length > 5;

                if (isMultiSelect) {
                  // Render as checkboxes for multiple selection
                  return (
                    <div key={key}>
                      <Label className="text-sm mb-2 block capitalize">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      <div className="space-y-2">
                        {options.map((option) => {
                          const isChecked = Array.isArray(currentValue) 
                            ? currentValue.includes(option.value)
                            : currentValue === option.value;
                          
                          return (
                            <div key={option.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${key}-${option.value}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    const newVal = Array.isArray(currentValue)
                                      ? [...currentValue, option.value]
                                      : currentValue 
                                        ? [currentValue, option.value]
                                        : [option.value];
                                    handleAttributeChange(key, newVal);
                                  } else {
                                    const newVal = Array.isArray(currentValue)
                                      ? currentValue.filter(v => v !== option.value)
                                      : [];
                                    handleAttributeChange(key, newVal);
                                  }
                                }}
                              />
                              <label
                                htmlFor={`${key}-${option.value}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {option.value}
                                <span className="text-muted-foreground ml-1">
                                  ({option.count})
                                </span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else {
                  // Render as select for single selection
                  return (
                    <div key={key}>
                      <Label className="text-sm mb-2 block capitalize">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      <Select
                        value={Array.isArray(currentValue) ? currentValue[0] : currentValue || ''}
                        onValueChange={(val) => handleAttributeChange(key, val || '')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">
                            {t('common.all')}
                          </SelectItem>
                          {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.value} ({option.count})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}