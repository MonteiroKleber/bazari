// V-4: Versão final com todas as correções de navegação (2025-01-11)
// Fix: Melhor detecção de quando começar navegação do zero vs. continuar navegação existente
// Fix: Breadcrumbs mais robustos e navegação entre níveis aprimorada
// Compatible com NewListingPage V-7 que limpa categoria ao selecionar tipo

import React, { useState, useEffect } from 'react';
import { ChevronRight, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';

interface CategoryPickerProps {
  kind: 'product' | 'service';
  onSelect: (categoryPath: string[], categoryId: string) => void;
  className?: string;
  value?: string[]; // Categoria pré-selecionada (para voltar de steps posteriores ou "cadastrar outro")
}

export function CategoryPicker({ kind, onSelect, className = '', value }: CategoryPickerProps) {
  const { t, i18n } = useTranslation();
  const { categories, loading, error } = useCategories();
  const [selectedPath, setSelectedPath] = useState<string[]>(value || []);
  const [currentLevel, setCurrentLevel] = useState(1);

  // Atualizar quando value mudar (para "cadastrar outro", "voltar" ou reset)
  useEffect(() => {
    console.log('🔄 CategoryPicker useEffect - value changed:', value);
    
    if (value && value.length > 0) {
      // Tem categoria pré-selecionada (voltando de step posterior ou cadastrando outro)
      setSelectedPath(value);
      setCurrentLevel(value.length); // Ir para o nível da categoria selecionada
      console.log('📍 Categoria pré-selecionada detectada, nível:', value.length);
    } else {
      // Nova navegação ou reset - começar do zero
      setSelectedPath([]);
      setCurrentLevel(1);
      console.log('🆕 Nova navegação de categoria, começando do nível 1');
    }
  }, [value, kind]); // Incluir kind para resetar quando tipo mudar

  const getFilteredCategories = (level: number) => {
    if (!categories || categories.length === 0) return [];
    
    // Filtrar por tipo e nível
    let filtered = categories.filter(cat => 
      cat.kind === kind && cat.level === level
    );

    // Se tem caminho selecionado, filtrar pelo parent
    if (selectedPath.length >= level - 1 && level > 1) {
      // Construir o ID do parent baseado no caminho selecionado
      const parentPathParts = [`${kind}s`, ...selectedPath.slice(0, level - 1)];
      const parentId = parentPathParts.join('-');
      
      console.log('🔍 Procurando filhos de:', parentId, 'no nível:', level);
      
      filtered = filtered.filter(cat => cat.parentId === parentId);
    } else if (level === 1) {
      // Para nível 1, não deve ter parentId ou parentId null
      filtered = filtered.filter(cat => !cat.parentId || cat.parentId === null);
    }

    return filtered;
  };

  const handleCategoryClick = (category: any) => {
    // Sempre usar pathParts (sem prefixo "products/services")
    const pathParts = category.pathSlugs.filter((p: string) => p !== `${kind}s`);
    console.log('👆 Categoria clicada:', category.id, 'pathParts:', pathParts);
    
    setSelectedPath(pathParts);
    
    // Verificar se esta categoria tem filhos
    const hasChildren = categories?.some(cat => cat.parentId === category.id);
    
    if (hasChildren && category.level < 4) {
      // Tem filhos e não é nível máximo, avançar para próximo nível
      console.log('📁 Categoria tem filhos, avançando para nível:', category.level + 1);
      setCurrentLevel(category.level + 1);
    } else {
      // É uma folha ou nível máximo, pode selecionar
      console.log('✅ Categoria selecionável, enviando:', pathParts, category.id);
      onSelect(pathParts, category.id);
    }
  };

  // Confirmar seleção atual (quando categoria já está escolhida)
  const handleConfirmSelection = () => {
    if (selectedPath.length > 0) {
      // Encontrar a categoria atual pelo path
      const currentCategoryId = `${kind}s-${selectedPath.join('-')}`;
      console.log('✅ Confirmando seleção:', selectedPath, currentCategoryId);
      onSelect(selectedPath, currentCategoryId);
    }
  };

  // Navegar para nível específico via breadcrumbs
  const handleBreadcrumbClick = (targetIndex: number) => {
    console.log('🍞 Breadcrumb clicado, indo para nível:', targetIndex + 1);
    
    if (targetIndex === 0) {
      // Voltar para nível 1 (root)
      setSelectedPath([]);
      setCurrentLevel(1);
    } else {
      // Voltar para nível específico
      const newPath = selectedPath.slice(0, targetIndex);
      setSelectedPath(newPath);
      setCurrentLevel(targetIndex + 1);
    }
  };

  const isLeafCategory = (category: any) => {
    // Verifica se a categoria não tem filhos OU se está no nível máximo
    return !categories?.some(cat => cat.parentId === category.id) || category.level === 4;
  };

  const canSelectCategory = (category: any) => {
    // Pode selecionar se for folha OU se estiver no nível 4
    return isLeafCategory(category);
  };

  // Verifica se uma categoria está selecionada atualmente
  const isCategorySelected = (category: any) => {
    const pathParts = category.pathSlugs.filter((p: string) => p !== `${kind}s`);
    return selectedPath.length === pathParts.length && 
           selectedPath.every((part, index) => part === pathParts[index]);
  };

  const getBreadcrumbs = () => {
    const crumbs = [kind === 'product' ? t('products.title', 'Produtos') : t('services.title', 'Serviços')];
    
    selectedPath.forEach((pathItem, index) => {
      // Buscar categoria correspondente ao path item no nível correto
      const levelCategories = categories?.filter(cat => 
        cat.kind === kind && cat.level === index + 1
      ) || [];
      
      const selected = levelCategories.find(cat => {
        const catPathParts = cat.pathSlugs.filter((p: string) => p !== `${kind}s`);
        return catPathParts[index] === pathItem;
      });
      
      if (selected) {
        const nameKey = i18n.language === 'pt' ? 'namePt' : 
                       i18n.language === 'es' ? 'nameEs' : 'nameEn';
        crumbs.push(selected[nameKey]);
      }
    });
    
    return crumbs;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {t('categories.error', 'Erro ao carregar categorias')}
        </p>
      </div>
    );
  }

  const currentCategories = getFilteredCategories(currentLevel);
  const breadcrumbs = getBreadcrumbs();
  const maxLevel = 4;

  // Verificar se estamos mostrando categoria já selecionada
  const hasSelectedCategory = selectedPath.length > 0 && selectedPath.length === currentLevel;
  const selectedCategory = hasSelectedCategory ? 
    currentCategories.find(cat => isCategorySelected(cat)) : null;

  // Debug info (só em desenvolvimento)
  if (import.meta.env.DEV) {
    console.log('🐛 CategoryPicker Debug:', {
      kind,
      currentLevel,
      selectedPath,
      totalCategories: categories?.length,
      currentCategories: currentCategories.length,
      hasSelectedCategory,
      selectedCategoryId: selectedCategory?.id,
      value
    });
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-4 h-4" />}
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className="hover:text-foreground transition-colors"
              type="button"
            >
              {crumb}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Título do nível */}
      <div className="space-y-2">
        <h3 className="font-medium">
          {currentLevel === 1 && t('categories.select_main', 'Selecione a categoria principal')}
          {currentLevel === 2 && t('categories.select_sub', 'Selecione a subcategoria')}
          {currentLevel === 3 && t('categories.select_specific', 'Selecione a categoria específica')}
          {currentLevel === 4 && t('categories.select_detail', 'Selecione a especialização')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('categories.level_indicator', { current: currentLevel, max: maxLevel, defaultValue: 'Nível {{current}} de {{max}}' })}
        </p>
      </div>

      {/* Seção: Categoria atualmente selecionada (quando voltando de step posterior) */}
      {hasSelectedCategory && selectedCategory && (
        <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-primary">
                {t('categories.currently_selected', 'Categoria selecionada:')}
              </p>
              <p className="text-lg">
                {selectedCategory[i18n.language === 'pt' ? 'namePt' : 
                              i18n.language === 'es' ? 'nameEs' : 'nameEn']}
              </p>
            </div>
            <Button onClick={handleConfirmSelection} className="flex items-center gap-2">
              {t('common.continue', 'Continuar')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Grid de categorias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {currentCategories.length > 0 ? (
          currentCategories.map((category) => {
            const nameKey = i18n.language === 'pt' ? 'namePt' : 
                           i18n.language === 'es' ? 'nameEs' : 'nameEn';
            const isLeaf = isLeafCategory(category);
            const canSelect = canSelectCategory(category);
            const isSelected = isCategorySelected(category);
            
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                type="button"
                className={`
                  relative p-4 rounded-lg border-2 transition-all text-left
                  ${isSelected 
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
                    : canSelect 
                      ? 'border-primary/20 hover:border-primary bg-primary/5 hover:bg-primary/10' 
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                      {category[nameKey]}
                    </p>
                    {isSelected && (
                      <p className="text-xs text-primary mt-1">
                        {t('categories.selected', 'Selecionada')}
                      </p>
                    )}
                    {isLeaf && !isSelected && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('categories.can_select', 'Clique para selecionar')}
                      </p>
                    )}
                  </div>
                  {isSelected ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : isLeaf ? (
                    <Check className="w-5 h-5 text-primary/50" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <p>{t('categories.no_subcategories', 'Nenhuma subcategoria disponível')}</p>
            <p className="text-sm mt-2">{t('categories.is_final_level', 'Esta categoria pode ser selecionada')}</p>
            {/* Debug info em desenvolvimento */}
            {import.meta.env.DEV && (
              <p className="text-xs mt-4 opacity-50">
                Debug: kind={kind}, level={currentLevel}, total={categories?.length || 0}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Informação adicional */}
      {currentLevel < maxLevel && currentCategories.length > 0 && !hasSelectedCategory && (
        <p className="text-sm text-muted-foreground text-center">
          {currentCategories.some(isLeafCategory) 
            ? t('categories.some_are_final', 'Categorias com ✓ podem ser selecionadas')
            : t('categories.select_to_continue', 'Selecione uma categoria para continuar')
          }
        </p>
      )}
    </div>
  );
}