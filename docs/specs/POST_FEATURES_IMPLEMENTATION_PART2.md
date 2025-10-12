# Especificação Técnica: Funcionalidades de Postagens - Parte 2

**Versão**: 1.0.0
**Data**: 2025-01-09
**Status**: Pendente de Implementação
**Dependências**: POST_FEATURES_IMPLEMENTATION.md (Parte 1)

---

## 📋 Sumário

Este documento complementa a Parte 1, especificando funcionalidades de **média e baixa prioridade**:

### Média Prioridade (Prompts 6-7):
- Reportar/Denunciar Post
- Fixar Post (Pin) no Perfil

### Baixa Prioridade (Prompts 8-10):
- Enquetes/Polls
- Suporte a Vídeos
- Reações Múltiplas (além de Like)

---

# PROMPT 6: Reportar/Denunciar Post

**Prioridade**: Média
**Complexidade**: Média
**Tempo estimado**: 45-60 min

## 📋 Contexto

O botão "Reportar" foi preparado no Prompt 2, mas apenas abre um dialog vazio. Precisamos implementar o formulário completo de denúncia.

## 🎯 Objetivo

Permitir que usuários reportem posts com conteúdo inapropriado, spam, ou que violem as regras da comunidade.

## 📦 Requisitos

### Backend (assumir que existe ou criar mock)

**Endpoint**: `POST /posts/:postId/report`
```typescript
// Request
POST /posts/{postId}/report
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "spam", // spam | harassment | inappropriate | misleading | other
  "details": "Descrição adicional (opcional)"
}

// Response 200
{
  "report": {
    "id": "report_123",
    "postId": "post_456",
    "reporterId": "user_789",
    "reason": "spam",
    "details": "Descrição...",
    "status": "pending",
    "createdAt": "2025-01-09T10:00:00Z"
  }
}
```

### Frontend

#### 1. Adicionar API Helper

**Arquivo**: `apps/web/src/lib/api.ts`

```typescript
// Moderação
reportPost: (postId: string, data: { reason: string; details?: string }) =>
  postJSON(`/posts/${postId}/report`, data),
```

#### 2. Criar Componente ReportPostDialog

**Arquivo**: `apps/web/src/components/social/ReportPostDialog.tsx` (NOVO)

```typescript
// apps/web/src/components/social/ReportPostDialog.tsx

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';

interface ReportPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam ou propaganda não solicitada' },
  { value: 'harassment', label: 'Assédio ou bullying' },
  { value: 'inappropriate', label: 'Conteúdo inapropriado ou ofensivo' },
  { value: 'misleading', label: 'Informação falsa ou enganosa' },
  { value: 'copyright', label: 'Violação de direitos autorais' },
  { value: 'other', label: 'Outro motivo' },
];

export function ReportPostDialog({ open, onOpenChange, postId }: ReportPostDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Selecione um motivo');
      return;
    }

    setSubmitting(true);
    try {
      await apiHelpers.reportPost(postId, {
        reason,
        details: details.trim() || undefined,
      });

      toast.success('Post reportado com sucesso. Obrigado pelo feedback!');
      onOpenChange(false);

      // Reset form
      setReason('');
      setDetails('');
    } catch (error: any) {
      console.error('Error reporting post:', error);
      toast.error(error?.message || 'Erro ao reportar post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reportar Post</DialogTitle>
          <DialogDescription>
            Por que você está reportando este post? Sua denúncia será revisada pela equipe de moderação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Motivo do report</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Detalhes adicionais (opcional)</Label>
            <Textarea
              id="details"
              placeholder="Forneça mais informações sobre o problema..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {details.length}/500 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? 'Enviando...' : 'Enviar Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. Atualizar PostOptionsMenu

**Arquivo**: `apps/web/src/components/social/PostOptionsMenu.tsx`

**Passo 1**: Substituir import do Dialog genérico
```typescript
import { ReportPostDialog } from './ReportPostDialog';
```

**Passo 2**: Atualizar estado
```typescript
// Remover: const [reportDialogOpen, setReportDialogOpen] = useState(false);
// Já existe, só usar
```

**Passo 3**: Substituir Dialog de Report (remover dialog antigo, usar componente novo)

**REMOVER**:
```typescript
{/* Dialog de Report */}
<Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Reportar post</DialogTitle>
      <DialogDescription>
        Por que você está reportando este post?
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      <p className="text-sm text-muted-foreground">
        Este post será revisado pela equipe de moderação.
      </p>
      {/* TODO: Adicionar formulário de motivos no Prompt 5 */}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setReportDialogOpen(false)}
      >
        Cancelar
      </Button>
      <Button onClick={handleSubmitReport}>
        Enviar report
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**ADICIONAR**:
```typescript
{/* Dialog de Report */}
<ReportPostDialog
  open={reportDialogOpen}
  onOpenChange={setReportDialogOpen}
  postId={postId}
/>
```

**Passo 4**: Remover função `handleSubmitReport` (não é mais necessária)

## ✅ Checklist de Validação

- [ ] API helper `reportPost` adicionado
- [ ] Componente `ReportPostDialog.tsx` criado
- [ ] `PostOptionsMenu` atualizado para usar novo dialog
- [ ] Testar: clicar em "Reportar" abre dialog
- [ ] Testar: todos os motivos podem ser selecionados
- [ ] Testar: campo de detalhes aceita texto
- [ ] Testar: botão "Enviar" só habilita se motivo selecionado
- [ ] Testar: toast de sucesso aparece
- [ ] Testar: dialog fecha após envio

## 🚫 NÃO FAZER

- ❌ NÃO mostrar posts reportados diferentes (backend decide)
- ❌ NÃO implementar painel de moderação (fora do escopo)

---

# PROMPT 7: Fixar Post no Perfil (Pin)

**Prioridade**: Média
**Complexidade**: Média-Alta
**Tempo estimado**: 60-90 min

## 📋 Contexto

Usuários querem destacar posts importantes no topo do seu perfil.

## 🎯 Objetivo

Permitir que o autor fixe um post no topo do seu perfil público.

## 📦 Requisitos

### Backend (assumir que existe ou criar mock)

**Endpoints**:
```typescript
// Fixar post
POST /posts/{postId}/pin
// Response: { "pinned": true, "pinnedAt": "2025-01-09T10:00:00Z" }

// Desfixar post
DELETE /posts/{postId}/pin
// Response: { "pinned": false }

// Perfil público retorna post fixado
GET /profiles/{handle}
// Response:
{
  "profile": { /* ... */ },
  "pinnedPost": {
    "id": "post_123",
    "content": "Post fixado",
    // ... outros campos
  }
}
```

### Frontend

#### 1. Adicionar API Helpers

**Arquivo**: `apps/web/src/lib/api.ts`

```typescript
// Pin post
pinPost: (postId: string) => postJSON(`/posts/${postId}/pin`, {}),
unpinPost: (postId: string) => deleteJSON(`/posts/${postId}/pin`),
```

#### 2. Adicionar Opção no Menu

**Arquivo**: `apps/web/src/components/social/PostOptionsMenu.tsx`

**Passo 1**: Adicionar import
```typescript
import { Pin, PinOff } from 'lucide-react';
```

**Passo 2**: Adicionar props
```typescript
interface PostOptionsMenuProps {
  postId: string;
  authorHandle: string;
  currentUserHandle?: string;
  onDeleted?: () => void;
  post?: {
    id: string;
    content: string;
    media?: Array<{ url: string; type: string }>;
    isPinned?: boolean; // ADICIONAR
  };
  onUpdated?: (updatedPost: any) => void;
  onPinned?: (pinned: boolean) => void; // ADICIONAR
}
```

**Passo 3**: Adicionar handler
```typescript
const handleTogglePin = async () => {
  const isPinned = post?.isPinned || false;

  try {
    if (isPinned) {
      await apiHelpers.unpinPost(postId);
      toast.success('Post desfixado');
    } else {
      await apiHelpers.pinPost(postId);
      toast.success('Post fixado no perfil');
    }

    onPinned?.(!isPinned);
  } catch (error: any) {
    console.error('Error toggling pin:', error);
    toast.error(error?.message || 'Erro ao fixar post');
  }
};
```

**Passo 4**: Adicionar item no menu (após "Editar", antes de "Deletar")
```typescript
{isAuthor && (
  <>
    <DropdownMenuSeparator />
    {/* Opções do autor */}
    <DropdownMenuItem onClick={handleEdit}>
      <Edit className="mr-2 h-4 w-4" />
      Editar post
    </DropdownMenuItem>

    {/* ADICIONAR ESTE ITEM */}
    <DropdownMenuItem onClick={handleTogglePin}>
      {post?.isPinned ? (
        <>
          <PinOff className="mr-2 h-4 w-4" />
          Desfixar do perfil
        </>
      ) : (
        <>
          <Pin className="mr-2 h-4 w-4" />
          Fixar no perfil
        </>
      )}
    </DropdownMenuItem>

    <DropdownMenuItem
      onClick={() => setDeleteDialogOpen(true)}
      className="text-destructive focus:text-destructive"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Deletar post
    </DropdownMenuItem>
  </>
)}
```

#### 3. Adicionar Badge Visual de Post Fixado

**Arquivo**: `apps/web/src/components/social/PostCard.tsx`

**Passo 1**: Adicionar import
```typescript
import { Pin } from 'lucide-react';
```

**Passo 2**: Adicionar prop
```typescript
interface PostCardProps {
  post: {
    // ... props existentes
    isPinned?: boolean; // ADICIONAR
  };
  // ...
}
```

**Passo 3**: Adicionar badge antes do content (após header, linha ~94)

**Inserir ANTES do `{/* Content */}`**:
```typescript
{/* Pinned Badge */}
{post.isPinned && (
  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
    <Pin className="h-4 w-4 fill-current" />
    <span>Post fixado</span>
  </div>
)}

{/* Content */}
<div className="mb-3">
  <p className="whitespace-pre-wrap break-words">
    {post.content}
  </p>
</div>
```

#### 4. Exibir Post Fixado no Perfil

**Arquivo**: `apps/web/src/pages/ProfilePublicPage.tsx`

**Passo 1**: Adicionar estado para post fixado
```typescript
const [pinnedPost, setPinnedPost] = useState<any | null>(null);
```

**Passo 2**: Atualizar carregamento do perfil (linha ~60)
```typescript
useEffect(() => {
  let active = true;
  setLoading(true);
  setError(null);
  (async () => {
    try {
      const res = await apiHelpers.getPublicProfile(handle);
      if (!active) return;
      setData(res);
      setPinnedPost(res.pinnedPost || null); // ADICIONAR
      setPosts([]);
      setNextCursor(null);
      setIsFollowing(false);
    } catch (e: any) {
      if (!active) return;
      setError(e?.message ?? 'Erro ao carregar perfil');
    } finally {
      if (active) setLoading(false);
    }
  })();
  return () => { active = false; };
}, [handle]);
```

**Passo 3**: Exibir post fixado na aba "posts" (linha ~224, antes do map de posts)

```typescript
{tab === 'posts' && (
  <div className="space-y-3">
    {/* Post Fixado */}
    {pinnedPost && (
      <PostCard
        key={`pinned-${pinnedPost.id}`}
        post={{
          id: pinnedPost.id,
          author: {
            handle: data?.profile.handle || handle,
            displayName: data?.profile.displayName || handle,
            avatarUrl: data?.profile.avatarUrl,
          },
          content: pinnedPost.content,
          media: pinnedPost.media,
          createdAt: pinnedPost.createdAt,
          likesCount: pinnedPost.likesCount,
          commentsCount: pinnedPost.commentsCount,
          repostsCount: pinnedPost.repostsCount,
          isPinned: true, // Sempre true para o post fixado
        }}
        currentUserHandle={currentUser?.handle}
        onPinned={(pinned) => {
          if (!pinned) setPinnedPost(null); // Remove se desfixado
        }}
      />
    )}

    {/* Posts normais */}
    {posts.map((post) => (
      <PostCard
        key={post.id}
        post={{
          id: post.id,
          author: {
            handle: data?.profile.handle || handle,
            displayName: data?.profile.displayName || handle,
            avatarUrl: data?.profile.avatarUrl,
          },
          content: post.content,
          media: post.media,
          createdAt: post.createdAt,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          repostsCount: post.repostsCount,
        }}
        currentUserHandle={currentUser?.handle}
        onPinned={(pinned) => {
          if (pinned) {
            // Se fixou outro post, buscar post fixado atualizado
            // (simplificação: recarregar perfil)
            window.location.reload();
          }
        }}
      />
    ))}

    {/* Botão "Ver mais" */}
    {nextCursor ? (
      <Button variant="outline" onClick={loadMore}>{t('profile.seeMore')}</Button>
    ) : posts.length === 0 && !pinnedPost ? (
      <div className="text-muted-foreground">{t('profile.noPosts')}</div>
    ) : null}
  </div>
)}
```

#### 5. Limitar a 1 Post Fixado

**Observação**: O backend deve garantir que apenas 1 post pode estar fixado por vez. Quando o usuário fixa um novo post, o anterior é automaticamente desfixado.

**No frontend, apenas confiar no backend** - quando `pinPost` é chamado, o backend retorna o novo estado.

## ✅ Checklist de Validação

- [ ] API helpers `pinPost` e `unpinPost` adicionados
- [ ] Opção "Fixar/Desfixar" adicionada no menu (apenas para autor)
- [ ] Badge visual "Post fixado" aparece no card
- [ ] Post fixado aparece no topo da aba "posts" do perfil
- [ ] Testar: fixar post move ele para topo
- [ ] Testar: desfixar post remove do topo
- [ ] Testar: apenas 1 post pode estar fixado
- [ ] Testar: fixar novo post desfixa o anterior
- [ ] Testar: post fixado não aparece duplicado na lista

## 🚫 NÃO FAZER

- ❌ NÃO permitir fixar posts de outros usuários
- ❌ NÃO permitir fixar múltiplos posts (apenas 1)

---

# PROMPT 8: Enquetes/Polls

**Prioridade**: Baixa
**Complexidade**: Alta
**Tempo estimado**: 90-120 min

## 📋 Contexto

Usuários querem criar posts com enquetes para coletar opiniões da comunidade.

## 🎯 Objetivo

Implementar sistema de enquetes (polls) em posts.

## 📦 Requisitos

### Backend (assumir que existe ou criar mock)

**Criar Enquete**:
```typescript
POST /posts
{
  "kind": "poll",
  "content": "Qual sua cor favorita?",
  "poll": {
    "options": ["Azul", "Verde", "Vermelho", "Amarelo"],
    "duration": 86400, // segundos (24h)
    "allowMultiple": false
  }
}
```

**Votar**:
```typescript
POST /posts/{postId}/poll/vote
{
  "optionIndex": 0 // ou [0, 2] se allowMultiple
}
```

**Estrutura do Post com Poll**:
```typescript
{
  "id": "post_123",
  "kind": "poll",
  "content": "Qual sua cor favorita?",
  "poll": {
    "options": [
      { "index": 0, "text": "Azul", "votes": 42 },
      { "index": 1, "text": "Verde", "votes": 35 },
      { "index": 2, "text": "Vermelho", "votes": 28 },
      { "index": 3, "text": "Amarelo", "votes": 15 }
    ],
    "totalVotes": 120,
    "endsAt": "2025-01-10T10:00:00Z",
    "hasVoted": true,
    "userVote": [0], // Índices das opções votadas
    "allowMultiple": false
  }
}
```

### Frontend

#### 1. Adicionar API Helpers

**Arquivo**: `apps/web/src/lib/api.ts`

```typescript
// Polls
votePoll: (postId: string, data: { optionIndex: number | number[] }) =>
  postJSON(`/posts/${postId}/poll/vote`, data),
```

#### 2. Criar Componente PollCard

**Arquivo**: `apps/web/src/components/social/PollCard.tsx` (NOVO)

```typescript
// apps/web/src/components/social/PollCard.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PollOption {
  index: number;
  text: string;
  votes: number;
}

interface PollCardProps {
  postId: string;
  poll: {
    options: PollOption[];
    totalVotes: number;
    endsAt: string;
    hasVoted: boolean;
    userVote?: number[];
    allowMultiple: boolean;
  };
}

export function PollCard({ postId, poll: initialPoll }: PollCardProps) {
  const [poll, setPoll] = useState(initialPoll);
  const [selectedOptions, setSelectedOptions] = useState<number[]>(poll.userVote || []);
  const [voting, setVoting] = useState(false);

  const isExpired = new Date(poll.endsAt) < new Date();
  const canVote = !poll.hasVoted && !isExpired;

  const timeRemaining = isExpired
    ? 'Encerrada'
    : formatDistanceToNow(new Date(poll.endsAt), {
        addSuffix: true,
        locale: ptBR,
      });

  const handleVote = async () => {
    if (selectedOptions.length === 0) {
      toast.error('Selecione uma opção');
      return;
    }

    setVoting(true);
    try {
      const response: any = await apiHelpers.votePoll(postId, {
        optionIndex: poll.allowMultiple ? selectedOptions : selectedOptions[0],
      });

      setPoll(response.poll);
      toast.success('Voto registrado!');
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error(error?.message || 'Erro ao votar');
    } finally {
      setVoting(false);
    }
  };

  const handleOptionChange = (optionIndex: number) => {
    if (poll.allowMultiple) {
      // Checkbox
      if (selectedOptions.includes(optionIndex)) {
        setSelectedOptions(selectedOptions.filter((i) => i !== optionIndex));
      } else {
        setSelectedOptions([...selectedOptions, optionIndex]);
      }
    } else {
      // Radio
      setSelectedOptions([optionIndex]);
    }
  };

  return (
    <div className="space-y-3">
      {canVote ? (
        <>
          {/* Votação ativa */}
          {poll.allowMultiple ? (
            <div className="space-y-2">
              {poll.options.map((option) => (
                <div key={option.index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`option-${option.index}`}
                    checked={selectedOptions.includes(option.index)}
                    onCheckedChange={() => handleOptionChange(option.index)}
                  />
                  <Label
                    htmlFor={`option-${option.index}`}
                    className="flex-1 cursor-pointer"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <RadioGroup
              value={selectedOptions[0]?.toString()}
              onValueChange={(val) => handleOptionChange(parseInt(val))}
            >
              {poll.options.map((option) => (
                <div key={option.index} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.index.toString()}
                    id={`option-${option.index}`}
                  />
                  <Label
                    htmlFor={`option-${option.index}`}
                    className="flex-1 cursor-pointer"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          <Button
            onClick={handleVote}
            disabled={voting || selectedOptions.length === 0}
            className="w-full"
          >
            {voting ? 'Votando...' : 'Votar'}
          </Button>
        </>
      ) : (
        <>
          {/* Resultados */}
          <div className="space-y-2">
            {poll.options.map((option) => {
              const percentage =
                poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
              const isUserVote = poll.userVote?.includes(option.index);

              return (
                <div key={option.index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={isUserVote ? 'font-semibold' : ''}>
                      {option.text}
                      {isUserVote && ' ✓'}
                    </span>
                    <span className="text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="text-sm text-muted-foreground flex items-center justify-between pt-2 border-t">
        <span>{poll.totalVotes} votos</span>
        <span>{timeRemaining}</span>
      </div>
    </div>
  );
}
```

#### 3. Atualizar CreatePostModal para Criar Polls

**Arquivo**: `apps/web/src/components/social/CreatePostModal.tsx`

**Passo 1**: Adicionar estado de poll
```typescript
const [pollOptions, setPollOptions] = useState<string[]>([]);
const [pollDuration, setPollDuration] = useState<number>(24); // horas
const [showPollForm, setShowPollForm] = useState(false);
```

**Passo 2**: Adicionar imports
```typescript
import { BarChart3, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```

**Passo 3**: Atualizar `handleSubmit`
```typescript
const handleSubmit = async () => {
  if (!content.trim() && pollOptions.length === 0) {
    toast.error('Digite algo ou crie uma enquete');
    return;
  }

  setLoading(true);
  try {
    const payload: any = {
      kind: pollOptions.length > 0 ? 'poll' : 'text',
      content: content.trim(),
    };

    if (pollOptions.length > 0) {
      payload.poll = {
        options: pollOptions.filter((o) => o.trim()),
        duration: pollDuration * 3600, // converter horas para segundos
        allowMultiple: false,
      };
    } else if (images.length > 0) {
      payload.media = images.map((url) => ({ url, type: 'image' }));
    }

    await apiHelpers.createPost(payload);

    toast.success('Post publicado!');
    setContent('');
    setImages([]);
    setPollOptions([]);
    setShowPollForm(false);
    onOpenChange(false);
  } catch (error: any) {
    toast.error(error?.message || 'Erro ao publicar post');
  } finally {
    setLoading(false);
  }
};
```

**Passo 4**: Adicionar formulário de poll no JSX (após textarea, antes de preview de imagens)

```typescript
{/* Formulário de Poll */}
{showPollForm && (
  <div className="space-y-3 p-4 border rounded-md">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-sm">Criar Enquete</h3>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setShowPollForm(false);
          setPollOptions([]);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>

    {/* Opções da enquete */}
    {pollOptions.map((option, index) => (
      <div key={index} className="flex gap-2">
        <Input
          placeholder={`Opção ${index + 1}`}
          value={option}
          onChange={(e) => {
            const newOptions = [...pollOptions];
            newOptions[index] = e.target.value;
            setPollOptions(newOptions);
          }}
          maxLength={50}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    ))}

    {pollOptions.length < 4 && (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPollOptions([...pollOptions, ''])}
        className="w-full"
      >
        Adicionar opção
      </Button>
    )}

    {/* Duração */}
    <div className="flex items-center gap-2">
      <Label className="text-sm">Duração:</Label>
      <Select
        value={pollDuration.toString()}
        onValueChange={(val) => setPollDuration(parseInt(val))}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1 hora</SelectItem>
          <SelectItem value="6">6 horas</SelectItem>
          <SelectItem value="24">1 dia</SelectItem>
          <SelectItem value="72">3 dias</SelectItem>
          <SelectItem value="168">7 dias</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
)}
```

**Passo 5**: Adicionar botão de poll na toolbar (ao lado de ImagePlus)

```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={() => {
    setShowPollForm(!showPollForm);
    if (!showPollForm) {
      setPollOptions(['', '']); // Iniciar com 2 opções vazias
      setImages([]); // Não pode ter imagem + poll
    }
  }}
  disabled={images.length > 0}
>
  <BarChart3 className="h-5 w-5" />
</Button>
```

#### 4. Atualizar PostCard para Exibir Polls

**Arquivo**: `apps/web/src/components/social/PostCard.tsx`

**Passo 1**: Adicionar import
```typescript
import { PollCard } from './PollCard';
```

**Passo 2**: Adicionar prop `poll`
```typescript
interface PostCardProps {
  post: {
    // ... props existentes
    kind?: string; // ADICIONAR
    poll?: {       // ADICIONAR
      options: Array<{ index: number; text: string; votes: number }>;
      totalVotes: number;
      endsAt: string;
      hasVoted: boolean;
      userVote?: number[];
      allowMultiple: boolean;
    };
  };
  // ...
}
```

**Passo 3**: Exibir poll (após content, no lugar ou antes de media)

```typescript
{/* Content */}
<div className="mb-3">
  <p className="whitespace-pre-wrap break-words">
    {post.content}
  </p>
</div>

{/* Poll */}
{post.kind === 'poll' && post.poll && (
  <div className="mb-3">
    <PollCard postId={post.id} poll={post.poll} />
  </div>
)}

{/* Media */}
{post.media && post.media.length > 0 && (
  // ... código existente
)}
```

## ✅ Checklist de Validação

- [ ] API helper `votePoll` adicionado
- [ ] Componente `PollCard.tsx` criado
- [ ] `CreatePostModal` atualizado para criar polls
- [ ] `PostCard` exibe polls corretamente
- [ ] Testar: criar poll com 2-4 opções
- [ ] Testar: votar em poll
- [ ] Testar: ver resultados após votar
- [ ] Testar: poll expirada mostra apenas resultados
- [ ] Testar: contador de votos atualiza
- [ ] Testar: barra de progresso visual correta

## 🚫 NÃO FAZER

- ❌ NÃO permitir imagem + poll no mesmo post
- ❌ NÃO permitir votar novamente (backend decide)

---

# PROMPT 9: Suporte a Vídeos

**Prioridade**: Baixa
**Complexidade**: Média
**Tempo estimado**: 60-90 min

## 📋 Contexto

Atualmente apenas imagens são suportadas. Usuários querem postar vídeos.

## 🎯 Objetivo

Adicionar suporte para upload e exibição de vídeos em posts.

## 📦 Requisitos

### Backend (assumir que existe)

**Upload de Vídeo**:
```typescript
POST /media/upload-video
Content-Type: multipart/form-data

// Response
{
  "asset": {
    "url": "https://.../video.mp4",
    "thumbnailUrl": "https://.../thumbnail.jpg",
    "duration": 45.2, // segundos
    "size": 5242880 // bytes
  }
}
```

### Frontend

#### 1. Adicionar API Helper

**Arquivo**: `apps/web/src/lib/api.ts`

```typescript
// Já existe uploadPostImage, adicionar:
uploadPostVideo: (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/media/upload-video', {
    method: 'POST',
    body: formData,
  }, { requireAuth: true });
},
```

#### 2. Atualizar CreatePostModal

**Arquivo**: `apps/web/src/components/social/CreatePostModal.tsx`

**Passo 1**: Adicionar estado de vídeos
```typescript
const [videos, setVideos] = useState<Array<{ url: string; thumbnailUrl?: string }>>([]);
```

**Passo 2**: Adicionar imports
```typescript
import { Video } from 'lucide-react';
```

**Passo 3**: Adicionar handler de upload de vídeo
```typescript
const handleVideoUpload = async (file: File) => {
  // Validações
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error('Formato não suportado. Use MP4, WebM ou MOV.');
    return;
  }

  if (file.size > MAX_SIZE) {
    toast.error('Vídeo muito grande. Máximo 100MB.');
    return;
  }

  if (videos.length >= 1) {
    toast.error('Máximo de 1 vídeo por post');
    return;
  }

  try {
    toast.info('Enviando vídeo... Isso pode levar alguns instantes.');
    const res = await apiHelpers.uploadPostVideo(file);
    setVideos([{ url: res.asset.url, thumbnailUrl: res.asset.thumbnailUrl }]);
    setImages([]); // Limpar imagens (não pode ter vídeo + imagem)
    toast.success('Vídeo carregado!');
  } catch (error) {
    toast.error('Erro ao fazer upload do vídeo');
  }
};
```

**Passo 4**: Atualizar `handleSubmit`
```typescript
const payload: any = {
  kind: 'text',
  content: content.trim(),
};

if (images.length > 0) {
  payload.media = images.map((url) => ({ url, type: 'image' }));
} else if (videos.length > 0) {
  payload.media = videos.map((v) => ({ url: v.url, type: 'video', thumbnailUrl: v.thumbnailUrl }));
}
```

**Passo 5**: Adicionar preview de vídeo (após preview de imagens)
```typescript
{/* Preview de vídeos */}
{videos.length > 0 && (
  <div className="space-y-2">
    {videos.map((video, index) => (
      <div key={index} className="relative">
        <video
          src={video.url}
          controls
          className="w-full max-h-64 rounded-md bg-black"
          poster={video.thumbnailUrl}
        />
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white"
          onClick={() => setVideos([])}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    ))}
  </div>
)}
```

**Passo 6**: Adicionar botão de vídeo na toolbar
```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={() => videoInputRef.current?.click()}
  disabled={videos.length >= 1 || images.length > 0}
>
  <Video className="h-5 w-5" />
</Button>

<input
  ref={videoInputRef}
  type="file"
  accept="video/mp4,video/webm,video/quicktime"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleVideoUpload(file);
  }}
/>
```

#### 3. Atualizar PostCard para Exibir Vídeos

**Arquivo**: `apps/web/src/components/social/PostCard.tsx`

**Atualizar seção de mídia** (linha ~102):

```typescript
{/* Media */}
{post.media && post.media.length > 0 && (
  <div className={`grid gap-2 mb-3 ${
    post.media.length === 1 ? 'grid-cols-1' :
    post.media.length === 2 ? 'grid-cols-2' :
    'grid-cols-2'
  }`}>
    {post.media.map((item, index) => (
      item.type === 'video' ? (
        <video
          key={index}
          src={item.url}
          controls
          className="w-full h-auto rounded-md bg-black"
          poster={item.thumbnailUrl}
          preload="metadata"
        />
      ) : (
        <img
          key={index}
          src={item.url}
          alt={`Media ${index + 1}`}
          className="w-full h-auto rounded-md object-cover"
          loading="lazy"
        />
      )
    ))}
  </div>
)}
```

#### 4. Adicionar TypeScript Interface

**Atualizar PostCardProps**:
```typescript
interface PostCardProps {
  post: {
    // ...
    media?: Array<{
      url: string;
      type: string;
      thumbnailUrl?: string; // ADICIONAR para vídeos
    }>;
    // ...
  };
}
```

## ✅ Checklist de Validação

- [ ] API helper `uploadPostVideo` adicionado
- [ ] `CreatePostModal` suporta upload de vídeos
- [ ] Preview de vídeo aparece no modal
- [ ] Validação de tamanho (100MB) e formato funciona
- [ ] Não permite vídeo + imagem no mesmo post
- [ ] `PostCard` exibe vídeos com player nativo
- [ ] Thumbnail do vídeo aparece antes de carregar
- [ ] Controles de play/pause funcionam
- [ ] Testar em mobile e desktop

## 🚫 NÃO FAZER

- ❌ NÃO permitir múltiplos vídeos (apenas 1)
- ❌ NÃO implementar editor de vídeo (fora do escopo)

---

# PROMPT 10: Reações Múltiplas (além de Like)

**Prioridade**: Baixa
**Complexidade**: Alta
**Tempo estimado**: 90-120 min

## 📋 Contexto

Atualmente só existe "Like". Usuários querem expressar diferentes emoções (similar ao Facebook).

## 🎯 Objetivo

Adicionar reações múltiplas: ❤️ Curtir, 😂 Engraçado, 😮 Surpreso, 😢 Triste, 😡 Revoltado

## 📦 Requisitos

### Backend (assumir que existe)

**Endpoint**: `POST /posts/:postId/react`
```typescript
// Request
{
  "reaction": "love" // love | laugh | wow | sad | angry
}

// Response
{
  "reactions": {
    "love": 42,
    "laugh": 10,
    "wow": 5,
    "sad": 2,
    "angry": 1
  },
  "userReaction": "love",
  "totalReactions": 60
}
```

**Remover reação**: `DELETE /posts/:postId/react`

### Frontend

#### 1. Adicionar API Helpers

**Arquivo**: `apps/web/src/lib/api.ts`

```typescript
// Reações
reactToPost: (postId: string, data: { reaction: string }) =>
  postJSON(`/posts/${postId}/react`, data),
removeReaction: (postId: string) => deleteJSON(`/posts/${postId}/react`),
```

#### 2. Criar Componente ReactionPicker

**Arquivo**: `apps/web/src/components/social/ReactionPicker.tsx` (NOVO)

```typescript
// apps/web/src/components/social/ReactionPicker.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const REACTIONS = [
  { key: 'love', emoji: '❤️', label: 'Curtir' },
  { key: 'laugh', emoji: '😂', label: 'Engraçado' },
  { key: 'wow', emoji: '😮', label: 'Surpreso' },
  { key: 'sad', emoji: '😢', label: 'Triste' },
  { key: 'angry', emoji: '😡', label: 'Revoltado' },
];

interface ReactionPickerProps {
  postId: string;
  initialReactions: {
    love: number;
    laugh: number;
    wow: number;
    sad: number;
    angry: number;
  };
  userReaction?: string;
}

export function ReactionPicker({
  postId,
  initialReactions,
  userReaction: initialUserReaction,
}: ReactionPickerProps) {
  const [reactions, setReactions] = useState(initialReactions);
  const [userReaction, setUserReaction] = useState<string | undefined>(initialUserReaction);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  const handleReact = async (reactionKey: string) => {
    if (loading) return;

    const previousReactions = { ...reactions };
    const previousUserReaction = userReaction;

    // Optimistic update
    if (userReaction === reactionKey) {
      // Remover reação
      setReactions({
        ...reactions,
        [reactionKey]: Math.max(0, reactions[reactionKey as keyof typeof reactions] - 1),
      });
      setUserReaction(undefined);
    } else {
      // Adicionar/trocar reação
      const newReactions = { ...reactions };
      if (userReaction) {
        newReactions[userReaction as keyof typeof newReactions]--;
      }
      newReactions[reactionKey as keyof typeof newReactions]++;
      setReactions(newReactions);
      setUserReaction(reactionKey);
    }

    setLoading(true);
    setOpen(false);

    try {
      if (userReaction === reactionKey) {
        // Remover
        const response: any = await apiHelpers.removeReaction(postId);
        setReactions(response.reactions);
        setUserReaction(undefined);
      } else {
        // Adicionar/trocar
        const response: any = await apiHelpers.reactToPost(postId, { reaction: reactionKey });
        setReactions(response.reactions);
        setUserReaction(response.userReaction);
      }
    } catch (error) {
      // Rollback
      setReactions(previousReactions);
      setUserReaction(previousUserReaction);
      toast.error('Erro ao reagir');
      console.error('Reaction error:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentReactionEmoji = userReaction
    ? REACTIONS.find((r) => r.key === userReaction)?.emoji
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2",
            userReaction && "text-primary"
          )}
        >
          <span className="text-base">
            {currentReactionEmoji || '🤍'}
          </span>
          {totalReactions > 0 && (
            <span className="text-sm tabular-nums">
              {totalReactions}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.key}
              onClick={() => handleReact(reaction.key)}
              disabled={loading}
              className={cn(
                "text-2xl p-2 rounded-md hover:bg-accent transition-all hover:scale-125",
                userReaction === reaction.key && "bg-accent"
              )}
              title={reaction.label}
            >
              {reaction.emoji}
            </button>
          ))}
        </div>

        {/* Contadores detalhados (opcional) */}
        <div className="mt-2 pt-2 border-t space-y-1">
          {REACTIONS.map((reaction) => {
            const count = reactions[reaction.key as keyof typeof reactions];
            if (count === 0) return null;

            return (
              <div key={reaction.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span>{reaction.emoji}</span>
                  <span className="text-muted-foreground">{reaction.label}</span>
                </span>
                <span className="font-semibold">{count}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

#### 3. Substituir LikeButton por ReactionPicker no PostCard

**Arquivo**: `apps/web/src/components/social/PostCard.tsx`

**Passo 1**: Adicionar import
```typescript
import { ReactionPicker } from './ReactionPicker';
```

**Passo 2**: Atualizar interface
```typescript
interface PostCardProps {
  post: {
    // ... props existentes
    // REMOVER: isLiked?: boolean;
    // REMOVER: likesCount?: number;

    // ADICIONAR:
    reactions?: {
      love: number;
      laugh: number;
      wow: number;
      sad: number;
      angry: number;
    };
    userReaction?: string;
  };
  // ...
}
```

**Passo 3**: Substituir LikeButton (linha ~123)

**ANTES**:
```typescript
<LikeButton
  postId={post.id}
  initialLiked={post.isLiked || false}
  initialCount={post.likesCount || 0}
/>
```

**DEPOIS**:
```typescript
<ReactionPicker
  postId={post.id}
  initialReactions={post.reactions || {
    love: 0,
    laugh: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  }}
  userReaction={post.userReaction}
/>
```

#### 4. Manter Retrocompatibilidade (Opcional)

Se quiser manter suporte ao `likesCount` antigo enquanto migra o backend:

```typescript
<ReactionPicker
  postId={post.id}
  initialReactions={post.reactions || {
    love: post.likesCount || 0, // Fallback para likesCount
    laugh: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  }}
  userReaction={post.userReaction || (post.isLiked ? 'love' : undefined)}
/>
```

## ✅ Checklist de Validação

- [ ] API helpers `reactToPost` e `removeReaction` adicionados
- [ ] Componente `ReactionPicker.tsx` criado
- [ ] `PostCard` usa `ReactionPicker` em vez de `LikeButton`
- [ ] Testar: clicar abre popover com 5 reações
- [ ] Testar: clicar em reação registra voto
- [ ] Testar: clicar novamente remove reação
- [ ] Testar: trocar reação atualiza corretamente
- [ ] Testar: contador total atualiza
- [ ] Testar: contadores detalhados aparecem
- [ ] Testar: animação de hover funciona

## 🚫 NÃO FAZER

- ❌ NÃO permitir múltiplas reações simultâneas (apenas 1)
- ❌ NÃO deletar `LikeButton.tsx` (pode ser usado em outros lugares)

---

# 📊 Resumo Final da Implementação

## Ordem Recomendada de Execução:

### Fase 1 - Alta Prioridade (Prompts 1-5)
1. ✅ Repost
2. ✅ Menu de Opções (Deletar, Editar, Reportar, Copiar Link)
3. ✅ Página de Detalhes do Post
4. ✅ Editar Post
5. ✅ Bookmark/Salvar Posts

### Fase 2 - Média Prioridade (Prompts 6-7)
6. ✅ Reportar Post (completar)
7. ✅ Fixar Post no Perfil

### Fase 3 - Baixa Prioridade (Prompts 8-10)
8. ✅ Enquetes/Polls
9. ✅ Suporte a Vídeos
10. ✅ Reações Múltiplas

---

## 🎯 Progresso Estimado:

- **Parte 1** (Prompts 1-5): ~5-6 horas
- **Parte 2** (Prompts 6-10): ~6-8 horas
- **Total**: ~11-14 horas

---

## 📋 Instruções de Uso:

1. Execute os prompts **em ordem sequencial**
2. **Valide cada funcionalidade** antes de prosseguir
3. **Faça commits** após cada prompt concluído
4. Se encontrar erro, **corrija antes** de ir para o próximo
5. **Teste em produção** apenas após todos os prompts da Fase 1

---

## ⚠️ IMPORTANTE:

- **Não pule prompts**: Alguns dependem de alterações anteriores
- **Siga os padrões do projeto**: Todos os prompts foram escritos seguindo as convenções existentes
- **Sem regressões**: Testes devem garantir que funcionalidades existentes não quebrem
- **Backend mock**: Se API não existir, componentes devem falhar graciosamente

---

Fim da Especificação Técnica - Parte 2
