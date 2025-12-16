# Prompt: Implementar Notification Sound

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** usar valores hardcoded que deveriam vir do banco/API
- **NAO** assumir como algo deve funcionar - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Objetivo

Implementar som de notificacao ao receber novas mensagens no BazChat.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-04/02-NOTIFICATION-SOUND.md`

## Ordem de Implementacao

### Etapa 1: Adicionar Arquivo de Som

1. Baixar som de notificacao (formato MP3/WAV)
2. Adicionar em `apps/web/public/sounds/notification.mp3`

### Etapa 2: Criar Sound Service

Criar `apps/web/src/lib/chat/sounds.ts`:

```typescript
class ChatSoundService {
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  private lastPlayTime: number = 0;
  private debounceMs: number = 1000;

  constructor() {
    this.audio = new Audio('/sounds/notification.mp3');
    this.audio.volume = 0.5;
  }

  play(): void {
    if (!this.enabled) return;

    const now = Date.now();
    if (now - this.lastPlayTime < this.debounceMs) return;

    this.lastPlayTime = now;
    this.audio?.play().catch(() => {});
  }

  setEnabled(enabled: boolean): void;
  setVolume(volume: number): void;
}

export const chatSoundService = new ChatSoundService();
```

### Etapa 3: Integrar com WebSocket

Modificar `apps/web/src/lib/chat/websocket.ts`:

1. Importar `chatSoundService`
2. No handler de `chat:message`:
   - Verificar se mensagem e de outro usuario
   - Chamar `chatSoundService.play()`

### Etapa 4: Configuracoes de Som

Adicionar ao menu de configuracoes:

- Toggle para habilitar/desabilitar som
- Slider de volume (opcional)
- Persistir em localStorage

### Etapa 5: Auto-play Policy

Implementar unlock de audio:

```typescript
// Primeiro clique do usuario desbloqueia audio
document.addEventListener('click', () => {
  chatSoundService.unlock();
}, { once: true });
```

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/public/sounds/notification.mp3`
- [ ] `apps/web/src/lib/chat/sounds.ts`

### Modificar
- [ ] `apps/web/src/lib/chat/websocket.ts`
- [ ] `apps/web/src/App.tsx` (audio unlock)

## Cenarios de Teste

1. [ ] Som toca ao receber mensagem
2. [ ] Som nao toca para mensagens proprias
3. [ ] Debounce funciona (multiplas mensagens rapidas)
4. [ ] Toggle de configuracao funciona
5. [ ] Volume ajustavel
6. [ ] Auto-play policy respeitada

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): add notification sound

- Add notification.mp3 sound file
- Create ChatSoundService with debounce
- Play sound on new message from others
- Add sound settings toggle and volume control"
```
