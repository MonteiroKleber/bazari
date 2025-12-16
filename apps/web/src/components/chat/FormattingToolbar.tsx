import { Bold, Italic, Code, Strikethrough, Link } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../ui/tooltip';

interface FormattingToolbarProps {
  onFormat: (type: FormatType, url?: string) => void;
  className?: string;
  compact?: boolean;
}

export type FormatType = 'bold' | 'italic' | 'code' | 'strikethrough' | 'link';

/**
 * Barra de ferramentas de formatação para o composer.
 */
export function FormattingToolbar({ onFormat, className, compact = false }: FormattingToolbarProps) {
  const formatButtons: Array<{
    type: FormatType;
    icon: React.ElementType;
    label: string;
    shortcut: string;
  }> = [
    { type: 'bold', icon: Bold, label: 'Negrito', shortcut: 'Ctrl+B' },
    { type: 'italic', icon: Italic, label: 'Itálico', shortcut: 'Ctrl+I' },
    { type: 'code', icon: Code, label: 'Código', shortcut: 'Ctrl+E' },
    { type: 'strikethrough', icon: Strikethrough, label: 'Riscado', shortcut: 'Ctrl+Shift+X' },
  ];

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {formatButtons.map(({ type, icon: Icon, label, shortcut }) => (
        <Tooltip key={type}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={compact ? 'sm' : 'icon'}
              className={cn(
                'text-muted-foreground hover:text-foreground',
                compact && 'h-7 w-7 p-0'
              )}
              onMouseDown={(e) => {
                e.preventDefault(); // Previne perda de foco do textarea
                onFormat(type);
              }}
              type="button"
            >
              <Icon className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{label} <span className="text-muted-foreground">({shortcut})</span></p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/**
 * Aplica formatação ao texto selecionado.
 * Retorna o novo texto e posição do cursor.
 */
export function applyFormatting(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  type: FormatType
): { newText: string; newCursorStart: number; newCursorEnd: number } {
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);

  let wrapper: { start: string; end: string };

  switch (type) {
    case 'bold':
      wrapper = { start: '**', end: '**' };
      break;
    case 'italic':
      wrapper = { start: '*', end: '*' };
      break;
    case 'code':
      wrapper = { start: '`', end: '`' };
      break;
    case 'strikethrough':
      wrapper = { start: '~~', end: '~~' };
      break;
    case 'link':
      // Para links, se não houver seleção, inserir placeholder
      if (!selected) {
        const placeholder = '[texto](url)';
        return {
          newText: before + placeholder + after,
          newCursorStart: selectionStart + 1,
          newCursorEnd: selectionStart + 6, // seleciona "texto"
        };
      }
      // Se houver seleção, envolver como link
      wrapper = { start: '[', end: '](url)' };
      break;
    default:
      return { newText: text, newCursorStart: selectionStart, newCursorEnd: selectionEnd };
  }

  // Se não houver seleção, inserir marcadores e posicionar cursor no meio
  if (selectionStart === selectionEnd) {
    const newText = before + wrapper.start + wrapper.end + after;
    const cursorPos = selectionStart + wrapper.start.length;
    return {
      newText,
      newCursorStart: cursorPos,
      newCursorEnd: cursorPos,
    };
  }

  // Verificar se já está formatado (toggle)
  const isAlreadyFormatted =
    before.endsWith(wrapper.start) && after.startsWith(wrapper.end);

  if (isAlreadyFormatted) {
    // Remover formatação
    const newBefore = before.slice(0, -wrapper.start.length);
    const newAfter = after.slice(wrapper.end.length);
    const newText = newBefore + selected + newAfter;
    return {
      newText,
      newCursorStart: newBefore.length,
      newCursorEnd: newBefore.length + selected.length,
    };
  }

  // Aplicar formatação
  const newText = before + wrapper.start + selected + wrapper.end + after;
  return {
    newText,
    newCursorStart: selectionStart + wrapper.start.length,
    newCursorEnd: selectionEnd + wrapper.start.length,
  };
}

/**
 * Detecta atalhos de teclado para formatação.
 */
export function getFormattingShortcut(e: React.KeyboardEvent): FormatType | null {
  const isMod = e.ctrlKey || e.metaKey;

  if (!isMod) return null;

  switch (e.key.toLowerCase()) {
    case 'b':
      return 'bold';
    case 'i':
      return 'italic';
    case 'e':
      return 'code';
    case 'x':
      if (e.shiftKey) return 'strikethrough';
      return null;
    case 'k':
      return 'link';
    default:
      return null;
  }
}
