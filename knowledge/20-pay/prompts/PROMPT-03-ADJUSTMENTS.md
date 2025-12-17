# Prompt 03: Ajustes (Extras e Descontos)

## Objetivo

Implementar sistema de ajustes que modificam o valor do pagamento sem alterar o contrato base.

## Pré-requisitos

- Fase 1 (Contratos)
- Fase 2 (Scheduler)

## Contexto

Ajustes permitem adicionar extras (bônus, hora extra) ou descontos (adiantamento, falta) a um pagamento específico, sem modificar o valor base do contrato.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Schema Prisma

```prisma
model PayAdjustment {
  id                String   @id @default(uuid())
  contractId        String
  contract          PayContract @relation(fields: [contractId], references: [id])

  // Tipo e valor
  type              AdjustmentType
  value             Decimal  @db.Decimal(18, 8)

  // Período
  referenceMonth    DateTime

  // Detalhes
  reason            String
  description       String?
  attachments       String[]

  // Aprovação
  requiresApproval  Boolean  @default(false)
  status            AdjustmentStatus @default(DRAFT)
  approvedAt        DateTime?
  approvedById      String?
  rejectionReason   String?

  // Aplicação
  executionId       String?
  execution         PayExecution? @relation(fields: [executionId], references: [id])

  // Metadados
  createdById       String
  createdBy         User     @relation(fields: [createdById], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum AdjustmentType {
  EXTRA
  DISCOUNT
}

enum AdjustmentStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
  APPLIED
  CANCELLED
}
```

#### 1.2 Endpoints

```typescript
// CRUD de Ajustes
POST   /api/pay/contracts/:id/adjustments       // Criar ajuste
GET    /api/pay/contracts/:id/adjustments       // Listar ajustes
GET    /api/pay/adjustments/:id                 // Detalhes
PATCH  /api/pay/adjustments/:id                 // Atualizar (se draft)
DELETE /api/pay/adjustments/:id                 // Cancelar

// Aprovação
POST   /api/pay/adjustments/:id/submit          // Enviar para aprovação
POST   /api/pay/adjustments/:id/approve         // Aprovar
POST   /api/pay/adjustments/:id/reject          // Rejeitar

// Listagem geral
GET    /api/pay/adjustments/pending             // Ajustes pendentes de aprovação
```

**Request POST (Criar Ajuste):**
```json
{
  "type": "EXTRA",
  "value": "500.00",
  "referenceMonth": "2025-02-01",
  "reason": "Bônus por meta atingida",
  "description": "Meta de vendas Q1 atingida em 120%",
  "requiresApproval": false
}
```

**Response:**
```json
{
  "adjustment": {
    "id": "uuid",
    "type": "EXTRA",
    "value": "500.00",
    "referenceMonth": "2025-02-01",
    "reason": "Bônus por meta atingida",
    "status": "APPROVED",
    "createdAt": "2025-01-20T10:00:00Z",
    "contract": {
      "id": "uuid",
      "receiver": {
        "handle": "johndoe",
        "displayName": "John Doe"
      }
    }
  }
}
```

#### 1.3 Lógica de Criação

```typescript
async function createAdjustment(
  contractId: string,
  data: CreateAdjustmentData,
  userId: string
) {
  const contract = await prisma.payContract.findUnique({
    where: { id: contractId },
    include: { payer: true, receiver: true },
  });

  if (!contract) throw new NotFound();

  // Verificar permissão (apenas pagador pode criar ajustes)
  if (contract.payerId !== userId) {
    throw new Forbidden('Apenas o pagador pode criar ajustes');
  }

  // Descontos requerem aprovação por padrão
  const requiresApproval = data.type === 'DISCOUNT'
    ? true
    : data.requiresApproval ?? false;

  const adjustment = await prisma.payAdjustment.create({
    data: {
      contractId,
      type: data.type,
      value: data.value,
      referenceMonth: new Date(data.referenceMonth),
      reason: data.reason,
      description: data.description,
      attachments: data.attachments || [],
      requiresApproval,
      status: requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED',
      createdById: userId,
    },
  });

  if (requiresApproval) {
    // Notificar recebedor para aprovação
    await notifyAdjustmentPending(contract, adjustment);
  }

  return adjustment;
}
```

#### 1.4 Fluxo de Aprovação

```typescript
// Aprovar
async function approveAdjustment(adjustmentId: string, userId: string) {
  const adjustment = await prisma.payAdjustment.findUnique({
    where: { id: adjustmentId },
    include: { contract: true },
  });

  if (!adjustment) throw new NotFound();

  // Apenas recebedor pode aprovar
  if (adjustment.contract.receiverId !== userId) {
    throw new Forbidden('Apenas o recebedor pode aprovar');
  }

  if (adjustment.status !== 'PENDING_APPROVAL') {
    throw new BadRequest('Ajuste não está pendente de aprovação');
  }

  await prisma.payAdjustment.update({
    where: { id: adjustmentId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById: userId,
    },
  });

  // Notificar pagador
  await notifyAdjustmentApproved(adjustment);
}

// Rejeitar
async function rejectAdjustment(
  adjustmentId: string,
  userId: string,
  reason: string
) {
  const adjustment = await prisma.payAdjustment.findUnique({
    where: { id: adjustmentId },
    include: { contract: true },
  });

  if (!adjustment) throw new NotFound();

  if (adjustment.contract.receiverId !== userId) {
    throw new Forbidden('Apenas o recebedor pode rejeitar');
  }

  await prisma.payAdjustment.update({
    where: { id: adjustmentId },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
    },
  });

  // Notificar pagador
  await notifyAdjustmentRejected(adjustment, reason);
}
```

#### 1.5 Integração com Scheduler

Modificar `pay-scheduler.service.ts`:

```typescript
private async getAdjustmentsForPeriod(
  contractId: string,
  periodRef: string
): Promise<PayAdjustment[]> {
  const [year, month] = periodRef.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return prisma.payAdjustment.findMany({
    where: {
      contractId,
      referenceMonth: {
        gte: start,
        lte: end,
      },
      status: 'APPROVED',
      executionId: null, // Ainda não aplicado
    },
  });
}

private async markAdjustmentsAsApplied(
  adjustments: PayAdjustment[],
  executionId: string
) {
  await prisma.payAdjustment.updateMany({
    where: {
      id: { in: adjustments.map(a => a.id) },
    },
    data: {
      status: 'APPLIED',
      executionId,
    },
  });
}
```

### 2. Frontend (Web)

#### 2.1 Componentes

```
components/
  AdjustmentCard.tsx         # Card de ajuste
  AdjustmentForm.tsx         # Formulário
  AdjustmentList.tsx         # Lista no contrato
  AdjustmentApproval.tsx     # Modal de aprovação
  PendingAdjustments.tsx     # Lista de pendentes
```

#### 2.2 AdjustmentForm.tsx

```tsx
interface AdjustmentFormProps {
  contractId: string;
  onSuccess: () => void;
}

export function AdjustmentForm({ contractId, onSuccess }: AdjustmentFormProps) {
  const [type, setType] = useState<'EXTRA' | 'DISCOUNT'>('EXTRA');
  const [value, setValue] = useState('');
  const [month, setMonth] = useState(getCurrentMonth());
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <FormField label="Tipo">
          <RadioGroup value={type} onValueChange={setType}>
            <RadioGroupItem value="EXTRA">
              <Plus className="h-4 w-4 text-green-500" />
              Extra
            </RadioGroupItem>
            <RadioGroupItem value="DISCOUNT">
              <Minus className="h-4 w-4 text-red-500" />
              Desconto
            </RadioGroupItem>
          </RadioGroup>
        </FormField>

        <FormField label="Valor" required>
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            prefix="R$"
          />
        </FormField>

        <FormField label="Mês de Referência" required>
          <MonthPicker value={month} onChange={setMonth} />
        </FormField>

        <FormField label="Motivo" required>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Bônus por meta atingida"
          />
        </FormField>

        <FormField label="Descrição">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes adicionais..."
          />
        </FormField>

        {type === 'DISCOUNT' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Descontos requerem aprovação do recebedor antes de serem aplicados.
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full">
          {type === 'DISCOUNT' ? 'Enviar para Aprovação' : 'Adicionar Extra'}
        </Button>
      </div>
    </form>
  );
}
```

#### 2.3 PendingAdjustments.tsx

Para o recebedor aprovar/rejeitar:

```tsx
export function PendingAdjustments() {
  const { data } = useQuery({
    queryKey: ['pending-adjustments'],
    queryFn: payApi.getPendingAdjustments,
  });

  if (!data?.items.length) return null;

  return (
    <Card className="border-yellow-200 bg-yellow-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          Ajustes Pendentes de Aprovação
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.items.map((adjustment) => (
          <div
            key={adjustment.id}
            className="flex items-center justify-between py-3 border-b last:border-0"
          >
            <div>
              <div className="font-medium">
                {adjustment.type === 'EXTRA' ? (
                  <span className="text-green-600">+{formatCurrency(adjustment.value)}</span>
                ) : (
                  <span className="text-red-600">-{formatCurrency(adjustment.value)}</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {adjustment.reason}
              </div>
              <div className="text-xs text-muted-foreground">
                Ref: {formatMonth(adjustment.referenceMonth)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(adjustment.id)}
              >
                Recusar
              </Button>
              <Button
                size="sm"
                onClick={() => handleApprove(adjustment.id)}
              >
                Aprovar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

#### 2.4 AdjustmentList.tsx

Na página de detalhes do contrato:

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Ajustes</CardTitle>
      <Button size="sm" onClick={() => setShowForm(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Novo Ajuste
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pendentes</TabsTrigger>
        <TabsTrigger value="applied">Aplicados</TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        {pendingAdjustments.map((adj) => (
          <AdjustmentCard key={adj.id} adjustment={adj} />
        ))}
      </TabsContent>

      <TabsContent value="applied">
        {appliedAdjustments.map((adj) => (
          <AdjustmentCard key={adj.id} adjustment={adj} showExecution />
        ))}
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

### 3. Exibição no Comprovante

Quando um pagamento é executado com ajustes:

```
┌─────────────────────────────────────────────┐
│ Comprovante de Pagamento                     │
├─────────────────────────────────────────────┤
│ Pagador: TechCorp                            │
│ Recebedor: John Doe                          │
│ Período: Fevereiro 2025                      │
├─────────────────────────────────────────────┤
│ Valor Base:               R$  8.000,00       │
│ (+) Bônus meta:           R$    500,00       │
│ (-) Adiantamento:         R$    300,00       │
│ ─────────────────────────────────────────    │
│ TOTAL PAGO:               R$  8.200,00       │
├─────────────────────────────────────────────┤
│ TX: 0x1234...5678                            │
│ Data: 05/02/2025 06:00:15                    │
└─────────────────────────────────────────────┘
```

## Critérios de Aceite

- [ ] Criar extras que são aplicados automaticamente
- [ ] Criar descontos que requerem aprovação
- [ ] Recebedor pode aprovar/rejeitar via BazChat
- [ ] Ajustes aplicados no cálculo do scheduler
- [ ] Histórico mostra ajustes de cada execução
- [ ] Valor final = base + extras - descontos

## Arquivos a Criar

```
apps/api/
  prisma/schema.prisma (modificar)
  src/routes/pay/adjustments.ts
  src/services/pay-scheduler.service.ts (modificar)

apps/web/src/modules/pay/
  components/AdjustmentCard.tsx
  components/AdjustmentForm.tsx
  components/AdjustmentList.tsx
  components/AdjustmentApproval.tsx
  components/PendingAdjustments.tsx
  pages/ContractDetailPage.tsx (modificar)
```
