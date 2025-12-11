/**
 * Branding Form Component
 *
 * Permite personalizar as cores do plugin
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface BrandingFormProps {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

const colorPresets = [
  '#FF6B00', // Laranja Bazari
  '#8B5CF6', // Roxo
  '#10B981', // Verde
  '#3B82F6', // Azul
  '#EF4444', // Vermelho
  '#F59E0B', // Amarelo
];

export function BrandingForm({ value, onChange }: BrandingFormProps) {
  const handleChange = (key: string, newValue: unknown) => {
    onChange({ ...value, [key]: newValue });
  };

  return (
    <div className="space-y-6">
      {/* Cor principal */}
      <div className="space-y-3">
        <Label>Cor principal</Label>
        <div className="flex gap-2 flex-wrap">
          {colorPresets.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handleChange('primaryColor', color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                value.primaryColor === color
                  ? 'border-foreground scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <div className="relative">
            <Input
              type="color"
              value={(value.primaryColor as string) || '#FF6B00'}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="w-8 h-8 p-0 border-0 cursor-pointer"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Esta cor sera usada nos elementos visuais do plugin
        </p>
      </div>

      {/* Cor secundaria */}
      <div className="space-y-2">
        <Label htmlFor="secondaryColor">Cor secundaria (opcional)</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="secondaryColor"
            type="color"
            value={(value.secondaryColor as string) || '#ffffff'}
            onChange={(e) => handleChange('secondaryColor', e.target.value)}
            className="w-12 h-10 p-1 cursor-pointer"
          />
          <span className="text-sm text-muted-foreground">
            {(value.secondaryColor as string) || '#ffffff'}
          </span>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <div
          className="p-4 rounded-lg text-white"
          style={{ backgroundColor: (value.primaryColor as string) || '#FF6B00' }}
        >
          <div className="font-semibold">Seu plugin ficara assim</div>
          <div className="text-sm opacity-90">Com as cores selecionadas</div>
        </div>
      </div>
    </div>
  );
}

export default BrandingForm;
