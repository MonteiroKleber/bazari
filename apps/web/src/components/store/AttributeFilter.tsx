import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface AttributeFilterProps {
  attributes: Record<string, Array<{ value: string; count: number }>>;
  selected: Record<string, string[]>;
  onChange: (attrKey: string, values: string[]) => void;
}

const MAX_VISIBLE = 8;

/**
 * Capitaliza a primeira letra de uma string
 */
function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Componente de filtro de atributos com seções expansíveis
 */
export function AttributeFilter({ attributes, selected, onChange }: AttributeFilterProps) {
  // Estado de expansão de cada seção de atributo
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Estado para "show more" de cada atributo
  const [showAllValues, setShowAllValues] = useState<Record<string, boolean>>({});

  // Obter lista de atributos ordenada
  const attributeKeys = Object.keys(attributes).sort();

  // Se não há atributos, não renderizar nada
  if (attributeKeys.length === 0) {
    return null;
  }

  const toggleSection = (attrKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [attrKey]: !prev[attrKey],
    }));
  };

  const toggleShowAll = (attrKey: string) => {
    setShowAllValues((prev) => ({
      ...prev,
      [attrKey]: !prev[attrKey],
    }));
  };

  const handleValueToggle = (attrKey: string, value: string) => {
    const currentValues = selected[attrKey] || [];
    const isSelected = currentValues.includes(value);

    if (isSelected) {
      // Remover valor
      const newValues = currentValues.filter((v) => v !== value);
      onChange(attrKey, newValues);
    } else {
      // Adicionar valor
      onChange(attrKey, [...currentValues, value]);
    }
  };

  return (
    <div className="space-y-4">
      {attributeKeys.map((attrKey) => {
        const values = attributes[attrKey] || [];
        const selectedValues = selected[attrKey] || [];
        const isExpanded = expandedSections[attrKey] ?? true; // Expandido por padrão
        const showAll = showAllValues[attrKey] ?? false;
        const visibleValues = showAll ? values : values.slice(0, MAX_VISIBLE);
        const hasMore = values.length > MAX_VISIBLE;

        return (
          <Collapsible
            key={attrKey}
            open={isExpanded}
            onOpenChange={() => toggleSection(attrKey)}
          >
            {/* Cabeçalho da seção */}
            <CollapsibleTrigger asChild>
              <button
                className="flex w-full items-center justify-between text-sm font-medium text-store-ink hover:text-store-brand"
                aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} filtros de ${capitalize(attrKey)}`}
              >
                <span>{capitalize(attrKey)}</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </CollapsibleTrigger>

            {/* Conteúdo da seção */}
            <CollapsibleContent className="mt-3 space-y-2">
              {visibleValues.map((item) => {
                const isChecked = selectedValues.includes(item.value);
                const id = `attr-${attrKey}-${item.value}`;

                return (
                  <div key={item.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={id}
                      checked={isChecked}
                      onCheckedChange={() => handleValueToggle(attrKey, item.value)}
                      className="border-store-ink/30 data-[state=checked]:border-store-brand data-[state=checked]:bg-store-brand"
                    />
                    <Label
                      htmlFor={id}
                      className="flex-1 cursor-pointer text-sm text-store-ink hover:text-store-brand"
                    >
                      {item.value}{' '}
                      <span className="text-store-ink/50">({item.count})</span>
                    </Label>
                  </div>
                );
              })}

              {/* Botão "Ver mais" / "Ver menos" */}
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleShowAll(attrKey);
                  }}
                  className="mt-2 h-auto p-0 text-xs text-store-brand hover:bg-transparent hover:underline"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="mr-1 h-3 w-3" />
                      Ver menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-3 w-3" />
                      Ver mais ({values.length - MAX_VISIBLE})
                    </>
                  )}
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
