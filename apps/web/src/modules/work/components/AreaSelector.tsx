// path: apps/web/src/modules/work/components/AreaSelector.tsx
// Seletor de área profissional

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Code2,
  Palette,
  Megaphone,
  ShoppingCart,
  Headphones,
  Users,
  DollarSign,
  Scale,
  Building,
  PenTool,
  GraduationCap,
  Heart,
  Wrench,
  Landmark,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';

interface AreaSelectorProps {
  value: string | null;
  onChange: (area: string) => void;
  areas: string[];
  disabled?: boolean;
}

// Ícones por área
const areaIcons: Record<string, typeof Code2> = {
  'Desenvolvimento de Software': Code2,
  'Design': Palette,
  'Marketing': Megaphone,
  'Vendas': ShoppingCart,
  'Suporte ao Cliente': Headphones,
  'Recursos Humanos': Users,
  'Finanças': DollarSign,
  'Jurídico': Scale,
  'Administração': Building,
  'Produção de Conteúdo': PenTool,
  'Educação': GraduationCap,
  'Saúde': Heart,
  'Engenharia': Wrench,
  'Arquitetura': Landmark,
  'Consultoria': MessageSquare,
  'Outro': MoreHorizontal,
};

export function AreaSelector({
  value,
  onChange,
  areas,
  disabled = false,
}: AreaSelectorProps) {
  return (
    <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione sua área de atuação" />
      </SelectTrigger>
      <SelectContent>
        {areas.map((area) => {
          const Icon = areaIcons[area] || MoreHorizontal;
          return (
            <SelectItem key={area} value={area}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{area}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default AreaSelector;
