// path: apps/web/src/components/CategoryPicker.tsx

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { API_BASE_URL } from '../config';

interface Category {
  id: string;
  slug: string;
  kind: 'product' | 'service';
  level: number;
  namePt: string;
  nameEn: string;
  nameEs: string;
  pathSlugs: string[];
  active: boolean;
}

interface CategoryPickerProps {
  kind: 'product' | 'service';
  onSelect: (categoryId: string, categoryPath: string[]) => void;
  maxLevel?: number;
}

export function CategoryPicker({ kind, onSelect, maxLevel = 4 }: CategoryPickerProps) {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPath, setSelectedPath] = useState<string[]>([kind === 'product' ? 'products' : 'services']);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      const data = await response.json();
      setCategories(data.flat.filter((c: Category) => c.kind === kind));
      setLoading(false);
    } catch (error) {
      console.error('Error loading categories:', error);
      setLoading(false);
    }
  };

  const getCategoryName = (category: Category) => {
    switch (i18n.language) {
      case 'en':
        return category.nameEn;
      case 'es':
        return category.nameEs;
      default:
        return category.namePt;
    }
  };

  const getCategoriesByLevel = (level: number, parentPath: string[]) => {
    return categories.filter(c => 
      c.level === level &&
      parentPath.every((p, i) => c.pathSlugs[i] === p)
    );
  };

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelect = (category: Category) => {
    setSelectedPath(category.pathSlugs);
    
    // Se não é o nível máximo, expandir
    if (category.level < maxLevel) {
      toggleExpand(category.id);
    }
    
    onSelect(category.id, category.pathSlugs);
  };

  const renderLevel = (level: number, parentPath: string[]) => {
    const levelCategories = getCategoriesByLevel(level, parentPath);
    
    if (levelCategories.length === 0) return null;

    return (
      <div className="ml-4">
        {levelCategories.map(category => {
          const isExpanded = expandedNodes.has(category.id);
          const isSelected = category.id === selectedPath.join('-');
          const hasChildren = level < maxLevel && 
            categories.some(c => c.level === level + 1 && 
              category.pathSlugs.every((p, i) => c.pathSlugs[i] === p)
            );

          return (
            <div key={category.id}>
              <Button
                variant={isSelected ? 'secondary' : 'ghost'}
                className="w-full justify-start text-left mb-1"
                onClick={() => handleSelect(category)}
              >
                {hasChildren && (
                  <span className="mr-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                )}
                <span className="flex-1">{getCategoryName(category)}</span>
                <span className="text-xs text-muted-foreground ml-2">L{level}</span>
              </Button>
              
              {isExpanded && hasChildren && renderLevel(level + 1, category.pathSlugs)}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-4">{t('common.loading')}</div>;
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="mb-2">
        <div className="text-sm text-muted-foreground mb-2">
          {t('categories.breadcrumb')}: {selectedPath.join(' > ')}
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {renderLevel(1, [kind === 'product' ? 'products' : 'services'])}
      </div>
    </div>
  );
}