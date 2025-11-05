# Treasury Implementation Notes

## Problema: BadOrigin ao Criar Propostas Treasury

### Contexto

O pallet-treasury no runtime Bazari Chain foi atualizado para Substrate v10+, que introduziu mudanças significativas na API de propostas de tesouro.

### Configuração do Runtime

```rust
// runtime/src/configs/mod.rs
impl pallet_treasury::Config for Runtime {
    type SpendOrigin = frame_support::traits::NeverEnsureOrigin<Balance>;
    // ... outras configs
}
```

**IMPORTANTE**: `NeverEnsureOrigin` significa que **nenhuma conta comum pode criar propostas diretamente**.

### Métodos Disponíveis

#### Versão Antiga (Substrate v1-v9)
- ❌ `treasury.proposeSpend(value, beneficiary)` - **DEPRECATED**
- ✅ Qualquer conta podia criar proposta
- ✅ Council aprovava via voting
- ✅ Pagamento após SpendPeriod

#### Versão Nova (Substrate v10+)
- ✅ `treasury.spendLocal(amount, beneficiary)` - **ATIVO**
- ❌ Requer `SpendOrigin` privilegiado
- ✅ Aprovação imediata se origem válida
- ✅ Pagamento após PayoutPeriod

### Fluxos de Aprovação

#### Opção 1: Via Sudo (Temporário - Desenvolvimento)
```typescript
// Backend: governance.service.ts
const spendCall = api.tx.treasury.spendLocal(value, beneficiary);
const proposeTx = api.tx.sudo.sudo(spendCall);

await proposeTx.signAndSend(sudoAccount);

// Eventos emitidos:
// - sudo.Sudid
// - treasury.SpendApproved
```

**Prós**:
- ✅ Rápido para desenvolvimento
- ✅ Aprovação imediata

**Contras**:
- ❌ Requer acesso à conta sudo
- ❌ Não é descentralizado
- ❌ Não deve ser usado em produção

#### Opção 2: Via Council Motion (Recomendado - Produção)
```typescript
// 1. Council member cria motion para aprovar spend
const spendCall = api.tx.treasury.spendLocal(value, beneficiary);
const threshold = 4; // Maioria do council (ex: 4 de 7)
const motionTx = api.tx.council.propose(
  threshold,
  spendCall,
  spendCall.encodedLength
);

await motionTx.signAndSend(councilMember);

// 2. Outros council members votam
await api.tx.council.vote(proposalHash, index, true).signAndSend(member2);
await api.tx.council.vote(proposalHash, index, true).signAndSend(member3);
// ... até atingir threshold

// 3. Alguém fecha a votação
await api.tx.council.close(
  proposalHash,
  index,
  weightBound,
  lengthBound
).signAndSend(anyAccount);

// Eventos emitidos:
// - council.Proposed
// - council.Voted (para cada voto)
// - council.Closed
// - council.Executed
// - treasury.SpendApproved
```

**Prós**:
- ✅ Descentralizado
- ✅ Requer consenso do council
- ✅ Adequado para produção
- ✅ Transparente

**Contras**:
- ❌ Mais complexo
- ❌ Requer múltiplas transações
- ❌ Usuários comuns não podem propor diretamente

### Implementação Atual

**Arquivo**: `/root/bazari/apps/api/src/services/governance/governance.service.ts`

```typescript
static async submitTreasuryProposal(
  params: TreasuryProposalParams
): Promise<ProposalResult> {
  const api = await getSubstrateApi();

  // Verificar assinatura do usuário
  const messageData = JSON.stringify({
    type: 'treasury',
    title: params.title,
    description: params.description,
    beneficiary: params.beneficiary,
    value: params.value,
    proposer: params.proposer,
  });

  if (!this.verifySignature(messageData, params.signature, params.proposer)) {
    throw new Error('Assinatura inválida');
  }

  // Usar conta sudo (temporário para desenvolvimento)
  const sudoAccount = this.keyring.addFromUri(env.BAZARICHAIN_SUDO_SEED);

  // Criar extrinsic envolvido em sudo
  const value = api.createType('Balance', params.value);
  const spendCall = api.tx.treasury.spendLocal(value, params.beneficiary);
  const proposeTx = api.tx.sudo.sudo(spendCall);

  // Assinar e enviar
  return new Promise((resolve, reject) => {
    // ... lógica de signAndSend
  });
}
```

### Roadmap de Melhorias

#### Fase 1: Desenvolvimento (ATUAL) ✅
- [x] Usar `sudo.sudo(spendLocal)` para testes
- [x] Validar fluxo básico end-to-end
- [x] Documentar limitações

#### Fase 2: Produção MVP
- [ ] Implementar fluxo via Council motions
- [ ] Criar endpoint `POST /governance/council/propose-spend`
- [ ] Atualizar frontend para criar council motions
- [ ] Council members votam via interface

#### Fase 3: Governança Completa
- [ ] Implementar sistema de "beneficiary proposals"
- [ ] Usuários criam solicitações (off-chain ou via remark)
- [ ] Council pode revisar e aprovar via motions
- [ ] Dashboard para tracking de proposals e approvals

#### Fase 4: Descentralização Total
- [ ] Configurar `SpendOrigin` para aceitar democracy referendums
- [ ] Permitir que community vote em grandes gastos
- [ ] Council aprova gastos menores
- [ ] Democracy aprova gastos maiores

### Comparação de Abordagens

| Aspecto | Sudo (Atual) | Council Motion | Democracy Referendum |
|---------|--------------|----------------|---------------------|
| **Descentralização** | ❌ Baixa | ✅ Média | ✅ Alta |
| **Velocidade** | ✅ Instantâneo | ⚠️ Horas/dias | ❌ Semanas |
| **Complexidade** | ✅ Simples | ⚠️ Moderada | ❌ Alta |
| **Uso Recomendado** | Dev/Test | Produção | Grandes decisões |
| **Threshold** | 1 conta sudo | 4-7 council | Maioria token holders |

### Eventos do Sistema

```typescript
// Sudo approach
api.events.sudo.Sudid
api.events.treasury.SpendApproved

// Council approach
api.events.council.Proposed
api.events.council.Voted
api.events.council.Closed
api.events.council.Executed
api.events.treasury.SpendApproved

// Democracy approach (futuro)
api.events.democracy.Proposed
api.events.democracy.Started
api.events.democracy.Passed
api.events.scheduler.Scheduled
api.events.treasury.SpendApproved
```

### Storage Queries

```typescript
// Verificar spends aprovados
const spends = await api.query.treasury.spends.entries();

// Verificar status de um spend específico
const spend = await api.query.treasury.spends(spendId);

// Verificar saldo do tesouro
const treasuryAccount = api.consts.treasury.palletId;
const balance = await api.query.system.account(treasuryAccount);
```

### Considerações de Segurança

1. **Assinatura do Usuário**: Sempre validar assinatura antes de submeter
2. **Validação de Beneficiário**: Verificar se endereço é válido
3. **Limites de Valor**: Implementar limites máximos por proposta
4. **Rate Limiting**: Prevenir spam de propostas
5. **Audit Trail**: Manter log de todas as proposals e approvals

### Referências

- [Substrate Treasury Pallet](https://docs.substrate.io/reference/frame-pallets/treasury/)
- [Polkadot Treasury RFC #74](https://github.com/polkadot-fellows/RFCs/blob/main/text/0074-spend-local.md)
- [Council Collective Pallet](https://docs.substrate.io/reference/frame-pallets/collective/)

---

**Última Atualização**: 2025-11-03
**Status**: Implementação Fase 1 (Sudo) concluída ✅
**Próximo Passo**: Implementar Fase 2 (Council Motions)
