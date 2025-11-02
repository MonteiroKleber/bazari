# Vesting Module - Vision & Purpose

## 🎯 Vision
**"Implementar sistema de vesting on-chain transparente para fundadores, time, parceiros e marketing, com liberação gradual de tokens BZR ao longo do tempo conforme cronograma pré-definido no genesis."**

## 📋 Purpose
1. **Token Vesting** - Liberação gradual de BZR para stakeholders
2. **Cliff Period** - Período inicial sem liberação
3. **Linear Release** - Tokens liberados por bloco após cliff
4. **Genesis Allocation** - Configurado no genesis da chain
5. **Transparency** - Todos os cronogramas visíveis on-chain

## 🌟 Key Principles
- **On-Chain Native** - Substrate Vesting pallet
- **Immutable Schedule** - Definido no genesis, não alterável
- **Automatic Release** - Tokens desbloqueados automaticamente por bloco
- **Fair Distribution** - Diferentes cronogramas para cada categoria

## 📊 Vesting Categories

| Category | Total Allocation | Cliff | Vesting Duration |
|----------|------------------|-------|------------------|
| Founders | 15M BZR | 12 months | 48 months |
| Team | 10M BZR | 6 months | 36 months |
| Partners | 8M BZR | 3 months | 24 months |
| Marketing | 5M BZR | 0 months | 18 months |

## 🔐 Vesting Mechanics
```
locked: Total amount locked
perBlock: Amount released per block
startingBlock: Block when vesting starts (cliff end)

vested = (currentBlock - startingBlock) * perBlock
unvested = locked - vested
```

## 🔮 Future Features
- Multi-schedule vesting (stacked schedules)
- Vesting for airdrops
- Revocable vesting (emergency)

**Status:** ✅ Implemented (On-Chain via Substrate Vesting Pallet)
