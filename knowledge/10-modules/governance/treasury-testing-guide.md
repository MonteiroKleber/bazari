# Treasury Council Flow - Guia de Testes

**Data**: 2025-11-03
**Status**: Pronto para testes

## Pré-requisitos

1. ✅ Wallet conectada (Polkadot.js extension)
2. ✅ Conta com saldo BZR para taxas
3. ✅ Pelo menos 1 conta Council member (para testes completos)

---

## Teste 1: Criar Solicitação de Tesouro

### Passo a Passo

1. **Acessar página de criação**
   ```
   https://bazari.libervia.xyz/app/governance/treasury/requests/new
   ```

2. **Preencher formulário**
   - **Título**: "Teste de Solicitação Treasury #1"
   - **Descrição**: "Esta é uma solicitação de teste para validar o fluxo completo do Treasury via Council approval."
   - **Valor (BZR)**: 100.00
   - **Beneficiário**: `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` (ou sua conta)

3. **Enviar solicitação**
   - Clique em "Enviar Solicitação"
   - Wallet irá solicitar assinatura da mensagem
   - Confirme a assinatura

4. **Resultado Esperado**
   - Toast de sucesso: "Solicitação criada!"
   - Redirecionamento para `/app/governance/treasury/requests`
   - Solicitação aparece na lista com status "Pendente Revisão"

### Verificação Backend
```bash
# Verificar no banco de dados
PGPASSWORD=bazari psql -h localhost -U bazari -d bazari_db -c \
  "SELECT id, title, status, proposer FROM governance_treasury_requests ORDER BY id DESC LIMIT 5;"
```

---

## Teste 2: Listar Solicitações

### Passo a Passo

1. **Acessar página de listagem**
   ```
   https://bazari.libervia.xyz/app/governance/treasury/requests
   ```

2. **Verificar elementos da página**
   - ✅ Header com título "Solicitações de Tesouro"
   - ✅ Botão "Nova Solicitação"
   - ✅ Botão "Atualizar"
   - ✅ Filtro de status (dropdown)
   - ✅ Cards de estatísticas (Total, Em Votação, Aprovadas)
   - ✅ Lista de solicitações em grid

3. **Testar filtros**
   - Filtrar por "Todos os Status" ✅
   - Filtrar por "Pendente Revisão" ✅
   - Filtrar por "Em Votação" ✅
   - Filtrar por "Aprovadas" ✅

4. **Clicar em card de solicitação**
   - Deve redirecionar para página de detalhes

### API Test
```bash
# Listar todas
curl https://bazari.libervia.xyz/api/governance/treasury/requests | jq

# Filtrar por status
curl "https://bazari.libervia.xyz/api/governance/treasury/requests?status=PENDING_REVIEW" | jq

# Filtrar por proposer
curl "https://bazari.libervia.xyz/api/governance/treasury/requests?proposer=5GrwvaEF..." | jq
```

---

## Teste 3: Ver Detalhes da Solicitação

### Passo a Passo

1. **Acessar detalhes**
   ```
   https://bazari.libervia.xyz/app/governance/treasury/requests/1
   ```

2. **Verificar seções**
   - ✅ Header com badges (Tesouro, Status, #ID)
   - ✅ Título da solicitação
   - ✅ Card de Descrição
   - ✅ Card "Informações Financeiras" (valor)
   - ✅ Card "Participantes" (proposer, beneficiário)
   - ✅ Card "Timeline" (datas)

3. **Se você é Council Member**
   - ✅ Deve aparecer card roxo "Você é membro do Council"
   - ✅ Botão "Criar Motion" deve estar visível

4. **Se não é Council Member**
   - Card roxo não aparece
   - Pode visualizar, mas não pode criar motion

### API Test
```bash
# Ver detalhes específicos
curl https://bazari.libervia.xyz/api/governance/treasury/requests/1 | jq

# Verificar se é Council member
curl "https://bazari.libervia.xyz/api/governance/council/is-member/5GrwvaEF..." | jq
```

---

## Teste 4: Criar Motion (Council Member)

### Pré-requisito
✅ Você deve ser Council Member (verificar na blockchain)

### Passo a Passo

1. **Na página de detalhes, clicar "Criar Motion"**

2. **Preencher modal**
   - **Threshold**: 1 (número de votos necessários)
   - Revisar informações da solicitação
   - Clicar "Criar Motion"

3. **Transação on-chain**
   - Polkadot.js irá solicitar assinatura da transação
   - Confirmar e aguardar inclusão no bloco

4. **Resultado Esperado**
   - Toast de sucesso: "Motion criada!"
   - Modal fecha automaticamente
   - Página atualiza mostrando seção "Votação do Council"
   - Status muda para "Em Votação"

### Verificação Blockchain
```bash
# Via Polkadot.js Apps
# https://polkadot.js.org/apps/?rpc=ws://localhost:9944#/council/motions
# Deve aparecer uma nova motion para treasury.spendLocal
```

---

## Teste 5: Votar em Motion (Council Members)

### Pré-requisito
✅ Motion criada e em votação

### Passo a Passo

1. **Acessar detalhes da solicitação**
   - Seção "Votação do Council" deve estar visível

2. **Verificar elementos**
   - ✅ Motion hash exibido
   - ✅ Contadores de votos (SIM e NÃO)
   - ✅ Lista de votos já registrados (se houver)
   - ✅ Botões "Votar NÃO" e "Votar SIM" (se Council member)

3. **Clicar "Votar SIM"**
   - Polkadot.js solicita assinatura
   - Confirmar transação
   - Aguardar inclusão

4. **Resultado Esperado**
   - Toast: "Voto registrado! Você votou SIM na motion."
   - Página atualiza automaticamente
   - Contador "Votos SIM" incrementado
   - Seu voto aparece na lista

5. **Repetir com outros Council members**
   - Alternar contas na wallet
   - Votar SIM ou NÃO
   - Verificar que cada member pode votar apenas 1 vez

### API Test
```bash
# Listar votos de uma motion
# (via endpoint de detalhes)
curl https://bazari.libervia.xyz/api/governance/treasury/requests/1 | jq '.data.votes'
```

---

## Teste 6: Encerrar Votação

### Pré-requisito
✅ Threshold atingido (ex: 1 voto SIM se threshold=1)

### Passo a Passo

1. **Na página de detalhes, clicar "Encerrar Votação"**

2. **Transação on-chain**
   - Polkadot.js solicita assinatura
   - Confirmar `council.close()`
   - Aguardar inclusão

3. **Resultado Esperado**
   - Toast: "Motion encerrada! A votação foi encerrada e o resultado foi processado."
   - Se aprovado: `treasury.spendLocal` executado automaticamente
   - Status muda para "APPROVED"
   - Beneficiário recebe fundos

4. **Verificar transferência**
   ```bash
   # No Polkadot.js Apps > Explorer
   # Procurar eventos:
   # - council.Closed
   # - council.Executed
   # - treasury.SpendApproved
   # - balances.Transfer (para o beneficiário)
   ```

---

## Teste 7: Fluxo Completo End-to-End

### Cenário Completo

**Personagens**:
- Alice: Proposer (usuário comum)
- Bob: Council Member 1
- Charlie: Council Member 2

**Passos**:

1. **Alice cria solicitação**
   - Título: "Campanha de Marketing Q4"
   - Valor: 5000 BZR
   - Beneficiário: Alice
   - Status: PENDING_REVIEW ✅

2. **Bob (Council) cria motion**
   - Threshold: 2 votos
   - Motion hash: 0xabc...
   - Status: IN_VOTING ✅

3. **Bob vota SIM**
   - Votos SIM: 1
   - Votos NÃO: 0 ✅

4. **Charlie vota SIM**
   - Votos SIM: 2
   - Votos NÃO: 0
   - Threshold atingido! ✅

5. **Qualquer um encerra votação**
   - Motion executada
   - Status: APPROVED
   - Alice recebe 5000 BZR ✅

---

## Casos de Erro para Testar

### 1. Validação de Formulário
❌ Título vazio → "Título é obrigatório"
❌ Valor zero → "Valor deve ser maior que zero"
❌ Endereço inválido → "Endereço SS58 inválido"

### 2. Permissões
❌ Não-Council member tenta criar motion → Botão não aparece
❌ Não-Council member tenta votar → "Apenas membros do Council podem votar"

### 3. Assinatura
❌ Cancelar assinatura na wallet → "Falha ao enviar solicitação"
❌ Assinatura inválida → Backend retorna 400 "Invalid signature"

### 4. Motion já encerrada
❌ Tentar votar após encerramento → Botões desabilitados

---

## Comandos Úteis

### Backend Logs
```bash
# Ver logs da API
journalctl -u bazari-api -f

# Ver últimas 50 linhas
journalctl -u bazari-api -n 50 --no-pager
```

### Database Queries
```bash
# Listar todas solicitações
PGPASSWORD=bazari psql -h localhost -U bazari -d bazari_db -c \
  "SELECT * FROM governance_treasury_requests;"

# Listar todos os votos
PGPASSWORD=bazari psql -h localhost -U bazari -d bazari_db -c \
  "SELECT * FROM governance_council_votes;"

# Solicitações por status
PGPASSWORD=bazari psql -h localhost -U bazari -d bazari_db -c \
  "SELECT status, COUNT(*) FROM governance_treasury_requests GROUP BY status;"
```

### Blockchain Queries
```javascript
// No Polkadot.js Apps > Developer > JavaScript

// Ver Treasury balance
const treasuryAccount = api.consts.treasury.palletId;
const { data: balance } = await api.query.system.account(treasuryAccount);
console.log('Treasury:', balance.free.toHuman());

// Ver Council members
const members = await api.query.council.members();
console.log('Council:', members.map(m => m.toString()));

// Ver motions ativas
const motions = await api.query.council.proposals();
console.log('Motions:', motions.length);
```

---

## Checklist de Validação

### Backend ✅
- [x] API iniciando sem erros
- [x] 6 endpoints respondendo
- [x] Validação de assinatura funcionando
- [x] Permissões de Council verificadas
- [x] Database com dados corretos

### Frontend ✅
- [x] 3 páginas renderizando
- [x] 4 componentes funcionais
- [x] 3 hooks retornando dados
- [x] Rotas navegáveis
- [x] TypeScript compilando

### Integração ❓ (Pendente)
- [ ] Criar solicitação funcionando
- [ ] Council member identificado corretamente
- [ ] Criar motion funcionando
- [ ] Votar funcionando
- [ ] Encerrar votação funcionando
- [ ] Fundos transferidos corretamente

---

## Troubleshooting

### Problema: "Wallet não conectada"
**Solução**: Instalar Polkadot.js extension e criar/importar conta

### Problema: "Invalid signature"
**Solução**: Verificar que está usando mesma conta que criou solicitação

### Problema: "Only council members can vote"
**Solução**: Verificar com `api.query.council.members()` se conta está no Council

### Problema: Motion não aparece na blockchain
**Solução**:
- Verificar logs: `journalctl -u bazari-chain -n 50`
- Verificar se chain está sincronizada
- Verificar gas/fees suficientes

### Problema: Fundos não transferidos após aprovação
**Solução**:
- Verificar eventos `treasury.SpendApproved`
- Verificar `PayoutPeriod` (pode haver delay)
- Verificar saldo do Treasury

---

## Resultado Esperado Final

Após todos os testes:

✅ Usuário comum consegue criar solicitações
✅ Council members conseguem criar motions
✅ Council members conseguem votar
✅ Qualquer um consegue encerrar votação
✅ Fundos são transferidos automaticamente
✅ Status é atualizado corretamente em cada etapa
✅ UI/UX está intuitiva e clara

---

**Status**: Pronto para testes funcionais
**Próximo passo**: Executar Teste 7 (Fluxo Completo End-to-End)
