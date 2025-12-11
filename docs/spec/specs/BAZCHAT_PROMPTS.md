# Prompts para Implementação do BazChat - Claude Code

**Versão**: 1.0.0
**Data**: 2025-10-12
**Documento Base**: `BAZCHAT_IMPLEMENTATION.md`
**Repositório**: `~/bazari`

---

## 📋 Índice de Prompts

1. [Prompt Inicial (Validação)](#prompt-inicial-validação)
2. [FASE 0: Preparação e Infraestrutura](#fase-0-preparação-e-infraestrutura)
3. [FASE 1: Chat Básico (DM Texto E2EE)](#fase-1-chat-básico-dm-texto-e2ee)
4. [FASE 2: Mídia e Grupos](#fase-2-mídia-e-grupos)
5. [FASE 3: Comércio no Chat](#fase-3-comércio-no-chat)
6. [FASE 4: IA Local (OSS)](#fase-4-ia-local-oss)
7. [FASE 5: Monetização Avançada](#fase-5-monetização-avançada)
8. [FASE 6: WebRTC (Voz/Vídeo)](#fase-6-webrtc-vozvídeo)
9. [FASE 7: Funcionalidades Sociais](#fase-7-funcionalidades-sociais)
10. [FASE 8: Polimento e Otimização](#fase-8-polimento-e-otimização)
11. [Prompts de Validação e Testes](#prompts-de-validação-e-testes)

---

## 🚀 Como Usar Este Documento

### Fluxo Recomendado:

1. **Copie o prompt** da fase desejada
2. **Cole no Claude Code**
3. **Aguarde a implementação completa**
4. **Execute o prompt de validação**
5. **Passe para a próxima fase**

### Observações:

- ✅ Cada prompt é **autocontido** (não precisa de contexto adicional)
- ✅ Claude Code vai **ler o documento automaticamente**
- ✅ Os prompts incluem **validação e checklist**
- ✅ Estratégia de **MOCK** para blockchain (Fases 3, 5, 7)

---

## Prompt Inicial (Validação)

### 📌 Use ESTE prompt ANTES de começar qualquer fase

```
Ler e validar o ambiente para implementação do BazChat:

1. Ler ~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md
2. Ler ~/bazari/docs/specs/BAZCHAT_BLOCKCHAIN_REQUIREMENTS.md
3. Verificar estrutura atual do projeto ~/bazari
4. Confirmar se dependências básicas estão instaladas (pnpm, PostgreSQL, Redis)
5. Verificar se API e Web buildáveis sem erros
6. Listar o que está pronto e o que falta para começar

Objetivo: Garantir que o ambiente está preparado para implementar o BazChat.

NÃO implementar nada ainda, apenas validar e reportar.
```

### ✅ Resultado Esperado:
- Lista de dependências instaladas
- Status do build da API e Web
- Confirmação de que pode começar
- Lista de eventuais problemas

---

## FASE 0: Preparação e Infraestrutura

### 📌 Tempo Estimado: 4-6 horas

```
Implementar FASE 0 (Preparação e Infraestrutura) do documento:
~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md

Executar na ordem:
1. Adicionar dependências (@fastify/websocket, ws, libsodium-wrappers)
2. Criar estrutura de pastas completa (backend e frontend)
3. Criar package shared-types com tipos TypeScript
4. Adicionar variáveis de ambiente (.env para API e Web)
5. Criar configs (apps/api/src/config/env.ts e apps/web/src/lib/config/chat.ts)
6. Criar migrations Prisma (ChatThread, ChatMessage, etc.)
7. Atualizar schema Prisma
8. Rodar pnpm install
9. Rodar pnpm prisma generate
10. Rodar pnpm prisma migrate dev

Validações:
- Build da API funciona (pnpm --filter @bazari/api build)
- Build do Web funciona (pnpm --filter @bazari/web build)
- Nenhuma regressão em funcionalidades existentes

IMPORTANTE:
- NÃO commitar valores sensíveis no .env
- NÃO criar lógica de negócio ainda (apenas estrutura)
- NÃO alterar código existente de posts, feed, perfis

Ao final, executar checklist de validação da FASE 0.
```

### ✅ Resultado Esperado:
- Dependências instaladas
- Estrutura de pastas criada
- Package `shared-types` configurado
- Migrations aplicadas
- Builds funcionando

---

## FASE 1: Chat Básico (DM Texto E2EE)

### 📌 Tempo Estimado: 8-12 horas

```
Implementar FASE 1 (Chat Básico - DM Texto E2EE) do documento:
~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md

Executar na ordem:

### Backend:
1. Criar apps/api/src/chat/ws/server.ts (WebSocket server setup)
2. Criar apps/api/src/chat/ws/handlers.ts (Message handlers)
3. Criar apps/api/src/chat/ws/events.ts (EventBus)
4. Criar apps/api/src/chat/routes/chat.threads.ts (REST endpoints)
5. Criar apps/api/src/chat/routes/chat.messages.ts (REST endpoints)
6. Criar apps/api/src/chat/services/chat.ts (Business logic)
7. Registrar rotas e WebSocket no apps/api/src/server.ts

### Frontend:
1. Criar apps/web/src/lib/chat/crypto.ts (Cliente E2EE)
2. Criar apps/web/src/lib/chat/websocket.ts (WebSocket client)
3. Criar apps/web/src/hooks/useChat.ts (Zustand store)
4. Atualizar apps/web/src/lib/api.ts (API helpers de chat)
5. Criar apps/web/src/pages/chat/ChatInboxPage.tsx
6. Criar apps/web/src/pages/chat/ChatThreadPage.tsx
7. Criar apps/web/src/components/chat/ThreadItem.tsx
8. Criar apps/web/src/components/chat/MessageList.tsx
9. Criar apps/web/src/components/chat/MessageBubble.tsx
10. Criar apps/web/src/components/chat/ChatComposer.tsx
11. Adicionar rotas no apps/web/src/App.tsx
12. Inicializar chat no apps/web/src/App.tsx (useEffect)

Seguir EXATAMENTE o código do documento (copiar e colar se necessário).

Validações:
- WebSocket conecta com autenticação
- E2EE funciona (mensagens cifradas/decifradas)
- DM funciona entre dois usuários
- Inbox atualiza em tempo real
- Reconexão automática funciona

Ao final, executar checklist de validação da FASE 1.
```

### ✅ Resultado Esperado:
- WebSocket server funcionando
- Cliente E2EE operacional
- DMs funcionando com E2EE
- UI básica de chat
- Testes manuais passando

---

## FASE 2: Mídia e Grupos

### 📌 Tempo Estimado: 12-16 horas

```
Implementar FASE 2 (Mídia e Grupos) do documento:
~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md

ATENÇÃO: A FASE 2 NÃO está completamente especificada no documento atual.
Implementar com base nos padrões da FASE 1 e seguinte estrutura:

### Backend - Mídia:
1. Criar apps/api/src/chat/routes/chat.upload.ts
   - POST /chat/upload (multipart)
   - Upload cifrado para IPFS
   - Retornar CID

2. Criar apps/api/src/chat/services/ipfs.ts
   - uploadEncrypted(file, encryptionKey)
   - getDecrypted(cid, encryptionKey)

### Frontend - Mídia:
1. Criar apps/web/src/components/chat/ChatMediaPreview.tsx
2. Atualizar ChatComposer para incluir upload de mídia
3. Atualizar MessageBubble para renderizar mídia

### Backend - Grupos:
1. Criar apps/api/src/chat/routes/chat.groups.ts
   - POST /chat/groups (criar grupo)
   - GET /chat/groups/:id (detalhes)
   - POST /chat/groups/:id/invite (convidar)
   - PUT /chat/groups/:id/roles (admin)

2. Criar apps/api/src/chat/services/groups.ts
   - createGroup()
   - inviteMember()
   - updateRoles()

### Frontend - Grupos:
1. Criar apps/web/src/pages/chat/ChatGroupPage.tsx
2. Criar apps/web/src/components/chat/GroupSettings.tsx
3. Atualizar useChat para suportar grupos

Usar migrations já criadas na FASE 0 (ChatGroup table).

Validações:
- Upload de imagem cifrada funciona
- Mídia é decifrada e exibida corretamente
- Criar grupo funciona
- Convidar membros funciona
- Mensagens em grupo funcionam

Ao final, validar que mídia e grupos estão operacionais.
```

### ✅ Resultado Esperado:
- Upload de mídia cifrada para IPFS
- Preview de mídia no chat
- Grupos criados e funcionais
- Administração de grupos

---

## FASE 3: Comércio no Chat

### 📌 Tempo Estimado: 16-20 horas

```
Implementar FASE 3 (Comércio no Chat) do documento:
~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md

ESTRATÉGIA: Usar MOCK no PostgreSQL (não blockchain ainda)
Referência: ~/bazari/docs/specs/BAZCHAT_BLOCKCHAIN_REQUIREMENTS.md

Executar na ordem:

### Backend - Mock de Vendas:
1. Criar migration adicional para tabela ChatSale (mock da chain):
   - id, storeId, buyer, seller, promoter
   - amount, commissionPercent, commissionAmount
   - bazariFee, sellerAmount, status, txHash (mock)
   - receiptNftCid, createdAt

2. Criar apps/api/src/chat/services/commission.ts (VERSÃO MOCK):
   - settleSale() - simula split no PostgreSQL
   - mintReceipt() - upload IPFS do recibo
   - emitSaleEvent() - simula evento on-chain

3. Criar apps/api/src/chat/services/reputation.ts (VERSÃO MOCK):
   - updateReputationMock() - atualiza no Profile do PostgreSQL

4. Criar apps/api/src/chat/routes/chat.orders.ts:
   - POST /chat/proposals (criar proposta)
   - POST /chat/checkout (checkout mock)
   - GET /chat/proposals/:id (detalhes)

5. Criar apps/api/src/chat/routes/chat.settings.ts:
   - GET /chat/settings/store/:storeId (políticas)
   - PUT /chat/settings/store/:storeId (atualizar)

### Frontend - Comércio:
1. Criar apps/web/src/components/chat/ProposalCard.tsx
2. Criar apps/web/src/components/chat/CheckoutButton.tsx
3. Atualizar useChat para suportar propostas
4. Atualizar MessageBubble para renderizar propostas

Validações:
- Criar proposta de venda funciona
- Checkout mock funciona (split simulado)
- Recibo NFT é gerado no IPFS
- Reputação é atualizada (mock)
- UI de proposta e checkout funcional

IMPORTANTE: Documentar que esta é versão MOCK, será substituída
por integração real com blockchain posteriormente.

Ao final, validar fluxo completo: proposta → checkout → recibo.
```

### ✅ Resultado Esperado:
- Propostas de venda funcionais
- Checkout mock (split no PostgreSQL)
- Recibo NFT no IPFS
- Reputação atualizada (mock)
- UI completa de comércio

---

## FASE 4: IA Local (OSS)

### 📌 Tempo Estimado: 12-16 horas

```
Implementar FASE 4 (IA Local OSS) do documento:
~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md

ATENÇÃO: Criar novo microserviço apps/ai-gateway

Executar na ordem:

### 1. Criar Microserviço AI Gateway:
1. Criar estrutura:
   apps/ai-gateway/
   ├── src/
   │   ├── server.ts
   │   ├── routes/
   │   │   ├── translate.ts (NLLB/Seamless)
   │   │   ├── stt.ts (Whisper)
   │   │   ├── tts.ts (Coqui-TTS)
   │   │   ├── complete.ts (Llama via vLLM)
   │   │   └── embed.ts (embeddings OSS)
   │   ├── clients/
   │   │   ├── vllm.ts
   │   │   ├── whisper.ts
   │   │   ├── nllb.ts
   │   │   └── tts.ts
   │   └── config/env.ts
   └── package.json

2. Configurar variáveis de ambiente:
   - VLLM_URL (Llama 3 via vLLM)
   - WHISPER_URL (STT)
   - NLLB_URL (tradução)
   - TTS_URL (Coqui-TTS)
   - VECDB_URL (Qdrant ou pgvector)

3. Implementar endpoints:
   - POST /ai/translate
   - POST /ai/stt
   - POST /ai/tts
   - POST /ai/chat-complete
   - POST /ai/embed

### 2. Integração no BazChat API:
1. Criar apps/api/src/chat/routes/ai.ts
   - POST /chat/ai/translate (proxy)
   - POST /chat/ai/transcribe (proxy)
   - POST /chat/ai/suggest (sugestões de resposta)

2. Atualizar chatService para usar IA

### 3. Frontend - IA:
1. Adicionar botões de IA no ChatComposer:
   - Traduzir mensagem
   - Transcrever áudio
   - Sugerir resposta
2. Criar apps/web/src/components/chat/AiAssistant.tsx

Validações:
- Tradução funciona (ex: PT → EN)
- STT funciona (áudio → texto)
- TTS funciona (texto → áudio)
- Sugestões de resposta funcionam
- Busca semântica funciona

IMPORTANTE:
- Usar APENAS modelos OSS (Llama, NLLB, Whisper, Coqui)
- Rodar on-prem (não usar APIs externas)
- Se modelos não disponíveis, criar MOCK que retorna placeholder

Ao final, validar que IA está funcional ou mockada.
```

### ✅ Resultado Esperado:
- Microserviço ai-gateway criado
- Tradução, STT, TTS funcionais (ou mockados)
- Integração com BazChat
- UI de assistente IA

---

## FASE 5: Monetização Avançada

### 📌 Tempo Estimado: 8-12 horas

```
Implementar FASE 5 (Monetização Avançada) do documento:
~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md

ESTRATÉGIA: Usar MOCK no PostgreSQL (não blockchain ainda)

Executar na ordem:

### Backend - Afiliados e Missões:
1. Criar apps/api/src/chat/services/rewards.ts (VERSÃO MOCK):
   - grantCashback() - mock no PostgreSQL
   - redeemCashback() - mock no PostgreSQL
   - createMission() - usar table ChatMission (já criada)
   - completeMission() - validar e dar recompensa

2. Criar apps/api/src/chat/routes/chat.missions.ts:
   - GET /chat/missions (listar missões ativas)
   - POST /chat/missions (criar missão)
   - POST /chat/missions/:id/complete (completar)

3. Criar apps/api/src/chat/routes/chat.opportunities.ts:
   - GET /chat/opportunities (listar vagas/freelances)
   - POST /chat/opportunities (criar)
   - POST /chat/opportunities/:id/apply (candidatar)

4. Criar apps/api/src/chat/routes/chat.ranking.ts:
   - GET /chat/ranking/promoters (top promotores)
   - Criar materialized view no PostgreSQL

### Frontend - Monetização:
1. Criar apps/web/src/pages/chat/ChatSettingsPage.tsx
2. Criar apps/web/src/components/chat/MissionCard.tsx
3. Criar apps/web/src/components/chat/OpportunityCard.tsx
4. Criar apps/web/src/components/chat/PromoterRanking.tsx
5. Criar apps/web/src/components/chat/CashbackWidget.tsx

Validações:
- Criar missão funciona
- Completar missão dá recompensa (mock)
- Cashback é creditado (mock)
- Ranking de promotores funciona
- Oportunidades são listadas

IMPORTANTE: Documentar versão MOCK, será substituída por blockchain.

Ao final, validar fluxo de missões e cashback.
```

### ✅ Resultado Esperado:
- Missões funcionais (mock)
- Cashback operacional (mock)
- Ranking de promotores
- Oportunidades de trabalho
- UI completa de monetização

---

## FASE 6: WebRTC (Voz/Vídeo)

### 📌 Tempo Estimado: 12-16 horas

```
Implementar FASE 6 (WebRTC - Voz/Vídeo) do documento:
~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md

ATENÇÃO: Implementar WebRTC P2P com sinalização via WebSocket

Executar na ordem:

### Backend - Sinalização:
1. Criar apps/api/src/chat/ws/rtc.ts:
   - handleOffer() - relay offer para peer
   - handleAnswer() - relay answer
   - handleIceCandidate() - relay ICE candidates

2. Adicionar tipos de mensagem WS:
   - rtc:offer, rtc:answer, rtc:candidate
   - rtc:call-start, rtc:call-end

3. Criar apps/api/src/chat/routes/chat.calls.ts:
   - POST /chat/calls (iniciar chamada)
   - GET /chat/calls/:id (status)
   - DELETE /chat/calls/:id (encerrar)

### Frontend - WebRTC:
1. Criar apps/web/src/lib/chat/webrtc.ts:
   - createPeerConnection()
   - startCall()
   - answerCall()
   - endCall()

2. Criar apps/web/src/components/chat/CallWidget.tsx
3. Criar apps/web/src/components/chat/CallControls.tsx
4. Criar apps/web/src/pages/chat/CallPage.tsx

5. Adicionar botões de chamada no ChatThread:
   - Chamada de voz
   - Chamada de vídeo

Configurações:
- STUN servers (Google STUN)
- TURN relay (opcional, usar Coturn se disponível)

Validações:
- Chamada de voz P2P funciona
- Chamada de vídeo P2P funciona
- Sinalização via WS funciona
- ICE candidates são trocados
- Fallback via TURN (se configurado)

IMPORTANTE:
- Testar em rede local primeiro
- Se TURN não disponível, apenas P2P local

Ao final, validar chamadas de voz e vídeo.
```

### ✅ Resultado Esperado:
- Sinalização WebRTC via WS
- Chamadas de voz funcionais
- Chamadas de vídeo funcionais
- UI de chamada completa
- Controles (mute, desligar, etc.)

---

## FASE 7: Funcionalidades Sociais

### 📌 Tempo Estimado: 8-12 horas

```
Implementar FASE 7 (Funcionalidades Sociais) do documento:
~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md

ESTRATÉGIA: Usar MOCK no PostgreSQL (não blockchain ainda)

Executar na ordem:

### Backend - Social:
1. Criar apps/api/src/chat/services/moderation.ts (VERSÃO MOCK):
   - createReport() - denúncias no PostgreSQL
   - voteReport() - votação DAO-light (mock)
   - resolveReport() - resolver denúncia

2. Criar apps/api/src/chat/services/badges.ts (VERSÃO MOCK):
   - evaluateTrustBadge() - avaliar critérios
   - issueBadge() - gerar NFT mock no PostgreSQL

3. Criar migration para:
   - TrustBadge (id, profileId, level, issuedAt, nftId)
   - Report (id, reporter, reported, reason, status, votes)

4. Criar apps/api/src/chat/routes/chat.social.ts:
   - POST /chat/reports (criar denúncia)
   - POST /chat/reports/:id/vote (votar)
   - GET /chat/badges/:profileId (selo de confiança)

5. Adicionar votações em grupos:
   - POST /chat/groups/:id/polls (criar votação)
   - POST /chat/groups/:id/polls/:pollId/vote (votar)

### Frontend - Social:
1. Criar apps/web/src/components/chat/ReportDialog.tsx
2. Criar apps/web/src/components/chat/TrustBadge.tsx
3. Criar apps/web/src/components/chat/GroupPoll.tsx
4. Criar apps/web/src/components/chat/MentionInput.tsx (@ menções)
5. Criar apps/web/src/components/chat/HashtagLink.tsx (# hashtags)

Validações:
- Denúncias funcionam
- Votações DAO-light funcionam em grupos
- Selo de Confiança é exibido (mock)
- Menções funcionam (@usuario)
- Hashtags funcionam (#tag)

IMPORTANTE: Documentar versão MOCK de denúncias e badges.

Ao final, validar funcionalidades sociais.
```

### ✅ Resultado Esperado:
- Sistema de denúncias (mock)
- Votações em grupos
- Selo de Confiança (mock)
- Menções e hashtags
- UI social completa

---

## FASE 8: Polimento e Otimização

### 📌 Tempo Estimado: 8-12 horas

```
Implementar FASE 8 (Polimento e Otimização) do documento:
~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md

Executar na ordem:

### 1. Performance:
1. Adicionar paginação infinita em:
   - Inbox (threads)
   - Mensagens (lazy load)
   - Mídia (lazy load de imagens)

2. Otimizar WebSocket:
   - Reconnection exponential backoff
   - Message queueing (offline support)
   - Heartbeat/ping-pong

3. Otimizar E2EE:
   - Web Worker para encrypt/decrypt
   - Batch encryption
   - Key rotation

### 2. Testes:
1. Criar apps/api/src/chat/__tests__/:
   - chat.service.test.ts
   - commission.service.test.ts
   - E2E test: DM flow

2. Criar apps/web/src/__tests__/chat/:
   - useChat.test.ts
   - crypto.test.ts
   - E2E test: send message

### 3. Documentação:
1. Criar docs/api/CHAT_API.md:
   - Documentar todos os endpoints
   - Exemplos de uso
   - WebSocket protocol

2. Criar docs/CHAT_USER_GUIDE.md:
   - Como usar o chat
   - Como fazer vendas
   - Como usar IA

### 4. Métricas e Observabilidade:
1. Adicionar logs estruturados:
   - Message sent/received
   - Errors
   - Performance metrics

2. Adicionar Prometheus metrics:
   - WS connections
   - Messages/second
   - Latency p50/p95/p99

3. Criar Grafana dashboard (opcional)

### 5. UX/UI Polish:
1. Adicionar loading states
2. Adicionar error boundaries
3. Adicionar skeleton loaders
4. Melhorar animações (framer-motion)
5. Adicionar dark mode no chat
6. Melhorar responsividade mobile

Validações:
- Performance metrics estão OK
- Testes unitários passam
- Testes E2E passam
- Documentação completa
- UX polida e responsiva

Ao final, validar que o BazChat está pronto para produção.
```

### ✅ Resultado Esperado:
- Performance otimizada
- Testes automatizados
- Documentação completa
- Métricas e logs
- UI polida e responsiva

---

## Prompts de Validação e Testes

### ✅ Validar FASE Atual

```
Validar que a FASE X foi implementada corretamente:

1. Verificar checklist da FASE X no documento
2. Rodar builds (API e Web)
3. Executar testes (se houver)
4. Fazer teste manual do fluxo principal
5. Verificar que nenhuma funcionalidade existente regrediu
6. Listar eventuais problemas ou pendências

Reportar status: COMPLETA, INCOMPLETA, ou COM PROBLEMAS.
```

### 🧪 Testar Fluxo End-to-End

```
Testar fluxo completo do BazChat:

1. Criar dois usuários (Alice e Bob)
2. Alice inicia DM com Bob
3. Alice envia mensagem de texto (verificar E2EE)
4. Bob recebe e responde
5. Alice envia imagem (verificar IPFS)
6. Alice cria proposta de venda
7. Bob faz checkout
8. Verificar split de pagamento (mock)
9. Verificar recibo NFT
10. Verificar atualização de reputação

Reportar:
- O que funcionou
- O que não funcionou
- Logs de erro (se houver)
```

### 🔍 Debug de Problemas

```
Investigar problema no BazChat:

Problema: [DESCREVER O PROBLEMA]

Passos:
1. Verificar logs do backend (apps/api)
2. Verificar logs do frontend (console do navegador)
3. Verificar logs do WebSocket
4. Verificar migrations do Prisma
5. Verificar variáveis de ambiente
6. Tentar reproduzir o problema
7. Sugerir solução

Reportar causa raiz e solução proposta.
```

### 📊 Gerar Relatório de Progresso

```
Gerar relatório de progresso da implementação do BazChat:

1. Listar fases CONCLUÍDAS (com ✅)
2. Listar fases EM PROGRESSO (com 🚧)
3. Listar fases PENDENTES (com ⏳)
4. Listar funcionalidades testadas
5. Listar problemas conhecidos
6. Estimar tempo restante
7. Sugerir próximos passos

Formato do relatório: Markdown table.
```

---

## 🎯 Atalhos e Comandos Úteis

### Rodar API

```bash
cd ~/bazari/apps/api
pnpm dev
```

### Rodar Web

```bash
cd ~/bazari/apps/web
pnpm dev
```

### Rodar Migrations

```bash
cd ~/bazari/apps/api
pnpm prisma migrate dev
```

### Rodar Testes

```bash
# API
cd ~/bazari/apps/api
pnpm test

# Web
cd ~/bazari/apps/web
pnpm test
```

### Build Completo

```bash
cd ~/bazari
pnpm build
```

---

## 📝 Notas Importantes

### Sobre MOCK vs Chain Real

As **Fases 3, 5 e 7** usam MOCK no PostgreSQL em vez de blockchain:

- ✅ **Vantagem**: Desenvolvimento rápido, sem bloqueio
- ✅ **Migração**: Trocar apenas 3 services quando chain estiver pronta
- ✅ **Documentação**: Cada fase MOCK está documentada

### Sobre IA OSS

A **Fase 4** requer modelos OSS rodando local:

- Se **disponíveis**: Integrar com vLLM, Whisper, etc.
- Se **não disponíveis**: Criar MOCK que retorna placeholders

### Sobre Ordem de Execução

**Obrigatório executar em ordem sequencial:**

```
FASE 0 → FASE 1 → FASE 2 → ... → FASE 8
```

**NÃO pule fases**, pois cada uma depende da anterior.

---

## 🚀 Começar Agora

### Prompt para começar IMEDIATAMENTE:

```
Executar validação inicial e começar FASE 0:

1. Ler ~/bazari/docs/specs/BAZCHAT_IMPLEMENTATION.md
2. Validar ambiente (dependências, DB, builds)
3. Se tudo OK, implementar FASE 0 COMPLETA
4. Validar checklist da FASE 0
5. Reportar status e próximos passos

Usar estratégia de MOCK para blockchain conforme:
~/bazari/docs/specs/BAZCHAT_BLOCKCHAIN_REQUIREMENTS.md

Começar agora.
```

---

**Fim dos Prompts - BazChat v1.0.0**

**Próximo passo**: Copiar o "Prompt Inicial" e colar no Claude Code! 🚀
