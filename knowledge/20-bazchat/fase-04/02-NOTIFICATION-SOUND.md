# Feature: Notification Sound

## Objetivo

Tocar um som de alerta quando o usuario recebe uma nova mensagem.

## Requisitos Funcionais

### Comportamento
- Som toca quando:
  - Usuario recebe mensagem nova
  - Thread nao esta mutada
  - Som global esta habilitado

- Som NAO toca quando:
  - Usuario enviou a mensagem (isMe)
  - Thread esta mutada (preference.isMuted)
  - Som global esta desabilitado
  - Dispositivo esta em modo silencioso (respeitado automaticamente pelo browser)

### Tipos de Som
- Som padrao para mensagens de texto/imagem/video/arquivo
- Som diferente para mensagens de voz (opcional)
- Volume fixo (controlado pelo sistema)

## Implementacao

### 1. Arquivo de Audio

Criar ou baixar um som curto (< 1 segundo) para notificacao.
Formato recomendado: MP3 ou OGG (melhor compatibilidade).

```
apps/web/public/sounds/
├── notification.mp3      # Som padrao (~15KB)
└── notification.ogg      # Fallback
```

Sons sugeridos (royalty-free):
- https://notificationsounds.com/message-tones
- Tom curto, agradavel, nao intrusivo

### 2. Utilitario de Som

```typescript
// apps/web/src/lib/sounds.ts

class NotificationSound {
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio('/sounds/notification.mp3');
      this.audio.volume = 0.5; // 50% volume
      this.audio.preload = 'auto';

      // Carregar preferencia do localStorage
      const stored = localStorage.getItem('chat_sound_enabled');
      this.enabled = stored !== 'false';
    }
  }

  play(): void {
    if (!this.enabled || !this.audio) return;

    // Reset para permitir tocar novamente rapidamente
    this.audio.currentTime = 0;

    this.audio.play().catch((err) => {
      // Autoplay pode ser bloqueado pelo browser
      console.warn('[Sound] Could not play notification sound:', err);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('chat_sound_enabled', String(enabled));
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const notificationSound = new NotificationSound();
```

### 3. Integracao no useChat

```typescript
// apps/web/src/hooks/useChat.ts

import { notificationSound } from '@/lib/sounds';

// No handler de nova mensagem:
case 'message': {
  const message = data.message;
  const isMe = message.from === get().currentProfileId;

  // ... logica existente ...

  // Som de notificacao
  if (!isMe) {
    const preference = get().threadPreferences.get(message.threadId);
    if (!preference?.isMuted) {
      notificationSound.play();
    }
  }
  break;
}
```

### 4. UI no ChatSettings

```typescript
// apps/web/src/components/chat/ChatSettings.tsx

import { notificationSound } from '@/lib/sounds';

// Adicionar no dialog:
<div className="flex items-center justify-between p-3 border rounded-lg">
  <div className="flex items-center gap-3">
    <Volume2 className="h-5 w-5 text-muted-foreground" />
    <div>
      <h4 className="text-sm font-medium">Som de Notificacao</h4>
      <p className="text-xs text-muted-foreground">
        Tocar som ao receber mensagens
      </p>
    </div>
  </div>
  <Switch
    checked={soundEnabled}
    onCheckedChange={(checked) => {
      setSoundEnabled(checked);
      notificationSound.setEnabled(checked);
    }}
  />
</div>
```

### 5. Preload do Audio

Para evitar delay na primeira reproducao:

```typescript
// apps/web/src/App.tsx ou main.tsx

// Preload do som ao iniciar o app
useEffect(() => {
  // Preload silencioso para cache
  const audio = new Audio('/sounds/notification.mp3');
  audio.volume = 0;
  audio.play().then(() => audio.pause()).catch(() => {});
}, []);
```

## Consideracoes

### Autoplay Policy
Browsers modernos bloqueiam autoplay de audio ate que o usuario interaja com a pagina. O som so vai funcionar apos a primeira interacao do usuario (click, touch, etc).

### Mobile
Em dispositivos moveis, o som respeita as configuracoes de volume e modo silencioso do sistema.

### Debounce
Se varias mensagens chegarem rapidamente, considerar um debounce para nao tocar varios sons em sequencia:

```typescript
private lastPlayed: number = 0;
private debounceMs: number = 1000;

play(): void {
  if (!this.enabled || !this.audio) return;

  const now = Date.now();
  if (now - this.lastPlayed < this.debounceMs) return;

  this.lastPlayed = now;
  this.audio.currentTime = 0;
  this.audio.play().catch(console.warn);
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/public/sounds/notification.mp3` - Arquivo de audio
- `apps/web/src/lib/sounds.ts` - Utilitario de som

### Modificar
- `apps/web/src/hooks/useChat.ts` - Tocar som ao receber mensagem
- `apps/web/src/components/chat/ChatSettings.tsx` - Toggle de som

## Testes

- [ ] Som toca ao receber mensagem
- [ ] Som NAO toca para proprias mensagens
- [ ] Som NAO toca para threads mutadas
- [ ] Toggle no ChatSettings funciona
- [ ] Preferencia persiste apos refresh
- [ ] Funciona em mobile
