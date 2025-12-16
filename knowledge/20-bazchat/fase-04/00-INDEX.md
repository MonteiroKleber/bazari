# BazChat - Fase 04: UX Polishing & Notifications

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados ou fake data
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** hardcodar valores que deveriam ser dinamicos
- **NAO** assumir comportamentos - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Visao Geral

Esta fase foca em **polimento de UX** e **notificacoes** para tornar o BazChat mais profissional e engajador.

## Objetivo

Adicionar notificacoes push/som, melhorar navegacao e interacoes, e polir a experiencia geral do usuario.

## Features da Fase 04

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | Push Notifications | Media | Alto | [01-PUSH-NOTIFICATIONS.md](./01-PUSH-NOTIFICATIONS.md) |
| 2 | Notification Sound | Baixa | Alto | [02-NOTIFICATION-SOUND.md](./02-NOTIFICATION-SOUND.md) |
| 3 | Unread Badge | Baixa | Alto | [03-UNREAD-BADGE.md](./03-UNREAD-BADGE.md) |
| 4 | Date Separators | Baixa | Medio | [04-DATE-SEPARATORS.md](./04-DATE-SEPARATORS.md) |
| 5 | Scroll to Bottom FAB | Baixa | Medio | [05-SCROLL-TO-BOTTOM.md](./05-SCROLL-TO-BOTTOM.md) |
| 6 | Swipe to Reply | Media | Alto | [06-SWIPE-TO-REPLY.md](./06-SWIPE-TO-REPLY.md) |
| 7 | Edit/Delete Messages | Media | Medio | [07-EDIT-DELETE-MESSAGES.md](./07-EDIT-DELETE-MESSAGES.md) |
| 8 | Image Lightbox | Baixa | Medio | [08-IMAGE-LIGHTBOX.md](./08-IMAGE-LIGHTBOX.md) |
| 9 | Link Preview | Media | Medio | [09-LINK-PREVIEW.md](./09-LINK-PREVIEW.md) |
| 10 | Block User | Media | Alto | [10-BLOCK-USER.md](./10-BLOCK-USER.md) |

## Arquitetura Atual (Referencia)

### Frontend
```
apps/web/src/
├── components/chat/
│   ├── MessageBubble.tsx      # Bolha de mensagem
│   ├── MessageList.tsx        # Lista de mensagens
│   ├── ChatComposer.tsx       # Input de mensagem
│   ├── ThreadItem.tsx         # Item na lista de conversas
│   ├── AudioPlayer.tsx        # Player de audio
│   ├── VoiceRecorder.tsx      # Gravador de voz
│   ├── GifPicker.tsx          # Seletor de GIFs
│   ├── FormattedText.tsx      # Formatacao markdown
│   ├── ReactionBar.tsx        # Barra de reacoes
│   ├── QuotedMessage.tsx      # Quote/reply
│   ├── TypingIndicator.tsx    # Indicador de digitacao
│   ├── SearchMessages.tsx     # Busca de mensagens
│   ├── ChatSettings.tsx       # Configuracoes E2EE
│   └── ...
├── pages/chat/
│   ├── ChatInboxPage.tsx      # Lista de conversas
│   ├── ChatThreadPage.tsx     # Tela de conversa
│   └── GroupAdminPage.tsx     # Admin de grupos
├── hooks/
│   └── useChat.ts             # Estado global (Zustand)
└── lib/chat/
    ├── websocket.ts           # Cliente WebSocket
    └── crypto.ts              # E2EE com libsodium
```

### Backend
```
apps/api/src/chat/
├── routes/
│   ├── chat.messages.ts       # Mensagens REST
│   ├── chat.threads.ts        # Threads REST
│   ├── chat.groups.ts         # Grupos REST
│   ├── chat.gifs.ts           # Proxy Tenor
│   ├── chat.reactions.ts      # Reacoes
│   └── chat.upload.ts         # Upload de midia
├── services/
│   └── chat.ts                # Logica de negocio
└── ws/
    └── handlers.ts            # WebSocket handlers
```

## Dependencias Entre Features

```
┌─────────────────────┐
│ Push Notifications  │ ──┐
└─────────────────────┘   │
                          ├── Notificacoes (independentes entre si)
┌─────────────────────┐   │
│ Notification Sound  │ ──┘
└─────────────────────┘

┌─────────────────────┐
│ Unread Badge        │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Date Separators     │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Scroll to Bottom    │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Swipe to Reply      │ ── depende de Reply/Quote (ja implementado)
└─────────────────────┘

┌─────────────────────┐
│ Edit/Delete Msgs    │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Image Lightbox      │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Link Preview        │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Block User          │ (independente)
└─────────────────────┘
```

## Ordem de Implementacao Sugerida

### Bloco 1: Notificacoes (Alto Impacto)
1. **Push Notifications** - Notificacoes do sistema
2. **Notification Sound** - Som ao receber mensagem
3. **Unread Badge** - Contador no menu

### Bloco 2: UX de Navegacao
4. **Scroll to Bottom FAB** - Botao flutuante
5. **Date Separators** - Separadores de data
6. **Swipe to Reply** - Gesto mobile

### Bloco 3: Gerenciamento de Mensagens
7. **Edit/Delete Messages** - Editar e apagar
8. **Image Lightbox** - Visualizacao de imagens
9. **Link Preview** - Cards de preview

### Bloco 4: Privacidade
10. **Block User** - Bloquear usuarios

## Prompts de Implementacao

Cada feature tem prompts especificos na pasta [prompts/](./prompts/):
- [PROMPT-01-PUSH-NOTIFICATIONS.md](./prompts/PROMPT-01-PUSH-NOTIFICATIONS.md)
- [PROMPT-02-NOTIFICATION-SOUND.md](./prompts/PROMPT-02-NOTIFICATION-SOUND.md)
- [PROMPT-03-UNREAD-BADGE.md](./prompts/PROMPT-03-UNREAD-BADGE.md)
- [PROMPT-04-DATE-SEPARATORS.md](./prompts/PROMPT-04-DATE-SEPARATORS.md)
- [PROMPT-05-SCROLL-TO-BOTTOM.md](./prompts/PROMPT-05-SCROLL-TO-BOTTOM.md)
- [PROMPT-06-SWIPE-TO-REPLY.md](./prompts/PROMPT-06-SWIPE-TO-REPLY.md)
- [PROMPT-07-EDIT-DELETE-MESSAGES.md](./prompts/PROMPT-07-EDIT-DELETE-MESSAGES.md)
- [PROMPT-08-IMAGE-LIGHTBOX.md](./prompts/PROMPT-08-IMAGE-LIGHTBOX.md)
- [PROMPT-09-LINK-PREVIEW.md](./prompts/PROMPT-09-LINK-PREVIEW.md)
- [PROMPT-10-BLOCK-USER.md](./prompts/PROMPT-10-BLOCK-USER.md)

## Metricas de Sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Notificacoes | Nenhuma | Push + Som |
| Mensagens nao lidas | Sem indicador global | Badge no menu |
| Contexto temporal | Scroll para ver datas | Separadores visuais |
| Navegacao | Scroll manual | FAB + Swipe |
| Gerenciamento | Sem opcoes | Edit/Delete |
| Privacidade | Sem bloqueio | Block user |

## Proximas Fases

- **Fase 05**: Chamadas de Voz/Video (WebRTC)
- **Fase 06**: Integracao Commerce (Pagamentos no chat)
