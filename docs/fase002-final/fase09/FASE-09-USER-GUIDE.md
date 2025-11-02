# FASE 9 - VESTING SYSTEM - Guia do Usuário

**Versão**: 1.0
**Data**: 30 de Outubro de 2025

---

## 📚 O Que é Vesting?

### Definição Simples
**Vesting** é a liberação gradual de tokens ao longo do tempo. Em vez de receber todos os tokens de uma vez, eles são "desbloqueados" aos poucos, seguindo um cronograma pré-definido.

### Por Que Usar Vesting?
- **Alinhamento de Interesses**: Garante comprometimento de longo prazo
- **Estabilidade**: Evita dumps massivos de tokens
- **Confiança**: Demonstra transparência na distribuição

---

## 🎯 Token Economics do Bazari

### Supply Total
**1,000,000,000 BZR** (1 bilhão de tokens)

### Alocação para Vesting
**380,000,000 BZR** (38% do supply)

Distribuído em 4 categorias:

| Categoria | Tokens | Duração | Cliff |
|-----------|--------|---------|-------|
| 👥 **Fundadores** | 150M BZR | 4 anos | 1 ano |
| 🛠️ **Equipe** | 100M BZR | 3 anos | 6 meses |
| 🤝 **Parceiros** | 80M BZR | 2 anos | 3 meses |
| 📢 **Marketing** | 50M BZR | 1 ano | Sem cliff |

---

## 📖 Glossário

### Termos Importantes

**Vesting**
- Liberação gradual de tokens ao longo do tempo

**Cliff**
- Período inicial onde **nenhum** token é liberado
- Exemplo: Cliff de 1 ano = nada é liberado no primeiro ano

**Locked**
- Tokens que ainda não foram liberados
- Não podem ser transferidos ou gastos

**Vested**
- Tokens já liberados e disponíveis para uso
- Podem ser transferidos, gastos, etc.

**Per Block**
- Quantidade de tokens liberados a cada bloco
- Bazari: 1 bloco = 6 segundos

**Schedule**
- Cronograma completo de vesting de uma conta

---

## 🚀 Como Acessar

### 1. Acesse a Página de Vesting

**URL**: `https://bazari.libervia.xyz/vesting`

Ou pelo menu principal:
1. Faça login no Bazari
2. Clique em **Menu** (☰)
3. Selecione **Vesting**

### 2. Visualize o Dashboard

A página mostra:
- **Total Alocado**: Todos os tokens em vesting
- **Total Liberado**: Tokens já disponíveis
- **Ainda Locked**: Tokens aguardando liberação
- **Progresso**: Percentagem já liberada

---

## 📊 Entendendo a Interface

### Stats Overview (4 Cards)

#### 1. Total Alocado
```
380,000,000 BZR
🔒 Tokens em vesting
```
Todos os tokens que estão em esquema de vesting.

#### 2. Total Liberado
```
95,000,000 BZR (exemplo)
🔓 Disponível para uso
```
Soma de todos os tokens já liberados de todas as categorias.

#### 3. Ainda Locked
```
285,000,000 BZR (exemplo)
⏰ Aguardando liberação
```
Tokens que ainda não foram liberados.

#### 4. Progresso
```
25.00%
[████████████░░░░░░░░░░░░░░░░░░░░]
```
Percentagem já liberada do total.

---

### Tabs de Categorias

Clique em cada tab para ver detalhes:

#### 👥 Fundadores
```
Total Locked:    150,000,000 BZR
Liberado:         37,500,000 BZR
Locked:          112,500,000 BZR
Progresso:              25.00%

📅 Detalhes do Schedule:
• Início: Block #5,256,000 (após 1 ano)
• Duração: 21,024,000 blocks (4 anos)
• Cliff: 5,256,000 blocks (1 ano)
```

**Interpretação**:
- Cliff de 1 ano = nenhum token nos primeiros 5.256.000 blocks
- Após o cliff, liberação gradual por 4 anos
- A cada bloco, ~7,134 BZR são liberados

#### 🛠️ Equipe
```
Total Locked:    100,000,000 BZR
Liberado:         50,000,000 BZR
Locked:           50,000,000 BZR
Progresso:              50.00%

📅 Detalhes do Schedule:
• Início: Block #2,628,000 (após 6 meses)
• Duração: 15,768,000 blocks (3 anos)
• Cliff: 2,628,000 blocks (6 meses)
```

#### 🤝 Parceiros
```
Total Locked:     80,000,000 BZR
Liberado:          7,600,000 BZR
Locked:           72,400,000 BZR
Progresso:               9.50%

📅 Detalhes do Schedule:
• Início: Block #1,314,000 (após 3 meses)
• Duração: 10,512,000 blocks (2 anos)
• Cliff: 1,314,000 blocks (3 meses)
```

#### 📢 Marketing
```
Total Locked:     50,000,000 BZR
Liberado:         12,500,000 BZR
Locked:           37,500,000 BZR
Progresso:              25.00%

📅 Detalhes do Schedule:
• Início: Block #0 (imediato)
• Duração: 5,256,000 blocks (1 ano)
• Cliff: 0 blocks (sem cliff)
```

---

## ⏰ Timeline de Liberação

### Exemplo: Fundadores (150M BZR)

| Tempo | Block # | Liberado | % |
|-------|---------|----------|---|
| **Início** | 0 | 0 BZR | 0% |
| **6 meses** | 2,628,000 | 0 BZR | 0% |
| **1 ano (cliff termina)** | 5,256,000 | 0 BZR | 0% |
| **1.5 anos** | 7,884,000 | 18.75M BZR | 12.5% |
| **2 anos** | 10,512,000 | 37.5M BZR | 25% |
| **3 anos** | 15,768,000 | 75M BZR | 50% |
| **4 anos** | 21,024,000 | 112.5M BZR | 75% |
| **5 anos (fim)** | 26,280,000 | 150M BZR | 100% |

**Observação**: Durante o cliff (primeiro ano), **nenhum** token é liberado, mesmo que o tempo passe.

---

## 🔢 Cálculos Úteis

### Conversão de Blocos para Tempo

**Block Time**: 6 segundos

| Blocos | Tempo |
|--------|-------|
| 10 | 1 minuto |
| 600 | 1 hora |
| 14,400 | 1 dia |
| 432,000 | 1 mês (30 dias) |
| 5,256,000 | 1 ano (365 dias) |

### Calculando Tokens Liberados

**Fórmula**:
```
blocks_passados = block_atual - block_inicio
tokens_liberados = per_block × blocks_passados
```

**Exemplo** (Fundadores):
```
Block atual: 10,512,000
Block início: 5,256,000
Blocks passados: 10,512,000 - 5,256,000 = 5,256,000

Per block: 7,134 BZR
Tokens liberados: 7,134 × 5,256,000 = 37,500,024 BZR ≈ 37.5M BZR
```

---

## ❓ FAQ - Perguntas Frequentes

### 1. Como sei quantos tokens já foram liberados?

Acesse a página de Vesting e veja o card "Total Liberado" ou clique na tab da categoria específica.

### 2. Quando posso usar meus tokens vestidos?

Tokens são liberados gradualmente. Você pode usar os tokens **já liberados** (mostrados em verde na interface) a qualquer momento.

### 3. O que é o "cliff period"?

É o período inicial onde **nenhum** token é liberado. Por exemplo, se o cliff é de 1 ano, você não recebe nada no primeiro ano. Após o cliff, a liberação começa.

### 4. Posso acelerar o vesting?

Não. O vesting segue um cronograma fixo definido no blockchain. Não há como acelerar ou alterar.

### 5. O que acontece se eu não "clamar" os tokens?

Os tokens continuam sendo liberados automaticamente. Você não precisa fazer nada. Eles ficam disponíveis na conta.

### 6. Posso transferir tokens locked?

Não. Apenas tokens **já liberados** (vested) podem ser transferidos. Tokens locked permanecem na conta até serem liberados.

### 7. Como funciona o cálculo "per block"?

A cada bloco (6 segundos), uma pequena quantidade de tokens é liberada. Por exemplo, Fundadores recebem ~7,134 BZR por bloco.

### 8. Onde vejo o block atual?

Na página de Vesting, o "Block Atual" é mostrado em cada categoria. Você também pode ver no explorer da blockchain.

### 9. O vesting para se eu não usar os tokens?

Não. O vesting continua independentemente de você usar ou não os tokens. É baseado apenas no tempo (blocos).

### 10. Posso criar meu próprio schedule de vesting?

Atualmente, apenas administradores (via sudo) podem criar schedules de vesting. Em breve, isso será possível via governance.

---

## 🔐 Segurança e Transparência

### Contas Públicas
Todas as contas de vesting são públicas e auditáveis:

```
Fundadores:  0x714a0df32c1ea7c5d9836ded01eb47e66e4116f0bded907b454a8b9fd72ecee5
Equipe:      0x64dabd5108446dfaeaf947d5eab1635070dae096c735ea790be97303dde602ca
Parceiros:   0x0a11a8290d0acfe65c8ae624f725e85c2e9b7cef820f591220c17b8432a4905d
Marketing:   0x76bcbbfb178cef58a8ebe02149946ab9571acf04cf020e7c70ef4a495d4ad86e
```

Você pode verificar o saldo de qualquer conta no explorer.

### Imutabilidade
Os schedules de vesting são definidos no genesis da blockchain e **não podem ser alterados** arbitrariamente. Qualquer mudança requer upgrade de runtime via governance.

### Auditabilidade
Todos os eventos de vesting são registrados on-chain:
- `VestingUpdated`: Quando tokens são liberados
- `VestingCompleted`: Quando todo o vesting termina

---

## 📞 Suporte

### Precisa de Ajuda?

**Documentação Técnica**: `/docs/fase002-final/fase09/`

**Issues no GitHub**: [github.com/anthropics/bazari](https://github.com/anthropics/bazari)

**Discord**: [discord.gg/bazari](https://discord.gg/bazari)

**Email**: suporte@bazari.xyz

---

## 🎓 Recursos Adicionais

### Aprenda Mais

- [O que é Token Vesting?](https://www.investopedia.com/terms/v/vesting.asp)
- [Substrate Vesting Pallet](https://docs.substrate.io/reference/frame-pallets/#vesting)
- [Token Economics 101](https://academy.binance.com/en/articles/what-is-tokenomics)

### Explorer Blockchain

Acesse o explorer para ver transações e eventos:
- **Local**: http://localhost:9944
- **Produção**: https://polkadot.js.org/apps/?rpc=wss://bazari.libervia.xyz

---

**Versão**: 1.0
**Última Atualização**: 2025-10-30 22:50 UTC
**Dúvidas?** Entre em contato conosco!
