import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface CategoryFilterProps {
  categories: Array<{ path: string[]; count: number }>;
  selectedPaths: string[];
  onChange: (categoryPaths: string[]) => void;
}

interface CategoryNode {
  id: string;
  label: string;
  path: string[];
  count: number;
  level: number;
  children: CategoryNode[];
}

const MAX_VISIBLE = 10;

/**
 * Filtro de categorias com checkboxes hierárquicas
 */
export function CategoryFilter({ categories, selectedPaths, onChange }: CategoryFilterProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  // Construir árvore hierárquica de categorias
  const categoryTree = buildCategoryTree(categories);

  // Determinar quais categorias mostrar
  const visibleCategories = showAll
    ? categoryTree
    : categoryTree.slice(0, MAX_VISIBLE);

  const hasMore = categoryTree.length > MAX_VISIBLE;

  const handleToggle = (path: string[]) => {
    const pathString = path.join('/');
    const isSelected = selectedPaths.includes(pathString);

    if (isSelected) {
      // Remover categoria
      onChange(selectedPaths.filter((s) => s !== pathString));
    } else {
      // Adicionar categoria
      onChange([...selectedPaths, pathString]);
    }
  };

  if (categoryTree.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Título */}
      <h3 className="text-sm font-medium text-store-ink">
        {t('store.filters.categories', { defaultValue: 'Categorias' })}
      </h3>

      {/* Lista de categorias */}
      <div className="space-y-2">
        {visibleCategories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            selected={selectedPaths}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Botão "Ver mais" */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="h-8 w-full text-xs text-store-brand hover:bg-store-brand/10 hover:text-store-brand"
        >
          {showAll ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" />
              {t('store.filters.showLess', { defaultValue: 'Ver menos' })}
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" />
              {t('store.filters.showMore', {
                defaultValue: 'Ver mais',
                count: categoryTree.length - MAX_VISIBLE,
              })}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Item individual de categoria (recursivo para subcategorias)
 */
function CategoryItem({
  category,
  selected,
  onToggle,
}: {
  category: CategoryNode;
  selected: string[];
  onToggle: (path: string[]) => void;
}) {
  const pathString = category.path.join('/');
  const isChecked = selected.includes(pathString);

  // Indentação baseada no nível (0 = raiz, 1 = subcategoria)
  const indentClass = category.level === 0 ? '' : 'ml-6';

  return (
    <div className={indentClass}>
      {/* Checkbox da categoria */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id={category.id}
          checked={isChecked}
          onCheckedChange={() => onToggle(category.path)}
          className="border-store-ink/30 data-[state=checked]:border-store-brand data-[state=checked]:bg-store-brand"
        />
        <Label
          htmlFor={category.id}
          className="flex-1 cursor-pointer text-sm text-store-ink hover:text-store-brand"
        >
          {category.label}{' '}
          <span className="text-store-ink/50">({category.count})</span>
        </Label>
      </div>

      {/* Subcategorias (se houver) */}
      {category.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              selected={selected}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Constrói árvore hierárquica de categorias
 * Agrupa categorias por nível (máximo 2 níveis)
 */
function buildCategoryTree(
  categories: Array<{ path: string[]; count: number }>
): CategoryNode[] {
  const tree: CategoryNode[] = [];
  const nodeMap = new Map<string, CategoryNode>();

  // Ordenar por path (raízes primeiro)
  const sortedCategories = [...categories].sort((a, b) => a.path.length - b.path.length);

  for (const category of sortedCategories) {
    const path = category.path;
    const level = path.length - 1; // 0 = raiz, 1 = subcategoria

    // Limitar a 2 níveis
    if (level > 1) continue;

    const id = path.join('/');
    const label = capitalize(path[path.length - 1]);

    const node: CategoryNode = {
      id,
      label,
      path,
      count: category.count,
      level,
      children: [],
    };

    nodeMap.set(id, node);

    if (level === 0) {
      // Categoria raiz
      tree.push(node);
    } else {
      // Subcategoria - adicionar ao pai
      const parentPath = path.slice(0, -1);
      const parentId = parentPath.join('/');
      const parent = nodeMap.get(parentId);

      if (parent) {
        parent.children.push(node);
      } else {
        // Se não encontrar pai, adicionar como raiz
        tree.push(node);
      }
    }
  }

  return tree;
}

/**
 * Capitaliza primeira letra
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
