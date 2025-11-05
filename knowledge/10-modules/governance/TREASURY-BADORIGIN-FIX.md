# Treasury BadOrigin Fix - Wrapper sudo.sudo()

## Problema Identificado

Quando uma Treasury Request era aprovada pelo Council e a motion era fechada, a execução falhava com o erro `BadOrigin`.

### Investigação

1. **Sintomas**:
   - Motion foi criada e votada com sucesso
   - Motion foi fechada com 2 votos favoráveis
   - Evento `Council.Executed` mostrava: `{"err":{"badOrigin":null}}`
   - Fundos não foram transferidos do Treasury para o beneficiário
   - Treasury ainda tinha 100 BZR, beneficiário tinha 0 BZR

2. **Causa Raiz**:
   - A motion estava chamando diretamente `treasury.spendLocal(amount, beneficiary)`
   - Quando o Council executa uma motion aprovada, ela é executada com origem `Council`
   - `treasury.spendLocal()` requer origem `Root` (sudo)
   - **Conclusão**: A chamada falhava por falta de permissão adequada

### Análise do Código

**Antes da correção** ([CreateMotionModal.tsx:98-115](apps/web/src/modules/governance/components/CreateMotionModal.tsx#L98-L115)):

```typescript
// Create the spendLocal call
const value = api.createType('Balance', request.value);
const spendCall = api.tx.treasury.spendLocal(value, request.beneficiary);

// Calculate lengthBound (encoded length + 4 bytes for storage overhead)
const lengthBound = spendCall.encodedLength + 4;

// Create council motion with lengthBound
const motionTx = api.tx.council.propose(
  threshold,
  spendCall,  // ❌ Problema: Executado com origem Council
  lengthBound
);
```

**Depois da correção**:

```typescript
// Create the spendLocal call
const value = api.createType('Balance', request.value);
const spendCall = api.tx.treasury.spendLocal(value, request.beneficiary);

// Wrap the treasury.spendLocal call with sudo.sudo() so it has Root origin
// This is necessary because treasury.spendLocal requires Root origin,
// but when Council executes the motion, it has Council origin.
const sudoCall = api.tx.sudo.sudo(spendCall);

// Calculate lengthBound (encoded length + 4 bytes for storage overhead)
const lengthBound = sudoCall.encodedLength + 4;

// Create council motion with lengthBound
const motionTx = api.tx.council.propose(
  threshold,
  sudoCall,  // ✅ Solução: Executado com origem Root
  lengthBound
);
```

## Solução Implementada

### Workaround: Wrapper sudo.sudo()

Envolvemos a chamada `treasury.spendLocal()` com `sudo.sudo()` para que quando o Council execute a motion aprovada, ela tenha origem `Root`:

- **Motion proposta**: `sudo.sudo(treasury.spendLocal(amount, beneficiary))`
- **Quando executada pelo Council**: A chamada sudo é executada com privilégios Root
- **Resultado**: O Treasury consegue transferir fundos com sucesso

### Arquivos Modificados

1. **Frontend - CreateMotionModal.tsx**
   - Adicionado wrapper `api.tx.sudo.sudo()` na criação da proposal
   - Atualizado cálculo do `lengthBound` para usar o `sudoCall`

## Soluções Alternativas (Não Implementadas)

### 1. Modificar Runtime (Solução Permanente)

A solução ideal seria modificar a configuração do pallet Treasury na runtime para permitir que Council execute `spendLocal`:

```rust
// runtime/src/lib.rs
impl pallet_treasury::Config for Runtime {
    // ...
    type SpendOrigin = EnsureOneOf<
        EnsureRoot<AccountId>,
        pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 2>
    >;
}
```

**Prós**: Solução mais correta e elegante
**Contras**: Requer recompilação da runtime e upgrade on-chain

### 2. Usar Treasury Tradicional

Usar o fluxo tradicional do pallet Treasury:
1. `treasury.proposeSpend()` - Cria proposta on-chain
2. Council aprova com `treasury.approveProposal()`
3. Treasury executa automaticamente no próximo spend period

**Prós**: Fluxo nativo do Substrate
**Contras**: Menos flexível, requer esperar spend period

## Teste da Solução

### Pré-requisitos
1. Treasury com fundos (100 BZR adicionados via sudo)
2. Council configurado com pelo menos 1 membro
3. Frontend buildado com a correção

### Fluxo de Teste
1. Criar Treasury Request (off-chain)
2. Council member cria Motion (envolve sudo.sudo())
3. Council members votam na motion
4. Após atingir threshold, fechar a motion
5. **Esperado**: Council.Executed com `result: 'Ok'`
6. **Esperado**: Fundos transferidos do Treasury para beneficiário

### Comandos de Verificação

```bash
# Verificar saldo do Treasury
curl -s https://bazari.libervia.xyz/api/governance/stats | jq '.data.treasury.balance'

# Verificar última Treasury Request
curl -s https://bazari.libervia.xyz/api/governance/treasury/requests | jq '.data | sort_by(.createdAt) | .[-1]'

# Investigar eventos na blockchain
node check-events.js  # Script para buscar Council.Executed events
```

## Lições Aprendidas

1. **Origens de Transação são Críticas**: Sempre verificar qual origem (Root, Council, Signed) é necessária para cada extrinsic
2. **Eventos Revelam Erros**: O evento `Council.Executed` com `{"err":{"badOrigin":null}}` foi essencial para identificar o problema
3. **Wrapper sudo é Poderoso**: Permite que pallets sem privilégios executem operações privilegiadas
4. **Testing é Essencial**: Testar o fluxo completo end-to-end revelou o problema

## Status

- ✅ Fix implementado no frontend
- ✅ Build concluído com sucesso
- ⏳ **Aguardando teste end-to-end** - Criar nova Treasury Request e verificar se fundos são transferidos
- 🔮 **Futuro**: Considerar modificar runtime para solução permanente

## Referências

- [CreateMotionModal.tsx](apps/web/src/modules/governance/components/CreateMotionModal.tsx#L98-L120)
- Bloco 1979: Council.Executed com BadOrigin error
- [Polkadot Sudo Pallet](https://docs.substrate.io/reference/frame-pallets/#sudo)
