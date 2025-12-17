# Prompt 08: Integração com Bazari Pay

## Objetivo

Implementar a integração entre Bazari Work e Bazari Pay para pagamentos automáticos de acordos.

## Pré-requisitos

- Fase 5 (Acordos) do Work
- Bazari Pay implementado (pelo menos Fases 1-3)

## Contexto

A integração é **opcional**. Acordos podem existir sem pagamento via Pay. O Work **organiza relações**, o Pay **move dinheiro**.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Endpoint de Vinculação

```typescript
// POST /api/work/agreements/:id/link-pay
router.post('/:id/link-pay', async (req, res) => {
  const { id } = req.params;
  const {
    value,
    period,
    paymentDay,
    startDate,
  } = req.body;

  // Validar acordo
  const agreement = await prisma.workAgreement.findUnique({
    where: { id },
    include: { company: true, worker: true },
  });

  if (!agreement) throw new NotFound();
  if (agreement.status !== 'ACTIVE') {
    throw new BadRequest('Acordo não está ativo');
  }
  if (agreement.payContractId) {
    throw new BadRequest('Acordo já vinculado ao Bazari Pay');
  }

  // Verificar wallets
  const payerWallet = await getCompanyPayWallet(agreement.companyId);
  const receiverWallet = await getUserPayWallet(agreement.workerId);

  if (!payerWallet || !receiverWallet) {
    throw new BadRequest('Ambas as partes precisam ter wallet ativa');
  }

  // Criar contrato no Bazari Pay
  const payContract = await payService.createRecurringContract({
    payerId: agreement.companyId,
    receiverId: agreement.workerId,
    payerWallet,
    receiverWallet,
    value,
    period,
    paymentDay,
    startDate,
    referenceType: 'WORK_AGREEMENT',
    referenceId: agreement.id,
  });

  // Atualizar acordo
  await prisma.workAgreement.update({
    where: { id },
    data: {
      payContractId: payContract.id,
      paymentType: 'BAZARI_PAY',
    },
  });

  // Notificar trabalhador
  await notifyPayLinked(agreement, payContract);

  return res.json({
    success: true,
    payContractId: payContract.id,
    nextPayment: payContract.nextPaymentDate,
  });
});
```

#### 1.2 Endpoint de Desvinculação

```typescript
// DELETE /api/work/agreements/:id/link-pay
router.delete('/:id/link-pay', async (req, res) => {
  const agreement = await prisma.workAgreement.findUnique({
    where: { id: req.params.id },
  });

  if (!agreement?.payContractId) {
    throw new BadRequest('Acordo não vinculado ao Bazari Pay');
  }

  // Pausar contrato no Pay (não deleta, apenas pausa)
  await payService.pauseContract(agreement.payContractId);

  // Atualizar acordo
  await prisma.workAgreement.update({
    where: { id: req.params.id },
    data: {
      payContractId: null,
      paymentType: 'EXTERNAL',
    },
  });

  return res.json({ success: true });
});
```

#### 1.3 Sincronização de Status

```typescript
// Webhook do Bazari Pay
// POST /api/work/webhooks/pay
router.post('/webhooks/pay', async (req, res) => {
  const { type, contractId, data } = req.body;

  // Encontrar acordo vinculado
  const agreement = await prisma.workAgreement.findFirst({
    where: { payContractId: contractId },
  });

  if (!agreement) return res.json({ ok: true });

  switch (type) {
    case 'CONTRACT_PAUSED':
      // Notificar partes
      await notifyPayContractPaused(agreement);
      break;

    case 'CONTRACT_CLOSED':
      // Desvincular
      await prisma.workAgreement.update({
        where: { id: agreement.id },
        data: { payContractId: null, paymentType: 'EXTERNAL' },
      });
      break;

    case 'PAYMENT_EXECUTED':
      // Log de pagamento
      await logPaymentForAgreement(agreement.id, data);
      break;

    case 'PAYMENT_FAILED':
      // Notificar partes
      await notifyPaymentFailed(agreement, data);
      break;
  }

  return res.json({ ok: true });
});
```

### 2. Frontend (Web)

#### 2.1 Componentes

```
components/
  PayLinkCard.tsx            # Card de integração Pay
  PayLinkModal.tsx           # Modal para configurar
  PaymentHistory.tsx         # Histórico de pagamentos
  PayStatusBadge.tsx         # Badge de status Pay
```

#### 2.2 PayLinkCard.tsx

```tsx
interface PayLinkCardProps {
  agreement: WorkAgreement;
  onLink: () => void;
  onUnlink: () => void;
}

export function PayLinkCard({ agreement, onLink, onUnlink }: PayLinkCardProps) {
  const isLinked = !!agreement.payContractId;

  if (!isLinked) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Pagamentos Automáticos</h4>
              <p className="text-sm text-muted-foreground">
                Vincule ao Bazari Pay para pagamentos recorrentes automáticos
              </p>
            </div>
            <Button onClick={onLink}>
              <CreditCard className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium">Bazari Pay Ativo</h4>
              <p className="text-sm text-muted-foreground">
                Próximo pagamento: {formatDate(agreement.nextPaymentDate)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/pay/contracts/${agreement.payContractId}`}>
                Ver Contrato
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={onUnlink}>
              Desvincular
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 2.3 PayLinkModal.tsx

```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Configurar Bazari Pay</DialogTitle>
      <DialogDescription>
        Configure pagamentos automáticos para este acordo
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      <FormField label="Valor" required>
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.00"
        />
        <FormHint>
          Valor sugerido do acordo: {formatCurrency(agreement.agreedValue)}
        </FormHint>
      </FormField>

      <FormField label="Periodicidade" required>
        <Select value={period} onValueChange={setPeriod}>
          <SelectItem value="WEEKLY">Semanal</SelectItem>
          <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
          <SelectItem value="MONTHLY">Mensal</SelectItem>
        </Select>
      </FormField>

      <FormField label="Dia do Pagamento" required>
        <Select value={paymentDay} onValueChange={setPaymentDay}>
          {[1, 5, 10, 15, 20, 25].map((day) => (
            <SelectItem key={day} value={day.toString()}>
              Dia {day}
            </SelectItem>
          ))}
        </Select>
      </FormField>

      <FormField label="Início">
        <DatePicker value={startDate} onChange={setStartDate} />
      </FormField>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancelar</Button>
      <Button onClick={handleSubmit}>Ativar Pagamentos</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 2.4 PaymentHistory.tsx

Exibir histórico de pagamentos do acordo:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Histórico de Pagamentos</CardTitle>
  </CardHeader>
  <CardContent>
    {payments.length === 0 ? (
      <p className="text-muted-foreground">Nenhum pagamento registrado</p>
    ) : (
      <div className="space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div>
              <div className="font-medium">
                {formatCurrency(payment.value)}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDate(payment.executedAt)}
              </div>
            </div>
            <PayStatusBadge status={payment.status} />
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

### 3. Fluxo Completo

```
┌─────────────────┐
│   Work: Acordo  │
│     Criado      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  paymentType =  │────▶│   Pagamento     │
│    EXTERNAL     │     │    Externo      │
└─────────────────┘     └─────────────────┘
         │
         │ Usuário clica "Configurar Bazari Pay"
         ▼
┌─────────────────┐
│  PayLinkModal   │
│  (configura)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Pay: Contrato  │
│    Criado       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  paymentType =  │────▶│   Execuções     │
│   BAZARI_PAY    │     │  Automáticas    │
└─────────────────┘     └─────────────────┘
         │
         │ A cada período
         ▼
┌─────────────────┐
│   Webhook Pay   │
│  → Work Sync    │
└─────────────────┘
```

### 4. Considerações

#### 4.1 Encerrar Acordo vs Contrato Pay

- Encerrar acordo **não** encerra contrato Pay automaticamente
- Usuário decide se mantém ou cancela pagamentos
- Contrato Pay pode existir além do acordo

#### 4.2 Valores Diferentes

- Valor do Pay pode diferir do acordo
- Ajustes (extras/descontos) são no Pay, não no Work
- Work não controla valores, apenas organiza

#### 4.3 Notificações

- Pagamento executado → BazChat
- Pagamento falhou → BazChat + Push
- Contrato pausado → BazChat

## Critérios de Aceite

- [ ] Acordo pode ser vinculado ao Pay
- [ ] Contrato Pay criado com valores configurados
- [ ] Webhook sincroniza status
- [ ] Histórico de pagamentos exibido
- [ ] Desvinculação funciona
- [ ] Notificações enviadas
- [ ] Fluxos Work e Pay permanecem independentes

## Arquivos a Criar/Modificar

```
apps/api/src/routes/work/
  agreements.ts (modificar - adicionar endpoints)
  webhooks.ts (criar)

apps/web/src/modules/work/
  components/PayLinkCard.tsx
  components/PayLinkModal.tsx
  components/PaymentHistory.tsx
  components/PayStatusBadge.tsx
  pages/AgreementDetailPage.tsx (modificar)
```
