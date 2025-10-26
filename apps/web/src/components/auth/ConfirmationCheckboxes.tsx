import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ConfirmationCheckboxesProps {
  savedConfirmed: boolean;
  understoodConfirmed: boolean;
  onSavedChange: (checked: boolean) => void;
  onUnderstoodChange: (checked: boolean) => void;
}

export function ConfirmationCheckboxes({
  savedConfirmed,
  understoodConfirmed,
  onSavedChange,
  onUnderstoodChange,
}: ConfirmationCheckboxesProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-start gap-3">
        <Checkbox
          id="saved-confirm"
          checked={savedConfirmed}
          onCheckedChange={(checked) => onSavedChange(checked === true)}
          className="mt-0.5"
        />
        <Label
          htmlFor="saved-confirm"
          className="text-sm font-medium leading-relaxed cursor-pointer"
        >
          {t('auth.create.confirmation.saved', {
            defaultValue: 'Salvei minhas 12 palavras em local seguro (cofre, gerenciador de senhas, etc)'
          })}
        </Label>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="understood-confirm"
          checked={understoodConfirmed}
          onCheckedChange={(checked) => onUnderstoodChange(checked === true)}
          className="mt-0.5"
        />
        <Label
          htmlFor="understood-confirm"
          className="text-sm font-medium leading-relaxed cursor-pointer"
        >
          {t('auth.create.confirmation.understood', {
            defaultValue: 'Entendo que se eu perder essas palavras, perderei acesso PERMANENTE à minha conta'
          })}
        </Label>
      </div>
    </div>
  );
}
