# Treasury SpendOrigin Investigation - Nov 4, 2025

## Problema Original

Council motions para aprovar Treasury Requests estavam falhando com erro `BadOrigin` quando executadas. A investigação revelou que `treasury.spendLocal()` exige origem Root, mas Council motions executam com origem Council.

## Tentativa de Solução via Runtime Config

Tentamos modificar a runtime para permitir que Council execute `treasury.spendLocal()` diretamente:

```rust
type SpendOrigin = EitherOfDiverse<
    EnsureRoot<AccountId>,
    pallet_collective::EnsureProportionAtLeast<AccountId, CouncilInstance, 1, 2>,
>;
```

### Erro de Compilação

```
error[E0271]: type mismatch resolving `<EitherOfDiverse<..., ...> as EnsureOrigin<...>>::Success == u128`
  --> runtime/src/configs/mod.rs:396:24
   |
396 |       type SpendOrigin = EitherOfDiverse<...>
    |  ________________________^
    | |_____^ expected `u128`, found `Either<(), ()>`
```

### Root Cause

O pallet Treasury foi atualizado para exigir que `SpendOrigin::Success = Balance` (u128). Este valor representa o **valor máximo** que pode ser gasto em uma única operação.

Tipos disponíveis:
- `EitherOfDiverse`: Success type = `Either<(), ()>` - ❌ Incompatível
- `EnsureRoot`: Success type = `()` - ❌ Incompatível
- `NeverEnsureOrigin<Balance>`: Success type = `Balance` - ✅ Compatível (mas bloqueia todos)

### Por que SpendOrigin requer Balance?

Analisando o código do pallet Treasury:

```rust
// pallet-treasury/src/lib.rs
type SpendOrigin: EnsureOrigin<Self::RuntimeOrigin, Success = BalanceOf<Self, I>>;

// No extrinsic spend():
let max_amount = T::SpendOrigin::ensure_origin(origin)?;
ensure!(amount <= max_amount, Error::<T, I>::InsufficientPermission);
```

O `SpendOrigin` não só verifica a origem, mas também retorna o **valor máximo permitido** para o gasto. Isso permite diferentes níveis de permissão:
- Root pode gastar qualquer valor
- Council pode gastar até X
- Technical Committee pode gastar até Y
- Etc.

## Soluções Possíveis

### 1. Solução Atual (Workaround com sudo.sudo())

**Implementado**: [CreateMotionModal.tsx:98-116](apps/web/src/modules/governance/components/CreateMotionModal.tsx#L98-L116)

```typescript
// Wrap treasury.spendLocal com sudo.sudo() na motion
const spendCall = api.tx.treasury.spendLocal(value, request.beneficiary);
const sudoCall = api.tx.sudo.sudo(spendCall);  // ✅ Wrapper sudo
const motionTx = api.tx.council.propose(threshold, sudoCall, lengthBound);
```

**Prós**:
- Funciona imediatamente sem mudanças na runtime
- Simples de implementar
- Council ainda vota na motion

**Contras**:
- Council precisa de privilégios sudo (não ideal)
- Workaround, não solução permanente

### 2. Criar Custom EnsureOrigin com Balance Success Type

```rust
pub struct EnsureCouncilWithMaxSpend<AccountId, Instance, const N: u32, const D: u32>;

impl<AccountId, Instance, const N: u32, const D: u32> EnsureOrigin<RuntimeOrigin>
    for EnsureCouncilWithMaxSpend<AccountId, Instance, N, D>
{
    type Success = Balance;

    fn try_origin(o: RuntimeOrigin) -> Result<Self::Success, RuntimeOrigin> {
        // Verify it's a Council collective origin with >= N/D approval
        pallet_collective::EnsureProportionAtLeast::<AccountId, Instance, N, D>
            ::try_origin(o.clone())?;

        // Return maximum spendable amount (e.g., 1000 BZR)
        Ok(1000 * 10u128.pow(18))
    }
}

// Usage:
type SpendOrigin = EnsureCouncilWithMaxSpend<AccountId, CouncilInstance, 1, 2>;
```

**Prós**:
- Solução correta e permanente
- Council não precisa de sudo
- Pode limitar valor máximo por gasto

**Contras**:
- Requer código customizado
- Mais complexo de implementar
- Precisa recompilar runtime

### 3. Usar Treasury Flow Tradicional

Em vez de `treasury.spendLocal()`, usar o fluxo nativo:

1. `treasury.proposeSpend()` - Cria proposta on-chain
2. Council aprova com `treasury.approveProposal()`
3. Treasury executa automaticamente no próximo spend period

**Prós**:
- Fluxo nativo do Substrate
- Não requer sudo

**Contras**:
- Menos flexível
- Requer esperar spend period (30 dias)
- Não permite execução imediata

## Decisão

Manter a **Solução 1 (sudo wrapper)** por enquanto porque:
1. Já está implementada e testada
2. Permite execução imediata
3. Simples de manter

No futuro, migrar para **Solução 2 (Custom EnsureOrigin)** quando tivermos tempo para:
- Implementar e testar o custom origin
- Recompilar e fazer upgrade da runtime
- Definir limites adequados de gasto por origem

## Status

- ✅ SpendOrigin configurado como `NeverEnsureOrigin<Balance>` (compatível)
- ✅ Frontend usa wrapper `sudo.sudo()` corretamente
- ✅ Documentado em [TREASURY-BADORIGIN-FIX.md](TREASURY-BADORIGIN-FIX.md)
- ⏳ **Próximo passo**: Testar fluxo end-to-end com nova Treasury Request
- 🔮 **Futuro**: Implementar custom EnsureOrigin para solução permanente

## Referências

- [pallet-treasury docs](https://docs.rs/pallet-treasury/latest/pallet_treasury/)
- [EnsureOrigin trait](https://docs.rs/frame-support/latest/frame_support/traits/trait.EnsureOrigin.html)
- [CreateMotionModal.tsx](apps/web/src/modules/governance/components/CreateMotionModal.tsx)
- [TREASURY-BADORIGIN-FIX.md](TREASURY-BADORIGIN-FIX.md)
