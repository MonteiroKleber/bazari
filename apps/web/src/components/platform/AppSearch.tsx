import { useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AppSearch({
  value,
  onChange,
  placeholder = 'Buscar apps...',
  className,
}: AppSearchProps) {
  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
