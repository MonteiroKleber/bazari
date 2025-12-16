# Prompt: Implementar Status/Stories

## Contexto

Voce esta trabalhando no BazChat, o sistema de chat do Bazari. Precisamos implementar a feature de Status/Stories - conteudo efemero que desaparece apos 24 horas.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-05/01-STATUS-STORIES.md`

## Tarefa

Implementar o sistema de Status/Stories seguindo a especificacao.

## Ordem de Implementacao

### 1. Backend - Schema
- Adicionar modelos `Story`, `StoryView`, `StoryReply` no Prisma
- Executar migration

### 2. Backend - Endpoints
- Criar arquivo `apps/api/src/routes/stories.ts`
- Implementar endpoints:
  - `POST /stories` - Criar story
  - `GET /stories/feed` - Feed de stories dos contatos
  - `GET /stories/mine` - Meus stories com visualizacoes
  - `POST /stories/:id/view` - Registrar visualizacao
  - `POST /stories/:id/reply` - Responder story
  - `DELETE /stories/:id` - Deletar story

### 3. Backend - Cron Job
- Criar `apps/api/src/jobs/expire-stories.ts`
- Configurar execucao periodica

### 4. Frontend - Componentes
- `StoriesBar.tsx` - Barra horizontal no topo do inbox
- `StoryViewer.tsx` - Visualizador fullscreen
- `StoryCreator.tsx` - Criacao de story (texto/midia)

### 5. Frontend - Integracao
- Adicionar StoriesBar na ChatInboxPage
- Adicionar rotas/modais para viewer e creator

## Requisitos

- Stories expiram automaticamente apos 24h
- Apenas contatos (pessoas com DM) veem seus stories
- Visualizacoes sao rastreadas
- Resposta a story cria mensagem DM
- Upload de midia via IPFS existente

## Arquivos Principais

```
apps/api/
├── prisma/schema.prisma          # Modelos
├── src/routes/stories.ts         # Endpoints
└── src/jobs/expire-stories.ts    # Cron

apps/web/src/components/chat/
├── StoriesBar.tsx
├── StoryViewer.tsx
└── StoryCreator.tsx
```

## Checklist

- [ ] Schema atualizado e migration executada
- [ ] Endpoints funcionando
- [ ] StoriesBar mostra stories dos contatos
- [ ] StoryViewer com progress bar e navegacao
- [ ] StoryCreator para texto e midia
- [ ] Visualizacoes registradas
- [ ] Expiracoes funcionando
