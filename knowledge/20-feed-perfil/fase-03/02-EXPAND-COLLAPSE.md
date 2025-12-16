# Feature: Expand/Collapse Posts Longos

## Objetivo

Truncar posts longos (>280 caracteres) com botao "Ver mais" para expandir, evitando scroll excessivo no feed.

## Requisitos Funcionais

### Comportamento
- Posts <= 280 caracteres: Exibir completo
- Posts > 280 caracteres: Truncar e mostrar "Ver mais"
- Click em "Ver mais": Expandir para conteudo completo
- Click em "Ver menos": Recolher (opcional)
- Links e mencoes clicaveis mesmo truncados

### Visual
- Truncamento com ellipsis (...)
- Link "Ver mais" destacado (cor primaria)
- Transicao suave ao expandir (opcional)

## Implementacao

### 1. Componente ExpandableContent

```typescript
// apps/web/src/components/social/ExpandableContent.tsx

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ExpandableContentProps {
  content: string;
  maxLength?: number;
  className?: string;
}

export function ExpandableContent({
  content,
  maxLength = 280,
  className,
}: ExpandableContentProps) {
  const [expanded, setExpanded] = useState(false);

  const shouldTruncate = content.length > maxLength;
  const displayContent = expanded || !shouldTruncate
    ? content
    : content.slice(0, maxLength).trim() + '...';

  return (
    <div className={className}>
      <p className="whitespace-pre-wrap break-words">
        {displayContent}
      </p>

      {shouldTruncate && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Nao navegar para post
            setExpanded(!expanded);
          }}
          className="text-primary text-sm font-medium mt-1 hover:underline"
        >
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  );
}
```

### 2. Versao com Links Clicaveis

```typescript
// apps/web/src/components/social/ExpandableContent.tsx

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface ExpandableContentProps {
  content: string;
  maxLength?: number;
  className?: string;
}

// Regex para detectar URLs, mencoes e hashtags
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
const MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;
const HASHTAG_REGEX = /#([a-zA-Z0-9_]+)/g;

function parseContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  // Combinar todos os padroes
  const combinedRegex = new RegExp(
    `(${URL_REGEX.source})|(${MENTION_REGEX.source})|(${HASHTAG_REGEX.source})`,
    'gi'
  );

  let match;
  while ((match = combinedRegex.exec(text)) !== null) {
    // Adicionar texto antes do match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [fullMatch] = match;

    if (fullMatch.startsWith('http')) {
      // URL
      parts.push(
        <a
          key={key++}
          href={fullMatch}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch.length > 40 ? fullMatch.slice(0, 40) + '...' : fullMatch}
        </a>
      );
    } else if (fullMatch.startsWith('@')) {
      // Mencao
      const handle = fullMatch.slice(1);
      parts.push(
        <Link
          key={key++}
          to={`/u/${handle}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </Link>
      );
    } else if (fullMatch.startsWith('#')) {
      // Hashtag
      const tag = fullMatch.slice(1);
      parts.push(
        <Link
          key={key++}
          to={`/search?q=${encodeURIComponent(fullMatch)}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </Link>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Adicionar texto restante
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function ExpandableContent({
  content,
  maxLength = 280,
  className,
}: ExpandableContentProps) {
  const [expanded, setExpanded] = useState(false);

  const shouldTruncate = content.length > maxLength;

  const displayContent = useMemo(() => {
    const textToShow = expanded || !shouldTruncate
      ? content
      : content.slice(0, maxLength).trim() + '...';

    return parseContent(textToShow);
  }, [content, expanded, shouldTruncate, maxLength]);

  return (
    <div className={className}>
      <p className="whitespace-pre-wrap break-words">
        {displayContent}
      </p>

      {shouldTruncate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-primary text-sm font-medium mt-1 hover:underline"
        >
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  );
}
```

### 3. Integrar em PostCard

```typescript
// apps/web/src/components/social/PostCard.tsx

import { ExpandableContent } from './ExpandableContent';

export function PostCard({ post, ... }) {
  return (
    <Card ...>
      <CardContent>
        {/* ... header ... */}

        {/* Conteudo - substituir o p existente */}
        <div className="mb-3">
          <ExpandableContent content={post.content} />
        </div>

        {/* ... midia, acoes ... */}
      </CardContent>
    </Card>
  );
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/social/ExpandableContent.tsx`

### Modificar
- `apps/web/src/components/social/PostCard.tsx` - Usar ExpandableContent

## Consideracoes

### UX
- 280 caracteres e similar ao Twitter (bom ponto de corte)
- "Ver menos" e opcional mas recomendado
- Truncamento inteligente (nao cortar no meio de palavra)

### Acessibilidade
- Botao tem texto descritivo
- Estado expandido/colapsado claro

### Performance
- Parsing de links e leve
- Memoizar resultado do parse

## Testes

- [ ] Posts curtos exibidos completos
- [ ] Posts longos truncados com "..."
- [ ] "Ver mais" expande o conteudo
- [ ] "Ver menos" recolhe o conteudo
- [ ] Links clicaveis mesmo truncados
- [ ] Mencoes @usuario linkam para perfil
- [ ] Hashtags linkam para busca
- [ ] Click em "Ver mais" nao navega para post
