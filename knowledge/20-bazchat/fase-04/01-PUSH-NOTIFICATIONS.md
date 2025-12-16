# Feature: Push Notifications

## Objetivo

Enviar notificacoes do sistema quando o usuario recebe uma nova mensagem, mesmo com o app em background ou minimizado.

## Requisitos Funcionais

### Comportamento
- Notificacao aparece quando:
  - Usuario recebe mensagem nova
  - App esta em background OU aba nao esta focada
  - Conversa nao esta aberta (activeThreadId != threadId)
  - Thread nao esta mutada

- Notificacao NAO aparece quando:
  - Usuario enviou a mensagem (isMe)
  - Thread esta mutada (preference.isMuted)
  - Conversa esta aberta e visivel
  - Notificacoes estao desabilitadas globalmente

### Conteudo da Notificacao
- Titulo: Nome do remetente ou nome do grupo
- Corpo: Preview da mensagem (truncado 100 chars)
  - Texto: conteudo plaintext
  - Audio: "Mensagem de voz"
  - Imagem: "Enviou uma imagem"
  - Video: "Enviou um video"
  - Arquivo: "Enviou um arquivo"
  - GIF: "Enviou um GIF"
- Icone: Avatar do remetente (se disponivel) ou icone do app
- Badge: Contador de mensagens nao lidas

### Acoes
- Click na notificacao: Abre a conversa correspondente
- Fechar: Dismiss sem acao

## Implementacao

### 1. Service Worker (PWA)

O app ja tem PWA configurado. Precisamos:

```typescript
// apps/web/public/sw.js ou service-worker.ts
self.addEventListener('push', (event) => {
  const data = event.data?.json();

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.threadId, // Agrupa notificacoes da mesma thread
    renotify: true,
    data: {
      threadId: data.threadId,
      url: `/app/chat/${data.threadId}`,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/app/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Se ja tem uma aba aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes('/app') && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Senao, abre nova aba
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
```

### 2. Frontend - Solicitar Permissao

```typescript
// apps/web/src/lib/notifications.ts

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function canShowNotification(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}
```

### 3. Frontend - Mostrar Notificacao Local

Para notificacoes quando app esta aberto mas aba nao focada:

```typescript
// apps/web/src/lib/notifications.ts

interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  threadId: string;
}

export function showLocalNotification(data: NotificationData): void {
  if (!canShowNotification()) return;

  // Verificar se aba esta focada
  if (document.hasFocus()) return;

  const notification = new Notification(data.title, {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    tag: data.threadId,
    renotify: true,
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = `/app/chat/${data.threadId}`;
    notification.close();
  };

  // Auto-close apos 5 segundos
  setTimeout(() => notification.close(), 5000);
}
```

### 4. Integracao no useChat

```typescript
// apps/web/src/hooks/useChat.ts

// No handler de nova mensagem:
case 'message': {
  const message = data.message;
  const isMe = message.from === get().currentProfileId;
  const isActiveThread = message.threadId === get().activeThreadId;

  // ... logica existente de adicionar mensagem ...

  // Notificacao
  if (!isMe && !isActiveThread) {
    const thread = get().threads.find(t => t.id === message.threadId);
    const preference = get().threadPreferences.get(message.threadId);

    if (!preference?.isMuted) {
      const senderData = thread?.participantsData?.find(p => p.profileId === message.from);
      const title = thread?.kind === 'group'
        ? thread.name || 'Grupo'
        : senderData?.name || senderData?.handle || 'Nova mensagem';

      const body = getMessagePreview(message);

      showLocalNotification({
        title,
        body,
        icon: senderData?.avatarUrl,
        threadId: message.threadId,
      });
    }
  }
  break;
}

function getMessagePreview(message: ChatMessage): string {
  if (message.type === 'audio') return 'Mensagem de voz';
  if (message.type === 'image') return 'Enviou uma imagem';
  if (message.type === 'video') return 'Enviou um video';
  if (message.type === 'file') return 'Enviou um arquivo';

  const plaintext = (message as any).plaintext || '';
  if (plaintext.length > 100) {
    return plaintext.substring(0, 100) + '...';
  }
  return plaintext || 'Nova mensagem';
}
```

### 5. UI para Solicitar Permissao

Adicionar no ChatSettings ou no primeiro acesso:

```typescript
// Componente para solicitar permissao
function NotificationPermissionBanner() {
  const [permission, setPermission] = useState(Notification.permission);

  if (permission === 'granted' || permission === 'denied') {
    return null;
  }

  return (
    <div className="p-4 bg-muted rounded-lg">
      <p>Ative as notificacoes para nao perder mensagens</p>
      <Button onClick={async () => {
        const granted = await requestNotificationPermission();
        setPermission(granted ? 'granted' : 'denied');
      }}>
        Ativar Notificacoes
      </Button>
    </div>
  );
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/lib/notifications.ts` - Utilitarios de notificacao

### Modificar
- `apps/web/src/hooks/useChat.ts` - Integrar notificacoes no handler
- `apps/web/src/components/chat/ChatSettings.tsx` - Opcao de ativar/desativar
- `apps/web/public/sw.js` ou service worker - Handler de push

## Testes

- [ ] Notificacao aparece quando app em background
- [ ] Notificacao NAO aparece para proprias mensagens
- [ ] Notificacao NAO aparece para threads mutadas
- [ ] Click na notificacao abre a conversa
- [ ] Permissao solicitada apenas uma vez
- [ ] Funciona em mobile (PWA)
