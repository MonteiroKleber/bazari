# Feature: Draft Auto-save no CreatePostModal

## Objetivo

Salvar automaticamente o rascunho do post em localStorage, prevenindo perda de conteudo se usuario fechar acidentalmente.

## Requisitos Funcionais

### Comportamento
- Auto-save a cada 3 segundos (debounced)
- Salvar: conteudo, tipo (texto/enquete), opcoes de enquete
- NAO salvar: imagens/videos (muito grande para localStorage)
- Ao abrir modal: Verificar se ha rascunho
- Se ha rascunho: Perguntar se quer recuperar
- Apos publicar: Limpar rascunho
- Ao cancelar: Perguntar se quer salvar rascunho

### Visual
- Indicador sutil "Rascunho salvo" (toast pequeno ou texto)
- Modal de confirmacao ao detectar rascunho
- Opcao "Descartar rascunho" / "Recuperar"

## Implementacao

### 1. Hook useDraftPost

```typescript
// apps/web/src/hooks/useDraftPost.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from '@/lib/utils';

interface PostDraft {
  content: string;
  kind: 'text' | 'poll';
  pollOptions?: string[];
  pollDuration?: string;
  savedAt: number;
}

const STORAGE_KEY = 'bazari:post-draft';
const DEBOUNCE_MS = 3000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

export function useDraftPost() {
  const [hasDraft, setHasDraft] = useState(false);
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Verificar rascunho ao montar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: PostDraft = JSON.parse(stored);

        // Verificar se nao expirou
        if (Date.now() - parsed.savedAt < MAX_AGE_MS && parsed.content.trim()) {
          setDraft(parsed);
          setHasDraft(true);
        } else {
          // Limpar rascunho expirado
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Funcao de save (debounced)
  const saveRef = useRef(
    debounce((data: Omit<PostDraft, 'savedAt'>) => {
      if (!data.content.trim()) {
        localStorage.removeItem(STORAGE_KEY);
        setHasDraft(false);
        return;
      }

      const draft: PostDraft = {
        ...data,
        savedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setLastSaved(new Date());
      setHasDraft(true);
    }, DEBOUNCE_MS)
  );

  const saveDraft = useCallback((data: Omit<PostDraft, 'savedAt'>) => {
    saveRef.current(data);
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDraft(null);
    setHasDraft(false);
    setLastSaved(null);
  }, []);

  const getDraft = useCallback((): PostDraft | null => {
    return draft;
  }, [draft]);

  return {
    hasDraft,
    draft,
    lastSaved,
    saveDraft,
    clearDraft,
    getDraft,
  };
}
```

### 2. Componente DraftRecoveryDialog

```typescript
// apps/web/src/components/social/DraftRecoveryDialog.tsx

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DraftRecoveryDialogProps {
  open: boolean;
  savedAt: number;
  preview: string;
  onRecover: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryDialog({
  open,
  savedAt,
  preview,
  onRecover,
  onDiscard,
}: DraftRecoveryDialogProps) {
  const timeAgo = formatDistanceToNow(savedAt, {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rascunho encontrado</AlertDialogTitle>
          <AlertDialogDescription>
            Voce tem um rascunho salvo {timeAgo}:
            <span className="block mt-2 p-2 bg-muted rounded text-sm line-clamp-3">
              "{preview.length > 100 ? preview.slice(0, 100) + '...' : preview}"
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>
            Descartar
          </AlertDialogCancel>
          <AlertDialogAction onClick={onRecover}>
            Recuperar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 3. Indicador de Salvamento

```typescript
// apps/web/src/components/social/DraftSaveIndicator.tsx

import { Check, Cloud } from 'lucide-react';

interface DraftSaveIndicatorProps {
  lastSaved: Date | null;
  saving?: boolean;
}

export function DraftSaveIndicator({ lastSaved, saving }: DraftSaveIndicatorProps) {
  if (!lastSaved && !saving) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {saving ? (
        <>
          <Cloud className="h-3 w-3 animate-pulse" />
          <span>Salvando...</span>
        </>
      ) : (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span>Rascunho salvo</span>
        </>
      )}
    </div>
  );
}
```

### 4. Integrar em CreatePostModal

```typescript
// apps/web/src/components/social/CreatePostModal.tsx

import { useDraftPost } from '@/hooks/useDraftPost';
import { DraftRecoveryDialog } from './DraftRecoveryDialog';
import { DraftSaveIndicator } from './DraftSaveIndicator';

export function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  const { hasDraft, draft, lastSaved, saveDraft, clearDraft, getDraft } = useDraftPost();
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [draftChecked, setDraftChecked] = useState(false);

  // Verificar rascunho ao abrir
  useEffect(() => {
    if (open && hasDraft && !draftChecked) {
      setShowRecoveryDialog(true);
    }
  }, [open, hasDraft, draftChecked]);

  // Auto-save quando conteudo muda
  useEffect(() => {
    if (!open) return;

    saveDraft({
      content,
      kind: showPollForm ? 'poll' : 'text',
      pollOptions: showPollForm ? pollOptions : undefined,
      pollDuration: showPollForm ? pollDuration : undefined,
    });
  }, [content, showPollForm, pollOptions, pollDuration, saveDraft, open]);

  function handleRecover() {
    const draft = getDraft();
    if (draft) {
      setContent(draft.content);
      if (draft.kind === 'poll') {
        setShowPollForm(true);
        setPollOptions(draft.pollOptions || ['', '']);
        setPollDuration(draft.pollDuration || '1440');
      }
    }
    setShowRecoveryDialog(false);
    setDraftChecked(true);
  }

  function handleDiscard() {
    clearDraft();
    setShowRecoveryDialog(false);
    setDraftChecked(true);
  }

  // Limpar apos publicar
  async function handleSubmit() {
    // ... logica existente ...

    // Apos sucesso:
    clearDraft();
    setDraftChecked(false);
  }

  // Ao fechar
  function handleClose() {
    if (content.trim()) {
      // Salvar imediatamente antes de fechar
      saveDraft({
        content,
        kind: showPollForm ? 'poll' : 'text',
        pollOptions: showPollForm ? pollOptions : undefined,
        pollDuration: showPollForm ? pollDuration : undefined,
      });
    }
    setDraftChecked(false);
    onOpenChange(false);
  }

  return (
    <>
      <DraftRecoveryDialog
        open={showRecoveryDialog}
        savedAt={draft?.savedAt || 0}
        preview={draft?.content || ''}
        onRecover={handleRecover}
        onDiscard={handleDiscard}
      />

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Criar Post</DialogTitle>
              <DraftSaveIndicator lastSaved={lastSaved} />
            </div>
          </DialogHeader>

          {/* ... resto do modal ... */}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/hooks/useDraftPost.ts`
- `apps/web/src/components/social/DraftRecoveryDialog.tsx`
- `apps/web/src/components/social/DraftSaveIndicator.tsx`

### Modificar
- `apps/web/src/components/social/CreatePostModal.tsx`

## Consideracoes

### Limitacoes
- NAO salvar midia (muito grande)
- Expirar rascunhos apos 24h
- Apenas 1 rascunho por vez

### UX
- Save discreto (nao atrapalhar)
- Recuperacao opcional (usuario decide)
- Preview do rascunho no dialog

## Testes

- [ ] Rascunho salva automaticamente apos 3s
- [ ] Rascunho recuperado ao reabrir modal
- [ ] Dialog pergunta se quer recuperar
- [ ] "Descartar" limpa rascunho
- [ ] "Recuperar" restaura conteudo
- [ ] Enquete e opcoes restauradas
- [ ] Rascunho limpo apos publicar
- [ ] Indicador "Rascunho salvo" aparece
- [ ] Rascunhos > 24h sao descartados
