import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface FormattedTextProps {
  text: string;
  className?: string;
  isOwn?: boolean; // Para ajustar cores de links
}

/**
 * Componente para renderizar texto com formatação Markdown básica.
 * Suporta: **bold**, *italic*, `code`, ~~strikethrough~~, links e quebras de linha.
 */
export function FormattedText({ text, className, isOwn = false }: FormattedTextProps) {
  const formattedContent = useMemo(() => {
    return parseMarkdown(text, isOwn);
  }, [text, isOwn]);

  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {formattedContent}
    </span>
  );
}

/**
 * Parseia texto Markdown e retorna elementos React.
 */
function parseMarkdown(text: string, isOwn: boolean): React.ReactNode[] {
  if (!text) return [];

  const result: React.ReactNode[] = [];
  let key = 0;

  // Regex para detectar padrões de formatação
  // Ordem importante: mais específicos primeiro
  const patterns = [
    // Code block (```...```)
    { regex: /```([\s\S]*?)```/g, type: 'codeblock' as const },
    // Inline code (`...`)
    { regex: /`([^`]+)`/g, type: 'code' as const },
    // Bold (**...**)
    { regex: /\*\*(.+?)\*\*/g, type: 'bold' as const },
    // Italic (*...*)
    { regex: /\*(.+?)\*/g, type: 'italic' as const },
    // Strikethrough (~~...~~)
    { regex: /~~(.+?)~~/g, type: 'strikethrough' as const },
    // URL (auto-link)
    { regex: /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g, type: 'link' as const },
    // Mention (@username)
    { regex: /@(\w+)/g, type: 'mention' as const },
  ];

  // Processar texto
  let lastIndex = 0;
  const segments: Array<{ start: number; end: number; type: string; content: string; fullMatch: string }> = [];

  // Encontrar todos os matches
  for (const { regex, type } of patterns) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Verificar se não sobrepõe com segmentos existentes
      const start = match.index;
      const end = match.index + match[0].length;

      const overlaps = segments.some(
        seg => (start >= seg.start && start < seg.end) || (end > seg.start && end <= seg.end)
      );

      if (!overlaps) {
        segments.push({
          start,
          end,
          type,
          content: match[1] || match[0],
          fullMatch: match[0],
        });
      }
    }
  }

  // Ordenar por posição
  segments.sort((a, b) => a.start - b.start);

  // Construir resultado
  for (const segment of segments) {
    // Adicionar texto antes do segmento
    if (segment.start > lastIndex) {
      result.push(text.slice(lastIndex, segment.start));
    }

    // Adicionar segmento formatado
    const elementKey = `fmt-${key++}`;

    switch (segment.type) {
      case 'codeblock':
        result.push(
          <pre
            key={elementKey}
            className="bg-black/20 rounded px-2 py-1 my-1 font-mono text-xs overflow-x-auto block"
          >
            {segment.content.trim()}
          </pre>
        );
        break;

      case 'code':
        result.push(
          <code
            key={elementKey}
            className="bg-black/20 rounded px-1 py-0.5 font-mono text-xs"
          >
            {segment.content}
          </code>
        );
        break;

      case 'bold':
        result.push(
          <strong key={elementKey} className="font-bold">
            {segment.content}
          </strong>
        );
        break;

      case 'italic':
        result.push(
          <em key={elementKey} className="italic">
            {segment.content}
          </em>
        );
        break;

      case 'strikethrough':
        result.push(
          <del key={elementKey} className="line-through opacity-70">
            {segment.content}
          </del>
        );
        break;

      case 'link':
        result.push(
          <a
            key={elementKey}
            href={segment.content}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'underline hover:opacity-80 transition-opacity',
              isOwn ? 'text-primary-foreground' : 'text-primary'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {truncateUrl(segment.content)}
          </a>
        );
        break;

      case 'mention':
        result.push(
          <span
            key={elementKey}
            className={cn(
              'font-medium',
              isOwn ? 'text-primary-foreground' : 'text-primary'
            )}
          >
            @{segment.content}
          </span>
        );
        break;
    }

    lastIndex = segment.end;
  }

  // Adicionar texto restante
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}

/**
 * Trunca URLs longas para exibição.
 */
function truncateUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url;

  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const path = urlObj.pathname;

    // Mostrar host + início do path
    const available = maxLength - host.length - 3; // 3 para "..."
    if (available > 5) {
      const truncatedPath = path.length > available
        ? path.slice(0, available) + '...'
        : path;
      return host + truncatedPath;
    }

    return host + '...';
  } catch {
    // Se não for URL válida, truncar simples
    return url.slice(0, maxLength - 3) + '...';
  }
}

/**
 * Verifica se o texto contém formatação Markdown.
 */
export function hasFormatting(text: string): boolean {
  const patterns = [
    /\*\*.+?\*\*/,      // bold
    /\*.+?\*/,          // italic
    /`.+?`/,            // code
    /~~.+?~~/,          // strikethrough
    /```[\s\S]+?```/,   // code block
    /https?:\/\/\S+/,   // links
  ];

  return patterns.some(pattern => pattern.test(text));
}
