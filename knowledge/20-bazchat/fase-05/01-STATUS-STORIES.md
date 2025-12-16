# Feature: Status/Stories

## Resumo

Permitir que usuarios publiquem conteudo efemero (imagem, video, texto) que desaparece apos 24 horas, similar ao WhatsApp Status e Instagram Stories.

## User Stories

1. **Como usuario**, quero publicar um status com foto/video/texto para compartilhar momentos com meus contatos
2. **Como usuario**, quero ver os status dos meus contatos em uma area dedicada
3. **Como usuario**, quero saber quem visualizou meu status
4. **Como usuario**, quero responder a um status de um contato via mensagem direta
5. **Como vendedor**, quero usar status para divulgar produtos e promocoes

## Especificacao Tecnica

### 1. Schema do Banco de Dados

```prisma
// apps/api/prisma/schema.prisma

model Story {
  id            String   @id @default(cuid())
  profileId     String
  profile       Profile  @relation(fields: [profileId], references: [id])

  // Conteudo
  type          StoryType  // TEXT, IMAGE, VIDEO
  text          String?    // Texto (para TEXT ou caption)
  textColor     String?    // Cor do texto (hex)
  backgroundColor String?  // Cor de fundo para TEXT
  mediaCid      String?    // CID do IPFS para IMAGE/VIDEO
  mediaType     String?    // image/jpeg, video/mp4, etc
  duration      Int?       // Duracao em segundos (para video)

  // Metadata
  createdAt     DateTime @default(now())
  expiresAt     DateTime // createdAt + 24h
  viewCount     Int      @default(0)

  // Relacoes
  views         StoryView[]
  replies       StoryReply[]

  @@index([profileId, expiresAt])
  @@index([expiresAt])
}

model StoryView {
  id        String   @id @default(cuid())
  storyId   String
  story     Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  viewerId  String
  viewer    Profile  @relation(fields: [viewerId], references: [id])
  viewedAt  DateTime @default(now())

  @@unique([storyId, viewerId])
  @@index([storyId])
}

model StoryReply {
  id        String   @id @default(cuid())
  storyId   String
  story     Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  fromId    String
  from      Profile  @relation(fields: [fromId], references: [id])
  message   String   // Mensagem de resposta
  createdAt DateTime @default(now())

  @@index([storyId])
}

enum StoryType {
  TEXT
  IMAGE
  VIDEO
}
```

### 2. Backend - Endpoints REST

```typescript
// apps/api/src/routes/stories.ts

import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../lib/auth/middleware';
import { prisma } from '../lib/prisma';

export default async function storiesRoutes(app: FastifyInstance) {

  // Criar story
  app.post('/stories', { preHandler: authOnRequest }, async (req, reply) => {
    const profileId = req.authUser.profileId;
    const { type, text, textColor, backgroundColor, mediaCid, mediaType, duration } = req.body as {
      type: 'TEXT' | 'IMAGE' | 'VIDEO';
      text?: string;
      textColor?: string;
      backgroundColor?: string;
      mediaCid?: string;
      mediaType?: string;
      duration?: number;
    };

    // Validacoes
    if (type === 'TEXT' && !text) {
      return reply.code(400).send({ error: 'Text is required for TEXT stories' });
    }
    if ((type === 'IMAGE' || type === 'VIDEO') && !mediaCid) {
      return reply.code(400).send({ error: 'Media CID is required for IMAGE/VIDEO stories' });
    }

    const story = await prisma.story.create({
      data: {
        profileId,
        type,
        text,
        textColor,
        backgroundColor,
        mediaCid,
        mediaType,
        duration,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
      },
    });

    return story;
  });

  // Listar stories dos contatos (feed)
  app.get('/stories/feed', { preHandler: authOnRequest }, async (req, reply) => {
    const profileId = req.authUser.profileId;

    // Buscar contatos (pessoas com quem tem thread DM)
    const threads = await prisma.chatThread.findMany({
      where: {
        kind: 'DM',
        participants: { has: profileId },
      },
      select: { participants: true },
    });

    const contactIds = new Set<string>();
    threads.forEach(t => {
      t.participants.forEach(p => {
        if (p !== profileId) contactIds.add(p);
      });
    });

    // Buscar stories ativos dos contatos + proprio usuario
    const allIds = [...contactIds, profileId];

    const stories = await prisma.story.findMany({
      where: {
        profileId: { in: allIds },
        expiresAt: { gt: new Date() },
      },
      include: {
        profile: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
        views: {
          where: { viewerId: profileId },
          select: { viewedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Agrupar por usuario
    const grouped = new Map<string, {
      profile: { id: string; handle: string; displayName: string | null; avatarUrl: string | null };
      stories: typeof stories;
      hasUnviewed: boolean;
      latestAt: Date;
    }>();

    stories.forEach(story => {
      const pid = story.profileId;
      const existing = grouped.get(pid);
      const isViewed = story.views.length > 0;

      if (existing) {
        existing.stories.push(story);
        if (!isViewed) existing.hasUnviewed = true;
      } else {
        grouped.set(pid, {
          profile: story.profile,
          stories: [story],
          hasUnviewed: !isViewed,
          latestAt: story.createdAt,
        });
      }
    });

    // Ordenar: nao vistos primeiro, depois por data
    const result = Array.from(grouped.values()).sort((a, b) => {
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return b.latestAt.getTime() - a.latestAt.getTime();
    });

    return result;
  });

  // Meus stories
  app.get('/stories/mine', { preHandler: authOnRequest }, async (req, reply) => {
    const profileId = req.authUser.profileId;

    const stories = await prisma.story.findMany({
      where: {
        profileId,
        expiresAt: { gt: new Date() },
      },
      include: {
        views: {
          include: {
            viewer: {
              select: { id: true, handle: true, displayName: true, avatarUrl: true },
            },
          },
          orderBy: { viewedAt: 'desc' },
        },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return stories;
  });

  // Ver story (registrar visualizacao)
  app.post('/stories/:storyId/view', { preHandler: authOnRequest }, async (req, reply) => {
    const { storyId } = req.params as { storyId: string };
    const viewerId = req.authUser.profileId;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      return reply.code(404).send({ error: 'Story not found' });
    }

    // Nao registrar view do proprio story
    if (story.profileId === viewerId) {
      return { success: true };
    }

    // Upsert view
    await prisma.storyView.upsert({
      where: {
        storyId_viewerId: { storyId, viewerId },
      },
      create: { storyId, viewerId },
      update: { viewedAt: new Date() },
    });

    // Incrementar contador
    await prisma.story.update({
      where: { id: storyId },
      data: { viewCount: { increment: 1 } },
    });

    return { success: true };
  });

  // Responder story
  app.post('/stories/:storyId/reply', { preHandler: authOnRequest }, async (req, reply) => {
    const { storyId } = req.params as { storyId: string };
    const fromId = req.authUser.profileId;
    const { message } = req.body as { message: string };

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: { profile: true },
    });

    if (!story) {
      return reply.code(404).send({ error: 'Story not found' });
    }

    // Criar resposta
    const storyReply = await prisma.storyReply.create({
      data: { storyId, fromId, message },
    });

    // Criar/buscar thread DM com o autor do story
    let thread = await prisma.chatThread.findFirst({
      where: {
        kind: 'DM',
        participants: { hasEvery: [fromId, story.profileId] },
      },
    });

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          kind: 'DM',
          participants: [fromId, story.profileId],
        },
      });
    }

    // Enviar mensagem referenciando o story
    // TODO: Criar tipo de mensagem especial para story reply
    // Por ora, enviar como texto normal com referencia

    return { success: true, replyId: storyReply.id, threadId: thread.id };
  });

  // Deletar story
  app.delete('/stories/:storyId', { preHandler: authOnRequest }, async (req, reply) => {
    const { storyId } = req.params as { storyId: string };
    const profileId = req.authUser.profileId;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      return reply.code(404).send({ error: 'Story not found' });
    }

    if (story.profileId !== profileId) {
      return reply.code(403).send({ error: 'Not authorized' });
    }

    await prisma.story.delete({ where: { id: storyId } });

    return { success: true };
  });
}
```

### 3. Backend - Cron Job para Expirar Stories

```typescript
// apps/api/src/jobs/expire-stories.ts

import { prisma } from '../lib/prisma';

export async function expireStories() {
  const result = await prisma.story.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  console.log(`[ExpireStories] Deleted ${result.count} expired stories`);
  return result.count;
}

// Executar a cada hora (ou configurar no cron do sistema)
// 0 * * * * node -e "require('./dist/jobs/expire-stories').expireStories()"
```

### 4. Shared Types

```typescript
// packages/shared-types/src/stories.ts

export interface Story {
  id: string;
  profileId: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  text?: string | null;
  textColor?: string | null;
  backgroundColor?: string | null;
  mediaCid?: string | null;
  mediaType?: string | null;
  duration?: number | null;
  createdAt: number;
  expiresAt: number;
  viewCount: number;
}

export interface StoryView {
  id: string;
  storyId: string;
  viewerId: string;
  viewedAt: number;
  viewer?: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface StoryFeedItem {
  profile: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  stories: Story[];
  hasUnviewed: boolean;
  latestAt: number;
}
```

### 5. Frontend - Componentes

#### StoriesBar (Barra no topo do chat inbox)

```typescript
// apps/web/src/components/chat/StoriesBar.tsx

import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface StoriesBarProps {
  onCreateStory: () => void;
  onViewStories: (profileId: string) => void;
}

export function StoriesBar({ onCreateStory, onViewStories }: StoriesBarProps) {
  const { data: feed } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: () => api.get('/stories/feed').then(r => r.data),
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  return (
    <div className="flex gap-3 p-4 overflow-x-auto border-b">
      {/* Botao criar story */}
      <button
        onClick={onCreateStory}
        className="flex flex-col items-center gap-1 flex-shrink-0"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
        <span className="text-xs">Seu status</span>
      </button>

      {/* Stories dos contatos */}
      {feed?.map((item: StoryFeedItem) => (
        <button
          key={item.profile.id}
          onClick={() => onViewStories(item.profile.id)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className={cn(
            'p-0.5 rounded-full',
            item.hasUnviewed
              ? 'bg-gradient-to-br from-primary to-secondary'
              : 'bg-muted'
          )}>
            <Avatar
              src={item.profile.avatarUrl}
              alt={item.profile.displayName || item.profile.handle}
              className="w-14 h-14 border-2 border-background"
            />
          </div>
          <span className="text-xs truncate max-w-16">
            {item.profile.displayName || item.profile.handle}
          </span>
        </button>
      ))}
    </div>
  );
}
```

#### StoryViewer (Visualizador fullscreen)

```typescript
// apps/web/src/components/chat/StoryViewer.tsx

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Eye } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StoryViewerProps {
  stories: Story[];
  profile: { id: string; handle: string; displayName: string | null; avatarUrl: string | null };
  initialIndex?: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  isOwn?: boolean;
}

export function StoryViewer({
  stories,
  profile,
  initialIndex = 0,
  onClose,
  onNext,
  onPrev,
  isOwn,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [reply, setReply] = useState('');
  const [progress, setProgress] = useState(0);

  const story = stories[currentIndex];
  const duration = story.type === 'VIDEO' ? (story.duration || 15) * 1000 : 5000;

  // Registrar visualizacao
  useEffect(() => {
    if (!isOwn) {
      api.post(`/stories/${story.id}/view`);
    }
  }, [story.id, isOwn]);

  // Progress bar automatico
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Proximo story
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(i => i + 1);
            return 0;
          } else {
            onNext?.();
            return 100;
          }
        }
        return prev + (100 / (duration / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, duration, stories.length, onNext]);

  // Reset progress ao mudar de story
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      onNext?.();
    }
  }, [currentIndex, stories.length, onNext]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    } else {
      onPrev?.();
    }
  }, [currentIndex, onPrev]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    await api.post(`/stories/${story.id}/reply`, { message: reply });
    setReply('');
    // TODO: Mostrar toast de confirmacao
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 p-2">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar
          src={profile.avatarUrl}
          alt={profile.displayName || profile.handle}
          className="w-10 h-10"
        />
        <div className="flex-1">
          <p className="text-white font-medium">
            {profile.displayName || profile.handle}
          </p>
          <p className="text-white/60 text-sm">
            {formatDistanceToNow(story.createdAt, { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        {isOwn && (
          <div className="flex items-center gap-1 text-white/60">
            <Eye className="w-4 h-4" />
            <span className="text-sm">{story.viewCount}</span>
          </div>
        )}
        <button onClick={onClose} className="text-white p-2">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Conteudo */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Areas de toque para navegacao */}
        <button
          onClick={goPrev}
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
        />
        <button
          onClick={goNext}
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
        />

        {/* Conteudo do story */}
        {story.type === 'TEXT' && (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: story.backgroundColor || '#8B0000' }}
          >
            <p
              className="text-2xl font-bold text-center"
              style={{ color: story.textColor || '#FFFFFF' }}
            >
              {story.text}
            </p>
          </div>
        )}

        {story.type === 'IMAGE' && (
          <img
            src={`/ipfs/${story.mediaCid}`}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        )}

        {story.type === 'VIDEO' && (
          <video
            src={`/ipfs/${story.mediaCid}`}
            autoPlay
            muted
            playsInline
            className="max-w-full max-h-full object-contain"
          />
        )}

        {/* Setas de navegacao (desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white hidden md:block"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white hidden md:block"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}
      </div>

      {/* Reply (apenas se nao for proprio story) */}
      {!isOwn && (
        <div className="p-4 flex gap-2">
          <Input
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Responder..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            onKeyDown={e => e.key === 'Enter' && handleReply()}
          />
          <Button onClick={handleReply} size="icon" variant="ghost" className="text-white">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

#### StoryCreator (Criacao de story)

```typescript
// apps/web/src/components/chat/StoryCreator.tsx

import { useState, useRef } from 'react';
import { X, Camera, Type, Image as ImageIcon, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api, uploadFile } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface StoryCreatorProps {
  onClose: () => void;
}

type StoryMode = 'select' | 'text' | 'media';

const COLORS = [
  '#8B0000', '#1E3A8A', '#065F46', '#7C3AED',
  '#DC2626', '#EA580C', '#CA8A04', '#DB2777',
];

export function StoryCreator({ onClose }: StoryCreatorProps) {
  const [mode, setMode] = useState<StoryMode>('select');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(COLORS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: {
      type: 'TEXT' | 'IMAGE' | 'VIDEO';
      text?: string;
      backgroundColor?: string;
      mediaCid?: string;
      mediaType?: string;
    }) => {
      return api.post('/stories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      onClose();
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setMode('media');
  };

  const handlePublishText = () => {
    if (!text.trim()) return;
    createMutation.mutate({
      type: 'TEXT',
      text: text.trim(),
      backgroundColor: bgColor,
    });
  };

  const handlePublishMedia = async () => {
    if (!mediaFile) return;

    // Upload para IPFS
    const { cid } = await uploadFile(mediaFile);
    const type = mediaFile.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';

    createMutation.mutate({
      type,
      mediaCid: cid,
      mediaType: mediaFile.type,
      text: caption || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="text-white p-2">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-white font-medium">Criar Status</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Conteudo baseado no modo */}
      {mode === 'select' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
          <Button
            size="lg"
            className="w-full max-w-xs gap-2"
            onClick={() => setMode('text')}
          >
            <Type className="w-5 h-5" />
            Status de Texto
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full max-w-xs gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-5 h-5" />
            Foto ou Video
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {mode === 'text' && (
        <div
          className="flex-1 flex flex-col items-center justify-center p-8"
          style={{ backgroundColor: bgColor }}
        >
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Digite seu status..."
            className="bg-transparent border-none text-white text-2xl font-bold text-center resize-none focus:ring-0 placeholder:text-white/50"
            rows={4}
            maxLength={500}
          />

          {/* Seletor de cor */}
          <div className="flex gap-2 mt-8">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                className="w-8 h-8 rounded-full border-2"
                style={{
                  backgroundColor: color,
                  borderColor: bgColor === color ? 'white' : 'transparent',
                }}
              />
            ))}
          </div>

          {/* Botao publicar */}
          <Button
            onClick={handlePublishText}
            disabled={!text.trim() || createMutation.isPending}
            className="mt-8 gap-2"
          >
            <Send className="w-4 h-4" />
            Publicar
          </Button>
        </div>
      )}

      {mode === 'media' && mediaPreview && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            {mediaFile?.type.startsWith('video/') ? (
              <video
                src={mediaPreview}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={mediaPreview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Caption e publicar */}
          <div className="p-4 flex gap-2">
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Adicionar legenda..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/50"
              maxLength={200}
            />
            <Button
              onClick={handlePublishMedia}
              disabled={createMutation.isPending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## UI/UX Specs

### Visual - Barra de Stories

```
┌─────────────────────────────────────────────────────────────┐
│  [+ Seu]  [●User1]  [●User2]  [○User3]  [○User4]  ...      │
│  status    ativo     ativo    visto     visto              │
└─────────────────────────────────────────────────────────────┘
```

- Circulos com gradiente = stories nao vistos
- Circulos cinza = todos os stories vistos
- Avatar do usuario no centro

### Visual - Viewer

```
┌─────────────────────────────────────────────────────────────┐
│ [===----] [------] [------]  <- progress bars              │
│                                                             │
│ [Avatar] Nome                               [X]             │
│          há 2 horas                                         │
│                                                             │
│                                                             │
│                    [CONTEUDO]                               │
│                                                             │
│                                                             │
│                                                             │
│ [        Responder...        ] [>]                          │
└─────────────────────────────────────────────────────────────┘
```

### Navegacao

- **Toque esquerdo**: story anterior
- **Toque direito**: proximo story
- **Segurar**: pausar
- **Swipe down**: fechar
- **Swipe horizontal**: proximo/anterior usuario

## Arquivos a Criar/Modificar

### Backend
- `apps/api/prisma/schema.prisma` - Modelos Story, StoryView, StoryReply
- `apps/api/src/routes/stories.ts` - Endpoints REST
- `apps/api/src/jobs/expire-stories.ts` - Cron de expiracao
- `apps/api/src/server.ts` - Registrar rotas

### Frontend
- `apps/web/src/components/chat/StoriesBar.tsx` - Barra de stories
- `apps/web/src/components/chat/StoryViewer.tsx` - Visualizador
- `apps/web/src/components/chat/StoryCreator.tsx` - Criador
- `apps/web/src/pages/chat/ChatInboxPage.tsx` - Integrar StoriesBar

### Shared
- `packages/shared-types/src/stories.ts` - Tipos

## Testes

- [ ] Criar story de texto
- [ ] Criar story de imagem
- [ ] Criar story de video
- [ ] Ver stories de contatos
- [ ] Progress bar funciona corretamente
- [ ] Navegacao entre stories (toque/swipe)
- [ ] Responder story cria mensagem DM
- [ ] Visualizacoes sao registradas
- [ ] Dono ve quem visualizou
- [ ] Stories expiram apos 24h
- [ ] Stories de usuarios nao-contatos nao aparecem
