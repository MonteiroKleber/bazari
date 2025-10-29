import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SearchBarProps {
  /**
   * Current search value
   */
  value: string;

  /**
   * Change handler
   */
  onChange: (value: string) => void;

  /**
   * Search handler (triggered on Enter or search button click)
   */
  onSearch?: () => void;

  /**
   * Placeholder text
   * @default 'Buscar propostas...'
   */
  placeholder?: string;

  /**
   * Show search suggestions
   * @default false
   */
  showSuggestions?: boolean;

  /**
   * Suggestion list (if showSuggestions is true)
   */
  suggestions?: string[];

  /**
   * Callback when suggestion is selected
   */
  onSuggestionSelect?: (suggestion: string) => void;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounceDelay?: number;
}

/**
 * FASE 8 - PROMPT 7: Search Bar Component
 *
 * Features:
 * - Full-text search with debouncing
 * - Search suggestions (optional)
 * - Clear button
 * - Keyboard shortcuts (Enter to search, Escape to clear)
 * - Accessible
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 *
 * <SearchBar
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   onSearch={() => console.log('Searching:', searchQuery)}
 *   showSuggestions={true}
 *   suggestions={['Proposta #1', 'Proposta #2']}
 *   onSuggestionSelect={(s) => setSearchQuery(s)}
 * />
 * ```
 */
export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Buscar propostas...',
  showSuggestions = false,
  suggestions = [],
  onSuggestionSelect,
  className,
}: SearchBarProps) {
  const [showSuggestionList, setShowSuggestionList] = useState(false);

  /**
   * Handle search action
   */
  const handleSearch = useCallback(() => {
    onSearch?.();
    setShowSuggestionList(false);
  }, [onSearch]);

  /**
   * Handle clear
   */
  const handleClear = useCallback(() => {
    onChange('');
    setShowSuggestionList(false);
  }, [onChange]);

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    onChange(suggestion);
    onSuggestionSelect?.(suggestion);
    setShowSuggestionList(false);
    handleSearch();
  }, [onChange, onSuggestionSelect, handleSearch]);

  /**
   * Handle key down
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleSearch, handleClear]);

  /**
   * Handle input change
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Show suggestions if enabled and there's a value
    if (showSuggestions && newValue.length >= 2) {
      setShowSuggestionList(true);
    } else {
      setShowSuggestionList(false);
    }
  }, [onChange, showSuggestions]);

  /**
   * Handle focus
   */
  const handleFocus = useCallback(() => {
    if (showSuggestions && value.length >= 2) {
      setShowSuggestionList(true);
    }
  }, [showSuggestions, value]);

  /**
   * Handle blur (with delay to allow clicking suggestions)
   */
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setShowSuggestionList(false);
    }, 200);
  }, []);

  const filteredSuggestions = showSuggestions
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
    : [];

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="pl-10 pr-10"
          aria-label="Buscar propostas"
        />

        {/* Clear Button */}
        <AnimatePresence>
          {value && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClear}
                type="button"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestionList && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <Card>
              <CardContent className="p-2 max-h-[300px] overflow-y-auto">
                <div className="space-y-1">
                  {filteredSuggestions.slice(0, 10).map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      className="w-full justify-start text-sm font-normal hover:bg-accent"
                      onClick={() => handleSuggestionSelect(suggestion)}
                      type="button"
                    >
                      <Search className="h-3 w-3 mr-2 text-muted-foreground" />
                      {/* Highlight matching text */}
                      <span dangerouslySetInnerHTML={{
                        __html: suggestion.replace(
                          new RegExp(`(${value})`, 'gi'),
                          '<mark class="bg-primary/20 text-foreground">$1</mark>'
                        )
                      }} />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
