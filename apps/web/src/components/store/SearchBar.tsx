import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Barra de busca textual para catálogo da loja
 * Debounce é gerenciado pelo hook useStoreFilters
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar produtos na loja...',
}: SearchBarProps) {
  const handleClear = () => {
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Esc limpa a busca
    if (e.key === 'Escape' && value) {
      e.preventDefault();
      handleClear();
    }
  };

  return (
    <div className="relative flex-1" role="search">
      {/* Ícone de busca */}
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-store-ink/50"
        aria-hidden="true"
      />

      {/* Input de busca */}
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Buscar produtos na loja"
        className="h-10 w-full border-store-ink/20 bg-store-bg/95 pl-10 pr-10 text-store-ink placeholder:text-store-ink/50 focus-visible:border-store-brand focus-visible:ring-store-brand/20"
      />

      {/* Botão para limpar (aparece apenas quando há texto) */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-store-ink/50 transition-colors hover:text-store-ink"
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
