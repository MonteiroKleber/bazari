# Feature: Compartilhar Perfil

## Objetivo

Adicionar botao para compartilhar link do perfil usando Web Share API (mobile) ou copiar para clipboard (desktop/fallback).

## Requisitos Funcionais

### Comportamento
- Botao sempre visivel no header do perfil
- Click:
  - Mobile (Web Share API suportada): Abre sheet nativo de compartilhamento
  - Desktop/Fallback: Copia URL para clipboard e mostra toast

### Conteudo Compartilhado
- Titulo: "{displayName} no Bazari"
- Texto: "Confira o perfil de @{handle} no Bazari"
- URL: URL atual da pagina (`/u/:handle`)

### Visual
- Icone: Share2 (lucide-react)
- Posicao: No header, ao lado do botao Editar (proprio perfil) ou apos Seguir/Mensagem (outros)

## Implementacao

### 1. Criar Componente ShareButton

```typescript
// apps/web/src/components/ui/ShareButton.tsx

import { Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
}

export function ShareButton({ title, text, url, variant = 'outline', size = 'sm' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const canShare = typeof navigator !== 'undefined' && navigator.share;

  async function handleShare() {
    if (canShare) {
      try {
        await navigator.share({ title, text, url });
      } catch (e) {
        // Usuario cancelou - ignorar
        if ((e as Error).name !== 'AbortError') {
          console.error('Share failed:', e);
        }
      }
    } else {
      // Fallback: copiar para clipboard
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Link copiado!');
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        toast.error('Erro ao copiar link');
      }
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleShare}>
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {size !== 'icon' && (
        <span className="hidden sm:inline ml-2">
          {copied ? 'Copiado!' : 'Compartilhar'}
        </span>
      )}
    </Button>
  );
}
```

### 2. Integrar em ProfilePublicPage

```typescript
// apps/web/src/pages/ProfilePublicPage.tsx

import { ShareButton } from '@/components/ui/ShareButton';

// No JSX do header:
<div className="py-2 md:py-3 flex items-center justify-between">
  <Button variant="ghost" size="sm" asChild>
    <Link to="/app/feed" className="flex items-center gap-2">
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Voltar ao Feed</span>
      <span className="sm:hidden">Feed</span>
    </Link>
  </Button>

  <div className="flex items-center gap-2">
    {/* Share Button - sempre visivel */}
    <ShareButton
      title={`${p.displayName} no Bazari`}
      text={`Confira o perfil de @${p.handle} no Bazari`}
      url={window.location.href}
      variant="ghost"
      size="icon"
    />

    {/* Edit Button - apenas proprio perfil */}
    {isOwnProfile && (
      <Button variant="outline" size="sm" asChild>
        <Link to="/app/profile/edit" className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Editar Perfil</span>
          <span className="sm:hidden">Editar</span>
        </Link>
      </Button>
    )}
  </div>
</div>
```

### 3. Variante com Dropdown (Opcional)

Para mais opcoes de compartilhamento:

```typescript
// apps/web/src/components/ui/ShareDropdown.tsx

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Share2, Copy, Twitter, Facebook, Linkedin, QrCode } from 'lucide-react';

interface ShareDropdownProps {
  url: string;
  title: string;
}

export function ShareDropdown({ url, title }: ShareDropdownProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => copyToClipboard(url)}>
          <Copy className="h-4 w-4 mr-2" />
          Copiar link
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Twitter className="h-4 w-4 mr-2" />
            Twitter
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Facebook className="h-4 w-4 mr-2" />
            Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Linkedin className="h-4 w-4 mr-2" />
            LinkedIn
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/ui/ShareButton.tsx`
- `apps/web/src/components/ui/ShareDropdown.tsx` (opcional)

### Modificar
- `apps/web/src/pages/ProfilePublicPage.tsx` - Adicionar botao

## Testes

- [ ] Web Share API funciona em mobile
- [ ] Fallback copia para clipboard em desktop
- [ ] Toast de sucesso aparece
- [ ] Icone muda para check apos copiar
- [ ] Link compartilhado esta correto
- [ ] Funciona em dark mode
