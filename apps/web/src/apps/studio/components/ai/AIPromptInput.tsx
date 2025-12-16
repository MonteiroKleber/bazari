/**
 * AIPromptInput - Input for AI chat with suggestions
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIPromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

// Prompt suggestions
const SUGGESTIONS = [
  {
    label: 'Create component',
    prompt: 'Create a React component for ',
  },
  {
    label: 'Add feature',
    prompt: 'Add a feature to ',
  },
  {
    label: 'Fix error',
    prompt: 'I\'m getting this error: ',
  },
  {
    label: 'Explain code',
    prompt: 'Explain what this code does: ',
  },
  {
    label: 'Add SDK',
    prompt: 'How do I use the Bazari SDK to ',
  },
  {
    label: 'Optimize',
    prompt: 'How can I optimize ',
  },
];

export const AIPromptInput: React.FC<AIPromptInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Ask me anything about your code...',
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  const handleSuggestionClick = (suggestion: { label: string; prompt: string }) => {
    onChange(suggestion.prompt);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleClearInput = () => {
    onChange('');
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-border bg-card">
      {/* Suggestions */}
      {showSuggestions && !value && (
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Suggestions
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium',
                  'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground',
                  'transition-colors'
                )}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-3">
        <div className="relative flex items-end gap-2">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                'w-full resize-none rounded-lg border border-border bg-background',
                'px-4 py-3 pr-10 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                'placeholder:text-muted-foreground',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'min-h-[44px] max-h-[200px]'
              )}
            />

            {/* Clear button */}
            {value && (
              <button
                onClick={handleClearInput}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Send button */}
          <Button
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Helper text */}
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Enter</kbd> to send,{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Shift+Enter</kbd> for new line
          </span>
          {disabled && (
            <span className="text-xs text-primary animate-pulse">
              Thinking...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIPromptInput;
