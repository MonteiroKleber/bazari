import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WordChipSelectorProps {
  words: string[];
  targetIndex: number;
  onSelect: (word: string) => void;
  selectedWord?: string;
  disabledWords: string[];
  label: string;
}

export function WordChipSelector({
  words,
  targetIndex,
  onSelect,
  selectedWord,
  disabledWords,
  label,
}: WordChipSelectorProps) {
  const { t } = useTranslation();

  // Shuffle words once on mount
  const shuffledWords = useMemo(() => {
    return [...words].sort(() => Math.random() - 0.5);
  }, [words]);

  const handleClear = () => {
    if (selectedWord) {
      onSelect('');
    }
  };

  return (
    <div className="space-y-3">
      {/* Label and Selected Word Display */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {label}
        </label>
        {selectedWord && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-xs gap-1"
          >
            <X className="h-3 w-3" />
            {t('common.clear', { defaultValue: 'Limpar' })}
          </Button>
        )}
      </div>

      {/* Selected Word Display */}
      <div className={cn(
        'p-4 rounded-lg border-2 transition-all min-h-[56px] flex items-center justify-center',
        selectedWord
          ? 'border-green-500 bg-green-500/5'
          : 'border-dashed border-muted-foreground/30 bg-muted/20'
      )}>
        {selectedWord ? (
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span className="font-semibold text-lg uppercase">
              {selectedWord}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t('auth.create.verification.clickToSelect', { defaultValue: 'Clique em uma palavra abaixo' })}
          </span>
        )}
      </div>
    </div>
  );
}

interface WordChipsGridProps {
  words: string[];
  onWordClick: (word: string) => void;
  disabledWords: string[];
  selectedWords: Record<number, string>;
}

export function WordChipsGrid({ words, onWordClick, disabledWords, selectedWords }: WordChipsGridProps) {
  const { t } = useTranslation();

  // Shuffle words
  const shuffledWords = useMemo(() => {
    return [...words].sort(() => Math.random() - 0.5);
  }, [words]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-center">
        {t('auth.create.verification.selectBelow', { defaultValue: 'Selecione as palavras abaixo (na ordem):' })}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-4 bg-muted/30 rounded-lg border">
        {shuffledWords.map((word, index) => {
          const isDisabled = disabledWords.includes(word);
          const isSelected = Object.values(selectedWords).includes(word);

          return (
            <Button
              key={`${word}-${index}`}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              disabled={isDisabled}
              onClick={() => onWordClick(word)}
              className={cn(
                'relative h-11 text-sm font-semibold uppercase transition-all',
                isSelected && 'ring-2 ring-primary ring-offset-2',
                isDisabled && 'opacity-40 cursor-not-allowed',
                !isSelected && !isDisabled && 'hover:border-primary hover:bg-primary/10'
              )}
            >
              {word}
              {isSelected && (
                <Check className="absolute -top-1 -right-1 h-4 w-4 text-primary-foreground bg-primary rounded-full p-0.5" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
