# Prompt Master: BazChat Fase 04 - UX Polishing & Notifications

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados ou fake data
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** hardcodar valores que deveriam ser dinamicos
- **NAO** assumir comportamentos - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Contexto

O BazChat ja possui as funcionalidades das Fases 01-03:
- Fase 01: Typing Indicator, Message Status, Visual Bubbles, Pin/Archive
- Fase 02: Reply/Quote, Reactions, Search, Online Status
- Fase 03: Voice Messages, GIFs, Text Formatting

Esta fase (04) adiciona polimento de UX e notificacoes.

## Features da Fase 04

### Bloco 1: Notificacoes (Alto Impacto)
1. **Push Notifications** - Notificacoes do sistema ao receber mensagem
2. **Notification Sound** - Som ao receber mensagem
3. **Unread Badge** - Contador no menu principal

### Bloco 2: UX de Navegacao
4. **Scroll to Bottom FAB** - Botao flutuante com badge de novas msgs
5. **Date Separators** - Separadores "Hoje", "Ontem", etc
6. **Swipe to Reply** - Gesto mobile para responder

### Bloco 3: Gerenciamento de Mensagens
7. **Edit/Delete Messages** - Editar e apagar mensagens
8. **Image Lightbox** - Visualizacao de imagens em tela cheia
9. **Link Preview** - Cards de preview para URLs

### Bloco 4: Privacidade
10. **Block User** - Bloquear usuarios

## Arquitetura Atual

```
apps/web/src/
├── components/chat/       # Componentes de chat
├── pages/chat/            # Paginas de chat
├── hooks/useChat.ts       # Estado global
└── lib/chat/              # WebSocket, crypto

apps/api/src/chat/
├── routes/                # Endpoints REST
├── services/              # Logica de negocio
└── ws/                    # WebSocket handlers
```

## Instrucoes

1. Leia a especificacao da feature em `knowledge/20-bazchat/fase-04/`
2. Implemente seguindo a ordem sugerida
3. Teste manualmente cada feature
4. Faca commit atomico por feature

## Referencias

- Especificacoes: `knowledge/20-bazchat/fase-04/*.md`
- Prompts individuais: `knowledge/20-bazchat/fase-04/prompts/PROMPT-*.md`
