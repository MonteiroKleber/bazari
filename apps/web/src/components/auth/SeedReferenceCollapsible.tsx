import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, EyeOff, Lightbulb } from 'lucide-react';

interface SeedReferenceCollapsibleProps {
  mnemonic: string[];
}

export function SeedReferenceCollapsible({ mnemonic }: SeedReferenceCollapsibleProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">
          {t('auth.create.verification.needReference', { defaultValue: 'Precisa consultar?' })}
        </span>
      </div>

      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          {isOpen ? (
            <>
              <EyeOff className="h-4 w-4" />
              {t('auth.create.verification.hideWords', { defaultValue: 'Ocultar Minhas Palavras' })}
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              {t('auth.create.verification.showWords', { defaultValue: 'Mostrar Minhas Palavras' })}
            </>
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4">
        <div className="p-4 bg-muted/30 rounded-lg border">
          <p className="text-xs text-muted-foreground mb-3 text-center">
            {t('auth.create.verification.referenceHint', { defaultValue: 'Suas 12 palavras para referência:' })}
          </p>
          <ol className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {mnemonic.map((word, index) => (
              <li
                key={word + index}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <span className="text-muted-foreground font-medium">
                  {index + 1}.
                </span>
                <span className="font-semibold uppercase">
                  {word}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
