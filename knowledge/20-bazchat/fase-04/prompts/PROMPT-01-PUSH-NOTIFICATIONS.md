# Prompt: Implementar Push Notifications

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

Implementar notificacoes push do sistema quando o usuario receber mensagens no BazChat.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-04/01-PUSH-NOTIFICATIONS.md`

## Ordem de Implementacao

### Etapa 1: Criar Notification Service

Criar `apps/web/src/lib/chat/notifications.ts`:

```typescript
class ChatNotificationService {
  private permission: NotificationPermission = 'default';

  async requestPermission(): Promise<boolean>;
  async showNotification(title: string, options: NotificationOptions): Promise<void>;
  private isTabFocused(): boolean;
}
```

### Etapa 2: Hook de Notificacao

Criar `apps/web/src/hooks/useNotifications.ts`:

```typescript
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const requestPermission = async () => {...};
  const showNotification = (title: string, body: string, options?: {...}) => {...};

  return { permission, requestPermission, showNotification };
}
```

### Etapa 3: Integrar com WebSocket

Modificar `apps/web/src/lib/chat/websocket.ts`:

1. Importar notification service
2. No handler de `chat:message`:
   - Verificar se mensagem e de outro usuario
   - Verificar se tab nao esta focada
   - Chamar `showNotification()`

### Etapa 4: UI de Permissao

Criar componente `NotificationPermissionBanner.tsx`:

- Exibir banner se permission === 'default'
- Botao "Ativar notificacoes"
- Botao "Agora nao" (dismiss)

### Etapa 5: Configuracoes

Adicionar ao menu de configuracoes:

- Toggle para habilitar/desabilitar notificacoes
- Persistir em localStorage

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/lib/chat/notifications.ts`
- [ ] `apps/web/src/hooks/useNotifications.ts`
- [ ] `apps/web/src/components/chat/NotificationPermissionBanner.tsx`

### Modificar
- [ ] `apps/web/src/lib/chat/websocket.ts`
- [ ] `apps/web/src/pages/chat/ChatInboxPage.tsx`

## Cenarios de Teste

1. [ ] Permissao solicitada apenas uma vez
2. [ ] Notificacao nao aparece se tab focada
3. [ ] Notificacao nao aparece se mensagem propria
4. [ ] Clicar na notificacao abre a conversa
5. [ ] Toggle de configuracao funciona
6. [ ] Multiplas mensagens agrupam notificacoes

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): implement push notifications

- Add ChatNotificationService for browser notifications
- Create useNotifications hook
- Show notification on new message when tab not focused
- Add permission banner and settings toggle"
```
