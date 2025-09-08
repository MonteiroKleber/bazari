// path: apps/web/src/components/CategoryPicker.tsx

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface Category {
  id: string;
  namePt: string;
  nameEn: string;
  nameEs: string;
  level: number;
  parentId: string | null;
  kind: string;
  pathSlugs: string[];
}

interface CategoryPickerProps {
  type: 'product' | 'service';
  onSelect: (category: Category) => void;
  categories: Category[];
  language?: string;
}

export function CategoryPicker({ type, onSelect, categories = [], language = 'pt' }: CategoryPickerProps) {
  const [selectedPath, setSelectedPath] = useState<Category[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);

  // PROTEÇÃO: Se não houver categorias, mostrar loading/erro
  if (!categories || categories.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Carregando categorias...</p>
      </div>
    );
  }

  // Função para pegar o nome na língua correta
  const getCategoryName = (cat: Category) => {
    switch (language) {
      case 'en': return cat.nameEn;
      case 'es': return cat.nameEs;
      default: return cat.namePt;
    }
  };

  // Filtrar categorias do nível atual
  const getCurrentLevelCategories = () => {
    const kind = type === 'product' ? 'product' : 'service';
    
    if (currentLevel === 1) {
      // Nível 1: mostrar apenas categorias raiz do tipo selecionado
      return categories.filter(cat => 
        cat.kind === kind && 
        cat.level === 1
      );
    } else {
      // Níveis 2-4: mostrar filhas da última categoria selecionada
      const parentId = selectedPath[selectedPath.length - 1]?.id;
      return categories.filter(cat => 
        cat.parentId === parentId && 
        cat.level === currentLevel
      );
    }
  };

  // Resto do componente continua igual...
  const handleCategoryClick = (category: Category) => {
    const newPath = [...selectedPath, category];
    setSelectedPath(newPath);

    if (category.level === 4) {
      onSelect(category);
    } else {
      setCurrentLevel(category.level + 1);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = selectedPath.slice(0, index);
    setSelectedPath(newPath);
    setCurrentLevel(newPath.length > 0 ? newPath[newPath.length - 1].level + 1 : 1);
  };

  const availableCategories = getCurrentLevelCategories();

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      {selectedPath.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => {
              setSelectedPath([]);
              setCurrentLevel(1);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            {type === 'product' ? 'Produtos' : 'Serviços'}
          </button>
          {selectedPath.map((cat, index) => (
            <div key={cat.id} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() => handleBreadcrumbClick(index + 1)}
                className={cn(
                  "hover:text-foreground",
                  index === selectedPath.length - 1 
                    ? "text-foreground font-medium" 
                    : "text-muted-foreground"
                )}
              >
                {getCategoryName(cat)}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Título do nível atual */}
      <div className="text-sm text-muted-foreground">
        Selecione {currentLevel === 1 ? 'a categoria principal' : 
                  currentLevel === 2 ? 'a subcategoria' :
                  currentLevel === 3 ? 'o tipo' : 
                  'a especialização'}
        <span className="ml-2 text-xs">(Nível {currentLevel} de 4)</span>
      </div>

      {/* Grid de categorias */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {availableCategories.length > 0 ? (
          availableCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              className={cn(
                "p-4 rounded-lg border text-left transition-all",
                "hover:border-primary hover:bg-accent",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
            >
              <div className="font-medium">{getCategoryName(category)}</div>
              {category.level < 4 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Clique para ver subcategorias
                </div>
              )}
              {category.level === 4 && (
                <div className="text-xs text-primary mt-1">
                  Categoria final
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {currentLevel > 1 
              ? 'Nenhuma subcategoria disponível neste nível'
              : 'Nenhuma categoria disponível'}
          </div>
        )}
      </div>

      {/* Indicador de progresso */}
      <div className="flex gap-1 justify-center mt-4">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              "h-2 w-12 rounded-full transition-colors",
              level <= currentLevel 
                ? "bg-primary" 
                : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}