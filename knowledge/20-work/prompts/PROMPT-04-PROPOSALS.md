# Prompt 04: Propostas e Negociação

## Objetivo

Implementar o sistema de propostas de trabalho entre empresas e profissionais, incluindo negociação via BazChat.

## Pré-requisitos

- Fase 1 (Perfil Profissional)
- Fase 2 (Busca de Talentos) - para encontrar profissionais
- Fase 3 (Vagas) - para vincular propostas a vagas
- BazChat existente para mensagens

## Contexto

A proposta é o passo anterior ao acordo. Permite negociação flexível antes da formalização.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Schema Prisma

```prisma
model WorkProposal {
  id              String   @id @default(uuid())

  // Partes
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])
  senderId        String
  sender          User     @relation("ProposalSender", fields: [senderId], references: [id])
  receiverId      String
  receiver        User     @relation("ProposalReceiver", fields: [receiverId], references: [id])

  // Vínculo opcional com vaga
  jobPostingId    String?
  jobPosting      JobPosting? @relation(fields: [jobPostingId], references: [id])

  // Detalhes
  title           String
  description     String
  proposedValue   Decimal @db.Decimal(10, 2)
  valuePeriod     PaymentPeriod
  valueCurrency   String @default("BRL")
  startDate       DateTime?
  duration        String?
  paymentType     PaymentType @default(UNDEFINED)

  // Status
  status          ProposalStatus @default(PENDING)

  // Metadados
  expiresAt       DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  respondedAt     DateTime?

  // Thread de chat vinculada
  chatThreadId    String?

  // Relação com acordo
  agreement       WorkAgreement?
}

enum ProposalStatus {
  PENDING
  NEGOTIATING
  ACCEPTED
  REJECTED
  EXPIRED
  CANCELLED
}

enum PaymentType {
  EXTERNAL
  BAZARI_PAY
  UNDEFINED
}
```

#### 1.2 Endpoints

Criar em `apps/api/src/routes/work/proposals.ts`:

```typescript
// Envio de Proposta (empresa)
POST   /api/work/proposals                    // Criar proposta

// Gestão (ambas as partes)
GET    /api/work/proposals                    // Listar propostas (enviadas/recebidas)
GET    /api/work/proposals/:id                // Detalhes da proposta
PATCH  /api/work/proposals/:id                // Atualizar proposta (se PENDING)
DELETE /api/work/proposals/:id                // Cancelar proposta

// Ações do Receptor
POST   /api/work/proposals/:id/accept         // Aceitar → cria acordo
POST   /api/work/proposals/:id/reject         // Rejeitar
POST   /api/work/proposals/:id/negotiate      // Iniciar negociação

// Ações do Remetente
POST   /api/work/proposals/:id/counter        // Contra-proposta
```

**Request POST (Criar Proposta):**
```json
{
  "receiverHandle": "johndoe",
  "jobPostingId": "uuid-opcional",
  "title": "Desenvolvedor React",
  "description": "Gostaríamos de contar com você...",
  "proposedValue": 8000.00,
  "valuePeriod": "MONTHLY",
  "valueCurrency": "BRL",
  "startDate": "2025-02-01",
  "duration": "6 meses",
  "paymentType": "BAZARI_PAY"
}
```

**Response:**
```json
{
  "proposal": {
    "id": "uuid",
    "title": "Desenvolvedor React",
    "description": "Gostaríamos de contar com você...",
    "proposedValue": "8000.00",
    "valuePeriod": "MONTHLY",
    "startDate": "2025-02-01",
    "duration": "6 meses",
    "paymentType": "BAZARI_PAY",
    "status": "PENDING",
    "expiresAt": "2025-01-30T10:00:00Z",
    "company": {
      "id": "uuid",
      "name": "TechCorp",
      "logoUrl": "..."
    },
    "receiver": {
      "handle": "johndoe",
      "displayName": "John Doe"
    },
    "chatThreadId": "uuid"
  }
}
```

#### 1.3 Lógica de Aceite

```typescript
// POST /api/work/proposals/:id/accept
async function acceptProposal(proposalId: string, userId: string) {
  const proposal = await getProposal(proposalId);

  // Validações
  if (proposal.receiverId !== userId) throw new Forbidden();
  if (proposal.status !== 'PENDING' && proposal.status !== 'NEGOTIATING') {
    throw new BadRequest('Proposta não pode ser aceita');
  }

  // Criar acordo
  const agreement = await createAgreement({
    companyId: proposal.companyId,
    workerId: proposal.receiverId,
    proposalId: proposal.id,
    title: proposal.title,
    description: proposal.description,
    agreedValue: proposal.proposedValue,
    valuePeriod: proposal.valuePeriod,
    paymentType: proposal.paymentType,
    startDate: proposal.startDate,
    // ... demais campos
  });

  // Atualizar proposta
  await updateProposal(proposalId, {
    status: 'ACCEPTED',
    respondedAt: new Date()
  });

  // Notificar via BazChat
  await sendChatMessage(proposal.chatThreadId, {
    type: 'SYSTEM',
    content: 'Proposta aceita! Acordo criado.'
  });

  // Evento no Feed
  await createFeedEvent({
    type: 'WORK_AGREEMENT_STARTED',
    // ... sem valores
  });

  return agreement;
}
```

#### 1.4 Integração BazChat

Ao criar proposta, criar thread privada:

```typescript
const thread = await createChatThread({
  type: 'WORK_PROPOSAL',
  participants: [sender.id, receiver.id],
  metadata: {
    proposalId: proposal.id,
    companyId: proposal.companyId
  }
});
```

### 2. Frontend (Web)

#### 2.1 Páginas

```
pages/
  ProposalListPage.tsx        # Lista de propostas (enviadas/recebidas)
  ProposalDetailPage.tsx      # Detalhes e ações
  ProposalCreatePage.tsx      # Criar proposta
```

#### 2.2 Componentes

```
components/
  ProposalCard.tsx            # Card na listagem
  ProposalForm.tsx            # Formulário de proposta
  ProposalActions.tsx         # Botões de ação (aceitar/rejeitar/negociar)
  ProposalTimeline.tsx        # Histórico de mudanças
  ProposalChat.tsx            # Chat inline na proposta
```

#### 2.3 ProposalListPage.tsx

Layout:
```
┌─────────────────────────────────────────────┐
│ Propostas                                   │
├─────────────────────────────────────────────┤
│ [Tabs: Recebidas | Enviadas]                │
├─────────────────────────────────────────────┤
│ Recebidas (3)                               │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🟡 Desenvolvedor React                  │ │
│ │ TechCorp                                │ │
│ │ R$ 8.000/mês • 6 meses                  │ │
│ │ Expira em 12 dias                       │ │
│ │ [Ver Detalhes]                          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🟢 Consultor UX                         │ │
│ │ DesignCo                 EM NEGOCIAÇÃO  │ │
│ │ R$ 200/hora • Projeto                   │ │
│ │ [Ver Detalhes]                          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### 2.4 ProposalDetailPage.tsx

Layout (receptor):
```
┌─────────────────────────────────────────────┐
│ ← Voltar                      Status: 🟡    │
├─────────────────────────────────────────────┤
│ Desenvolvedor React                         │
│ Proposta de TechCorp                        │
├─────────────────────────────────────────────┤
│ Detalhes                                    │
│ • Valor: R$ 8.000/mês                       │
│ • Início: 01/02/2025                        │
│ • Duração: 6 meses                          │
│ • Pagamento: Via Bazari Pay                 │
├─────────────────────────────────────────────┤
│ Descrição                                   │
│ Gostaríamos de contar com você para...      │
├─────────────────────────────────────────────┤
│ Conversa                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ [Chat integrado com a thread]           │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Expira em 12 dias                           │
│                                             │
│ [Rejeitar] [Negociar] [✓ Aceitar]          │
└─────────────────────────────────────────────┘
```

#### 2.5 Fluxo de Aceite

```tsx
// ProposalActions.tsx
function handleAccept() {
  setShowConfirmModal(true);
}

// ConfirmAcceptModal.tsx
<Dialog>
  <DialogTitle>Aceitar Proposta</DialogTitle>
  <DialogContent>
    <p>Ao aceitar, um acordo de trabalho será criado.</p>
    <Checkbox>Li e aceito os termos</Checkbox>
  </DialogContent>
  <DialogActions>
    <Button onClick={onClose}>Cancelar</Button>
    <Button onClick={confirmAccept} variant="primary">
      Confirmar e Criar Acordo
    </Button>
  </DialogActions>
</Dialog>
```

### 3. Notificações

#### 3.1 BazChat

```typescript
// Proposta recebida
{
  type: 'WORK_PROPOSAL_RECEIVED',
  title: 'Nova proposta de trabalho',
  body: 'TechCorp enviou uma proposta: Desenvolvedor React',
  data: { proposalId, threadId }
}

// Proposta aceita
{
  type: 'WORK_PROPOSAL_ACCEPTED',
  title: 'Proposta aceita!',
  body: 'João Silva aceitou sua proposta',
  data: { proposalId, agreementId }
}

// Proposta rejeitada
{
  type: 'WORK_PROPOSAL_REJECTED',
  title: 'Proposta recusada',
  body: 'João Silva recusou sua proposta',
  data: { proposalId }
}
```

#### 3.2 Push Notification

- Proposta recebida
- Proposta aceita/rejeitada
- Proposta expirando (24h antes)

### 4. Rotas

```tsx
<Route path="work/proposals" element={<ProposalListPage />} />
<Route path="work/proposals/:id" element={<ProposalDetailPage />} />
<Route path="work/proposals/new" element={<ProposalCreatePage />} />
<Route path="work/proposals/new/:handle" element={<ProposalCreatePage />} />
```

## Critérios de Aceite

- [ ] Empresa pode enviar proposta para profissional
- [ ] Proposta pode ser vinculada a vaga existente
- [ ] Profissional recebe notificação via BazChat
- [ ] Profissional pode aceitar, rejeitar ou negociar
- [ ] Aceite cria acordo automaticamente (UC-W05)
- [ ] Proposta expira após 15 dias
- [ ] Chat inline funciona
- [ ] Contra-proposta funciona

## Arquivos a Criar/Modificar

```
apps/api/
  prisma/schema.prisma (modificar)
  src/routes/work/proposals.ts (criar)
  src/routes/work/index.ts (modificar)

apps/web/src/modules/work/
  pages/ProposalListPage.tsx
  pages/ProposalDetailPage.tsx
  pages/ProposalCreatePage.tsx
  components/ProposalCard.tsx
  components/ProposalForm.tsx
  components/ProposalActions.tsx
  components/ProposalTimeline.tsx
  components/ProposalChat.tsx
  api.ts (modificar)

apps/web/src/App.tsx (modificar)
```

## Regras de Negócio

- RN09: Proposta expira em 15 dias se não respondida
- RN10: Empresa pode cancelar proposta antes do aceite
- RN11: Aceite cria acordo automaticamente
- RN12: Apenas uma proposta ativa por par empresa-profissional
