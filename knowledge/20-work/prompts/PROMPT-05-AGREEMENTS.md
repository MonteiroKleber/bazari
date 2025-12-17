# Prompt 05: Acordos de Contratação

## Objetivo

Implementar o sistema de acordos de trabalho, incluindo ciclo de vida completo (ativo, pausado, encerrado).

## Pré-requisitos

- Fase 4 (Propostas) - acordos são criados a partir de propostas aceitas

## Contexto

O acordo é o registro formal de vínculo de trabalho. **Não é contrato trabalhista**, é um registro de compromisso mútuo.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Schema Prisma

```prisma
model WorkAgreement {
  id              String   @id @default(uuid())

  // Partes
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])
  workerId        String
  worker          User     @relation(fields: [workerId], references: [id])

  // Origem
  proposalId      String?  @unique
  proposal        WorkProposal? @relation(fields: [proposalId], references: [id])

  // Termos
  title           String
  description     String?
  terms           String?
  agreedValue     Decimal @db.Decimal(10, 2)
  valuePeriod     PaymentPeriod
  valueCurrency   String @default("BRL")

  // Datas
  startDate       DateTime
  endDate         DateTime?

  // Status
  status          AgreementStatus @default(ACTIVE)
  paymentType     PaymentType

  // On-chain
  onChainId       String?  @unique
  onChainTxHash   String?

  // Integração Bazari Pay
  payContractId   String?

  // Metadados
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  pausedAt        DateTime?
  closedAt        DateTime?
  closedReason    String?

  // Relações
  statusHistory   AgreementStatusHistory[]
  evaluations     WorkEvaluation[]
}

enum AgreementStatus {
  ACTIVE
  PAUSED
  CLOSED
}

model AgreementStatusHistory {
  id            String   @id @default(uuid())
  agreementId   String
  agreement     WorkAgreement @relation(fields: [agreementId], references: [id])

  fromStatus    AgreementStatus
  toStatus      AgreementStatus
  reason        String?
  changedById   String
  changedBy     User     @relation(fields: [changedById], references: [id])
  createdAt     DateTime @default(now())
}
```

#### 1.2 Endpoints

Criar em `apps/api/src/routes/work/agreements.ts`:

```typescript
// Listagem
GET    /api/work/agreements              // Listar acordos do usuário
GET    /api/work/agreements/:id          // Detalhes do acordo

// Ações
POST   /api/work/agreements/:id/pause    // Pausar acordo
POST   /api/work/agreements/:id/resume   // Retomar acordo
POST   /api/work/agreements/:id/close    // Encerrar acordo

// Histórico
GET    /api/work/agreements/:id/history  // Histórico de mudanças
```

**Response GET /agreements:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Desenvolvedor React",
      "company": {
        "id": "uuid",
        "name": "TechCorp",
        "logoUrl": "..."
      },
      "worker": {
        "handle": "johndoe",
        "displayName": "John Doe",
        "avatarUrl": "..."
      },
      "agreedValue": "8000.00",
      "valuePeriod": "MONTHLY",
      "status": "ACTIVE",
      "startDate": "2025-02-01",
      "endDate": null,
      "paymentType": "BAZARI_PAY",
      "onChainId": "0x...",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "nextCursor": "..."
}
```

**Request POST /agreements/:id/close:**
```json
{
  "reason": "Projeto concluído com sucesso"
}
```

#### 1.3 Lógica de Mudança de Status

```typescript
async function pauseAgreement(agreementId: string, userId: string, reason?: string) {
  const agreement = await getAgreement(agreementId);

  // Validar permissão
  if (agreement.companyId !== userCompanyId && agreement.workerId !== userId) {
    throw new Forbidden();
  }

  if (agreement.status !== 'ACTIVE') {
    throw new BadRequest('Apenas acordos ativos podem ser pausados');
  }

  // Atualizar
  await updateAgreement(agreementId, {
    status: 'PAUSED',
    pausedAt: new Date()
  });

  // Registrar histórico
  await createStatusHistory({
    agreementId,
    fromStatus: 'ACTIVE',
    toStatus: 'PAUSED',
    reason,
    changedById: userId
  });

  // Atualizar on-chain (se registrado)
  if (agreement.onChainId) {
    await updateOnChainStatus(agreement.onChainId, 'PAUSED');
  }

  // Notificar outra parte
  await notifyAgreementStatusChange(agreement, 'PAUSED', userId);
}

async function closeAgreement(agreementId: string, userId: string, reason: string) {
  const agreement = await getAgreement(agreementId);

  // Validar
  if (agreement.status === 'CLOSED') {
    throw new BadRequest('Acordo já encerrado');
  }

  // Atualizar
  await updateAgreement(agreementId, {
    status: 'CLOSED',
    closedAt: new Date(),
    closedReason: reason
  });

  // Histórico
  await createStatusHistory({
    agreementId,
    fromStatus: agreement.status,
    toStatus: 'CLOSED',
    reason,
    changedById: userId
  });

  // On-chain
  if (agreement.onChainId) {
    await updateOnChainStatus(agreement.onChainId, 'CLOSED');
  }

  // Feed (sem valores)
  await createFeedEvent({
    type: 'WORK_AGREEMENT_ENDED',
    data: {
      agreementId,
      title: agreement.title,
      // NÃO incluir valores
    }
  });

  // Habilitar avaliação
  await enableEvaluation(agreementId);

  // Notificar
  await notifyAgreementStatusChange(agreement, 'CLOSED', userId);
}
```

### 2. Frontend (Web)

#### 2.1 Páginas

```
pages/
  AgreementListPage.tsx       # Lista de acordos
  AgreementDetailPage.tsx     # Detalhes do acordo
```

#### 2.2 Componentes

```
components/
  AgreementCard.tsx           # Card na listagem
  AgreementStatus.tsx         # Badge de status
  AgreementActions.tsx        # Ações (pausar, retomar, encerrar)
  AgreementTimeline.tsx       # Histórico de mudanças
  CloseAgreementModal.tsx     # Modal de encerramento
```

#### 2.3 AgreementListPage.tsx

Layout:
```
┌─────────────────────────────────────────────┐
│ Meus Acordos                                │
├─────────────────────────────────────────────┤
│ [Tabs: Ativos | Pausados | Encerrados]      │
├─────────────────────────────────────────────┤
│ Ativos (2)                                  │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Desenvolvedor React          🟢 Ativo   │ │
│ │ TechCorp                                │ │
│ │ R$ 8.000/mês • Desde 01/02/2025         │ │
│ │ 💳 Bazari Pay                           │ │
│ │ [Ver Detalhes]                          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Consultor UX                 🟢 Ativo   │ │
│ │ DesignCo                                │ │
│ │ R$ 200/hora • Até 30/06/2025            │ │
│ │ 📤 Pagamento Externo                    │ │
│ │ [Ver Detalhes]                          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### 2.4 AgreementDetailPage.tsx

Layout:
```
┌─────────────────────────────────────────────┐
│ ← Voltar                      🟢 Ativo      │
├─────────────────────────────────────────────┤
│ Desenvolvedor React                         │
│ Acordo com TechCorp                         │
├─────────────────────────────────────────────┤
│ Partes                                      │
│ ┌───────────────┐   ┌───────────────┐       │
│ │ [Logo]        │   │ [Avatar]      │       │
│ │ TechCorp      │   │ John Doe      │       │
│ │ Empresa       │   │ Profissional  │       │
│ └───────────────┘   └───────────────┘       │
├─────────────────────────────────────────────┤
│ Termos                                      │
│ • Valor: R$ 8.000/mês                       │
│ • Início: 01/02/2025                        │
│ • Término: Indefinido                       │
│ • Pagamento: Via Bazari Pay                 │
├─────────────────────────────────────────────┤
│ Descrição                                   │
│ Desenvolvimento de features para...         │
├─────────────────────────────────────────────┤
│ Histórico                                   │
│ • 15/01/2025 - Acordo criado                │
│ • 01/02/2025 - Início do trabalho           │
├─────────────────────────────────────────────┤
│ 🔗 Registrado on-chain: 0x...               │
├─────────────────────────────────────────────┤
│ [Pausar Acordo] [Encerrar Acordo]           │
│                                             │
│ [💳 Configurar Bazari Pay]                  │
└─────────────────────────────────────────────┘
```

#### 2.5 CloseAgreementModal.tsx

```tsx
<Dialog>
  <DialogTitle>Encerrar Acordo</DialogTitle>
  <DialogContent>
    <Alert variant="warning">
      Esta ação é irreversível. Após encerrar, ambas as partes
      poderão avaliar a experiência.
    </Alert>

    <FormField label="Motivo do encerramento" required>
      <Select>
        <Option value="completed">Projeto concluído</Option>
        <Option value="mutual">Acordo mútuo</Option>
        <Option value="other">Outro motivo</Option>
      </Select>
    </FormField>

    <FormField label="Comentário (opcional)">
      <Textarea placeholder="Descreva o motivo..." />
    </FormField>
  </DialogContent>
  <DialogActions>
    <Button onClick={onClose}>Cancelar</Button>
    <Button onClick={confirmClose} variant="destructive">
      Encerrar Acordo
    </Button>
  </DialogActions>
</Dialog>
```

### 3. Notificações

```typescript
// Acordo pausado
{
  type: 'WORK_AGREEMENT_PAUSED',
  title: 'Acordo pausado',
  body: 'TechCorp pausou o acordo "Desenvolvedor React"',
  data: { agreementId }
}

// Acordo retomado
{
  type: 'WORK_AGREEMENT_RESUMED',
  title: 'Acordo retomado',
  body: 'TechCorp retomou o acordo "Desenvolvedor React"',
  data: { agreementId }
}

// Acordo encerrado
{
  type: 'WORK_AGREEMENT_CLOSED',
  title: 'Acordo encerrado',
  body: 'O acordo "Desenvolvedor React" foi encerrado',
  data: { agreementId, canEvaluate: true }
}
```

### 4. Feed Events

```typescript
// Ao criar acordo (já implementado em Fase 4)
{
  type: 'WORK_AGREEMENT_STARTED',
  public: true,
  data: { title, companyName }
  // SEM valores
}

// Ao encerrar
{
  type: 'WORK_AGREEMENT_ENDED',
  public: true,
  data: { title, companyName, duration }
  // SEM valores, SEM motivo
}
```

### 5. Rotas

```tsx
<Route path="work/agreements" element={<AgreementListPage />} />
<Route path="work/agreements/:id" element={<AgreementDetailPage />} />
```

## Critérios de Aceite

- [ ] Acordos são criados automaticamente ao aceitar proposta
- [ ] Usuário pode ver lista de acordos por status
- [ ] Qualquer parte pode pausar acordo ativo
- [ ] Qualquer parte pode retomar acordo pausado
- [ ] Qualquer parte pode encerrar acordo
- [ ] Histórico de mudanças é registrado
- [ ] Notificações são enviadas
- [ ] Feed event ao criar/encerrar (sem valores)
- [ ] Encerramento habilita avaliação (preparar para Fase 7)

## Arquivos a Criar/Modificar

```
apps/api/
  prisma/schema.prisma (modificar)
  src/routes/work/agreements.ts (criar)
  src/routes/work/index.ts (modificar)

apps/web/src/modules/work/
  pages/AgreementListPage.tsx
  pages/AgreementDetailPage.tsx
  components/AgreementCard.tsx
  components/AgreementStatus.tsx
  components/AgreementActions.tsx
  components/AgreementTimeline.tsx
  components/CloseAgreementModal.tsx
  api.ts (modificar)

apps/web/src/App.tsx (modificar)
```

## Regras de Negócio

- RN14: Apenas partes envolvidas podem gerenciar
- RN15: Encerramento é irreversível
- RN16: Pausa pode ser revertida por qualquer parte
- RN17: Valores nunca aparecem no Feed
