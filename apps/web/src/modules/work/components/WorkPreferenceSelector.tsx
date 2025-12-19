// path: apps/web/src/modules/work/components/WorkPreferenceSelector.tsx
// Seletor de preferência de trabalho

import { Button } from '@/components/ui/button';
import { Home, Building2, Shuffle } from 'lucide-react';
import type { WorkPreference } from '../api';

interface WorkPreferenceSelectorProps {
  value: WorkPreference;
  onChange: (preference: WorkPreference) => void;
  disabled?: boolean;
}

const preferences: Array<{
  value: WorkPreference;
  label: string;
  description: string;
  icon: typeof Home;
}> = [
  {
    value: 'REMOTE',
    label: 'Remoto',
    description: 'Trabalho 100% remoto',
    icon: Home,
  },
  {
    value: 'HYBRID',
    label: 'Híbrido',
    description: 'Remoto + presencial',
    icon: Shuffle,
  },
  {
    value: 'ON_SITE',
    label: 'Presencial',
    description: 'Trabalho no local',
    icon: Building2,
  },
];

export function WorkPreferenceSelector({
  value,
  onChange,
  disabled = false,
}: WorkPreferenceSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {preferences.map((pref) => {
        const Icon = pref.icon;
        const isSelected = value === pref.value;

        return (
          <Button
            key={pref.value}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            onClick={() => onChange(pref.value)}
            disabled={disabled}
            className={`h-auto py-4 flex flex-col items-center gap-2 ${
              isSelected ? '' : 'hover:bg-muted'
            }`}
          >
            <Icon className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">{pref.label}</div>
              <div className={`text-xs ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {pref.description}
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

export default WorkPreferenceSelector;
