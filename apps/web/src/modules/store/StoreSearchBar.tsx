import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface StoreSearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  debounceMs?: number;
}

export function StoreSearchBar({
  value = '',
  onChange,
  onDebouncedChange,
  onSubmit,
  debounceMs = 350
}: StoreSearchBarProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  useEffect(() => {
    if (!onDebouncedChange) return;
    const timer = setTimeout(() => {
      onDebouncedChange(current);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [current, debounceMs, onDebouncedChange]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.(current.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 text-store-ink lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-store-ink/60" />
        <Input
          value={current}
          onChange={(event) => {
            const next = event.target.value;
            setCurrent(next);
            onChange?.(next);
          }}
          placeholder={t('store.search.placeholder', { defaultValue: t('search.placeholder') }) as string}
          aria-label={t('store.search.placeholder', { defaultValue: t('search.placeholder') }) as string}
          className="border border-store-ink/20 bg-store-bg/90 text-store-ink placeholder:text-store-ink/50 pl-9"
        />
      </div>
      <Button type="submit" className="w-full bg-store-brand text-store-ink hover:bg-store-brand/90 lg:w-auto">
        {t('search.button')}
      </Button>
    </form>
  );
}

export default StoreSearchBar;
