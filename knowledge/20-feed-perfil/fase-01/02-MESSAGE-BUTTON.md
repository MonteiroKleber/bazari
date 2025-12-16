# Feature: Botao de Mensagem no Perfil

## Objetivo

Adicionar um botao "Enviar Mensagem" na pagina de perfil publico que inicia uma conversa direta com o usuario via BazChat.

## Requisitos Funcionais

### Comportamento
- Botao aparece ao lado do "Seguir" quando:
  - Usuario esta logado
  - NAO e o proprio perfil (isOwnProfile === false)
  - Usuario visitado permite mensagens (ou sempre permitir por padrao)

- Ao clicar:
  1. Verificar se ja existe thread com esse usuario
  2. Se existe: Navegar para `/app/chat/:threadId`
  3. Se nao existe: Criar nova thread e navegar

### Visual
- Icone: MessageCircle (lucide-react)
- Variante: `outline` (secundario ao botao Seguir)
- Mobile: Apenas icone
- Desktop: Icone + "Mensagem"

## Implementacao

### 1. Adicionar Botao ao Header

```typescript
// apps/web/src/pages/ProfilePublicPage.tsx

import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiHelpers } from '@/lib/api';

// Dentro do componente, adicionar:
const [startingChat, setStartingChat] = useState(false);

async function handleStartChat() {
  if (!currentUser || !data?.profile?.handle) return;

  setStartingChat(true);
  try {
    // API: criar ou buscar thread existente
    const res = await apiHelpers.getOrCreateThread({
      participantHandle: data.profile.handle,
    });

    navigate(`/app/chat/${res.threadId}`);
  } catch (e) {
    console.error('Error starting chat:', e);
    toast.error('Erro ao iniciar conversa');
  } finally {
    setStartingChat(false);
  }
}

// No JSX, ao lado do botao Seguir:
{currentUser && !isOwnProfile && (
  <div className="flex gap-2">
    <Button
      variant="outline"
      onClick={handleStartChat}
      disabled={startingChat}
    >
      <MessageCircle className="h-4 w-4" />
      <span className="hidden sm:inline ml-2">Mensagem</span>
    </Button>

    <Button onClick={onFollowToggle} aria-live="polite">
      {isFollowing ? 'Deixar de seguir' : 'Seguir'}
    </Button>
  </div>
)}
```

### 2. API: Get or Create Thread

Verificar se endpoint ja existe ou criar:

```typescript
// apps/api/src/chat/routes/chat.threads.ts

// Endpoint: POST /chat/threads/dm
// Body: { participantHandle: string }
// Response: { threadId: string, created: boolean }

router.post('/dm', async (req, res) => {
  const { participantHandle } = req.body;
  const myProfileId = req.user.profileId;

  // Buscar profile do participante
  const participant = await prisma.profile.findUnique({
    where: { handle: participantHandle },
  });

  if (!participant) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Buscar thread existente (DM entre os dois)
  const existingThread = await prisma.chatThread.findFirst({
    where: {
      kind: 'dm',
      participants: {
        every: {
          profileId: { in: [myProfileId, participant.id] },
        },
      },
    },
  });

  if (existingThread) {
    return res.json({ threadId: existingThread.id, created: false });
  }

  // Criar nova thread
  const newThread = await prisma.chatThread.create({
    data: {
      kind: 'dm',
      participants: {
        create: [
          { profileId: myProfileId },
          { profileId: participant.id },
        ],
      },
    },
  });

  return res.json({ threadId: newThread.id, created: true });
});
```

### 3. Helper no Frontend

```typescript
// apps/web/src/lib/api.ts

// Adicionar ao apiHelpers:
getOrCreateThread: async (data: { participantHandle: string }) => {
  const res = await fetchWithAuth('/chat/threads/dm', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
},
```

## Arquivos a Criar/Modificar

### Criar
- Nenhum arquivo novo necessario

### Modificar
- `apps/web/src/pages/ProfilePublicPage.tsx` - Adicionar botao
- `apps/web/src/lib/api.ts` - Adicionar helper
- `apps/api/src/chat/routes/chat.threads.ts` - Endpoint DM (se nao existir)

## Consideracoes

### Privacidade
- Por padrao, todos podem iniciar conversa
- Futuro: Permitir configuracao "Quem pode me enviar mensagens" (todos, seguidores, ninguem)

### Performance
- Cache de threads existentes no frontend para evitar requests repetidos

## Testes

- [ ] Botao aparece apenas para outros usuarios (nao proprio perfil)
- [ ] Botao nao aparece se nao logado
- [ ] Click cria thread e navega corretamente
- [ ] Se thread ja existe, navega sem criar nova
- [ ] Estado de loading funciona
- [ ] Erro exibe toast
