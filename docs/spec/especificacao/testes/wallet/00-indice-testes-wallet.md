# Índice de Testes - Wallet Bazari

## Informações Gerais
- **Projeto**: Bazari Chain - Módulo Wallet
- **Versão**: 1.0
- **Data de Criação**: Outubro 2025
- **Objetivo**: Documentação completa de casos de teste para o módulo wallet

---

## Visão Geral do Módulo Wallet

A wallet Bazari é um módulo completo de gerenciamento de carteira de criptomoedas integrado à aplicação web. Permite aos usuários:

- Criar e importar contas usando mnemonic (seed phrases)
- Gerenciar múltiplas contas
- Visualizar saldos de tokens nativos e customizados
- Enviar e receber fundos
- Visualizar histórico de transações
- Proteger operações sensíveis com PIN

### Tecnologias Utilizadas
- **Framework**: React com TypeScript
- **Blockchain**: Polkadot/Substrate
- **Criptografia**: WebCrypto API
- **Biblioteca de Keyring**: @polkadot/keyring
- **Scanner QR**: @zxing/browser
- **Formulários**: react-hook-form + zod

---

## Estrutura de Documentos

### [01 - Teste de Gerenciamento de Contas](./01-teste-gerenciamento-contas.md)
**Tela**: AccountsPage (`/app/wallet/accounts`)

**Casos de Teste**: CT-001 a CT-020 (20 casos)

**Funcionalidades Testadas**:
- ✅ Criar nova conta com mnemonic gerado
- ✅ Validações de criação (confirmação, PIN, etc)
- ✅ Regenerar mnemonic
- ✅ Importar conta existente
- ✅ Validação de mnemonic inválido
- ✅ Editar nome/rótulo da conta
- ✅ Copiar endereço da conta
- ✅ Definir conta como ativa
- ✅ Exportar conta (revelar mnemonic)
- ✅ Remover conta
- ✅ Validações de segurança

**Componentes Testados**:
- `AccountsPage` (página principal)
- `CreateAccountPanel` (criação de conta)
- `ImportAccountPanel` (importação)
- `ExportAccountPanel` (exportação)
- `RemoveAccountPanel` (remoção)

---

### [02 - Teste de Envio de Fundos](./02-teste-envio-fundos.md)
**Tela**: SendPage (`/app/wallet/send`)

**Casos de Teste**: CT-021 a CT-040 (20 casos)

**Funcionalidades Testadas**:
- ✅ Formulário de envio completo
- ✅ Envio de token nativo (BZR)
- ✅ Envio de assets customizados
- ✅ Validação de saldo insuficiente
- ✅ Validação de endereço inválido
- ✅ Validação de valor inválido
- ✅ Cálculo automático de taxa
- ✅ Confirmação via PIN com detalhes da transação
- ✅ Estados de processamento (Signing, Broadcasting, InBlock, Finalized)
- ✅ Scanner de QR Code para endereço
- ✅ Campo memo opcional
- ✅ Cancelamento de envio
- ✅ Múltiplos envios consecutivos

**Componentes Testados**:
- `SendPage` (página de envio)
- `PinDialog` (confirmação com PIN)
- `Scanner` (leitura de QR Code)
- `AssetBalanceHint` (indicador de saldo)

**Serviços Testados**:
- `balances.ts` (consulta de saldos)
- `polkadot.ts` (API da blockchain)
- `useTransactionFee` (cálculo de taxa)

---

### [03 - Teste de Recebimento](./03-teste-recebimento.md)
**Tela**: ReceivePage (`/app/wallet/receive`)

**Casos de Teste**: CT-041 a CT-060 (20 casos)

**Funcionalidades Testadas**:
- ✅ Exibição de endereço formatado
- ✅ Geração de QR Code
- ✅ Copiar endereço para clipboard
- ✅ Compartilhar endereço (Web Share API)
- ✅ Formato SS58 do endereço
- ✅ Responsividade (mobile/desktop)
- ✅ Alert informativo sobre a rede
- ✅ Atualização ao trocar conta ativa
- ✅ Validação de QR Code com scanner externo
- ✅ Acessibilidade para leitores de tela

**Componentes Testados**:
- `ReceivePage` (página de recebimento)
- `AddressQr` (componente de QR Code)
- `useChainProps` (propriedades da chain)

**Utilitários Testados**:
- `normaliseAddress` (formatação SS58)
- `shortenAddress` (endereço encurtado)

---

### [04 - Teste de Dashboard e Saldos](./04-teste-dashboard-saldos.md)
**Tela**: WalletDashboard (`/app/wallet`)

**Casos de Teste**: CT-061 a CT-090 (30 casos)

**Funcionalidades Testadas**:
- ✅ Dashboard completo (overview)
- ✅ Card de informações da conta
- ✅ Tabela de saldos (livre, reservado, bloqueado)
- ✅ Adicionar tokens customizados
- ✅ Remover tokens
- ✅ Validação de assets inexistentes/duplicados
- ✅ Histórico de transações
- ✅ Paginação de histórico (carregar mais)
- ✅ Atualização em tempo real (subscriptions)
- ✅ Refresh manual de saldos
- ✅ Formatação de valores decimais
- ✅ Responsividade
- ✅ Performance com grandes volumes

**Componentes Testados**:
- `WalletDashboard` (página principal)
- `useVaultAccounts` (hook de contas)
- `useTokens` (store de tokens)
- `useChainProps` (propriedades da chain)

**Serviços Testados**:
- `balances.ts` (getNativeBalance, subscribeNativeBalance, getAssetBalance, subscribeAssetBalance)
- `history.ts` (fetchRecentTransfers, subscribeTransferStream)
- `assets.ts` (fetchAssetMetadata)

---

### [05 - Teste de PIN e Scanner](./05-teste-pin-scanner.md)
**Componentes**: PinDialog, Scanner, PinService

**Casos de Teste**: CT-091 a CT-115 (25 casos)

**Funcionalidades Testadas - PIN**:
- ✅ Dialog de PIN (estrutura e layout)
- ✅ Campo de input (mascarado, numérico)
- ✅ Confirmação de PIN correto
- ✅ Validação de PIN incorreto
- ✅ Cancelamento de operação
- ✅ Detalhes de transação no dialog
- ✅ Warning de saldo insuficiente
- ✅ Validação customizada (async)
- ✅ Múltiplas tentativas
- ✅ Estados de loading

**Funcionalidades Testadas - Scanner**:
- ✅ Abertura do scanner
- ✅ Permissão de câmera (concedida/negada)
- ✅ Leitura de QR Code válido
- ✅ Tratamento de QR Code inválido
- ✅ Preview de câmera em tempo real
- ✅ Fechamento manual do scanner
- ✅ Cleanup de recursos (câmera)
- ✅ Responsividade mobile
- ✅ Múltiplas leituras sequenciais

**Componentes Testados**:
- `PinDialog` (componente de dialog)
- `PinService` (serviço de gerenciamento)
- `Scanner` (componente de scanner)

**Bibliotecas Testadas**:
- `@zxing/browser` (leitura de códigos)

---

## Resumo Quantitativo

| Documento | Casos de Teste | Funcionalidades Principais |
|-----------|----------------|---------------------------|
| 01 - Gerenciamento de Contas | 20 | Criar, importar, exportar, remover, ativar contas |
| 02 - Envio de Fundos | 20 | Enviar tokens, validações, confirmação via PIN |
| 03 - Recebimento | 20 | Exibir endereço, QR Code, compartilhar |
| 04 - Dashboard e Saldos | 30 | Visualizar saldos, histórico, gerenciar tokens |
| 05 - PIN e Scanner | 25 | Segurança PIN, scanner QR Code |
| **TOTAL** | **115** | **5 módulos principais** |

---

## Fluxos Principais de Teste

### Fluxo 1: Onboarding de Novo Usuário
1. **CT-001**: Criar primeira conta
2. **CT-062**: Visualizar dashboard inicial
3. **CT-042**: Visualizar endereço de recebimento
4. **CT-043**: Gerar QR Code para receber fundos

### Fluxo 2: Receber e Visualizar Saldo
1. Receber transação (externo)
2. **CT-078**: Verificar atualização automática de saldo
3. **CT-079**: Verificar transação no histórico
4. **CT-066**: Verificar saldo na tabela

### Fluxo 3: Enviar Fundos
1. **CT-022**: Preencher formulário de envio
2. **CT-027**: Verificar cálculo de taxa
3. **CT-096**: Confirmar detalhes no dialog de PIN
4. **CT-023**: Completar envio com sucesso
5. **CT-036**: Verificar hash da transação

### Fluxo 4: Gerenciar Múltiplas Contas
1. **CT-001**: Criar primeira conta
2. **CT-004**: Importar segunda conta
3. **CT-009**: Alternar entre contas ativas
4. **CT-052**: Verificar mudança de endereço em recebimento
5. **CT-088**: Verificar atualização do dashboard

### Fluxo 5: Adicionar e Usar Token Customizado
1. **CT-067**: Adicionar asset customizado
2. **CT-070**: Verificar na lista de tokens
3. **CT-072**: Verificar saldo do token
4. **CT-031**: Enviar o token customizado
5. **CT-071**: Remover token (opcional)

---

## Cobertura de Testes por Categoria

### Segurança
- ✅ Criptografia de mnemonic com PIN (CT-001, CT-004)
- ✅ Validação de PIN (CT-093, CT-094, CT-099)
- ✅ Mascaramento de PIN (CT-092)
- ✅ Exportação segura de mnemonic (CT-011)
- ✅ Confirmação dupla para remoção (CT-015)
- ✅ Validação de assinatura SIWS (CT-009)

### Validações de Entrada
- ✅ Validação de endereço (CT-025)
- ✅ Validação de valor (CT-026)
- ✅ Validação de saldo (CT-024)
- ✅ Validação de mnemonic (CT-005)
- ✅ Validação de PIN (mínimo 6 caracteres) (CT-002)
- ✅ Validação de asset ID (CT-068, CT-069)

### Interface de Usuário
- ✅ Responsividade mobile (CT-048, CT-082)
- ✅ Responsividade desktop (CT-049, CT-083)
- ✅ Acessibilidade (CT-053, CT-115)
- ✅ Feedback visual (CT-008, CT-044)
- ✅ Estados de loading (CT-084, CT-100)

### Integração com Blockchain
- ✅ Consulta de saldos (CT-066, CT-072)
- ✅ Envio de transações (CT-023)
- ✅ Histórico de transações (CT-074)
- ✅ Subscriptions em tempo real (CT-078, CT-079)
- ✅ Cálculo de taxas (CT-027)
- ✅ Estados de transação (CT-037)

### Gerenciamento de Estado
- ✅ Múltiplas contas (CT-052, CT-088)
- ✅ Tokens customizados (CT-067, CT-070, CT-071)
- ✅ Histórico com paginação (CT-076)
- ✅ Atualização de saldos (CT-073)

---

## Ambientes de Teste

### Requisitos Mínimos
- **Navegadores**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Node.js**: v18+ (para desenvolvimento)
- **Blockchain**: Conexão com testnet Bazari
- **Dispositivos**: Desktop, Tablet, Mobile (iOS e Android)

### Dados de Teste
- Contas de teste (mnemonics)
- Assets de teste na chain
- Endereços de destino para envios
- QR Codes de teste para scanner

### Configuração Recomendada
1. Usar testnet (nunca mainnet)
2. Ter pelo menos 2 contas de teste
3. Saldo inicial de ~100 BZR em cada conta
4. 2-3 assets customizados criados na chain
5. Histórico com 50+ transações para testes de performance

---

## Critérios de Aceitação Geral

### Performance
- Carregamento inicial < 3 segundos
- Cálculo de taxa < 500ms
- Atualização de saldo < 2 segundos
- Paginação de histórico < 1 segundo

### Usabilidade
- Todos os fluxos principais completáveis sem documentação
- Mensagens de erro claras e acionáveis
- Feedback visual em todas as ações
- Acessibilidade WCAG 2.1 nível AA

### Segurança
- PIN nunca exposto em logs ou console
- Mnemonic apenas revelado com confirmação
- Validação de todas as entradas do usuário
- Proteção contra ataques comuns (XSS, etc)

### Confiabilidade
- Sem erros em console em fluxos normais
- Tratamento adequado de erros de rede
- Recovery de falhas de blockchain
- Cleanup adequado de recursos (câmera, subscriptions)

---

## Matriz de Rastreabilidade

| Requisito Funcional | Casos de Teste Relacionados |
|---------------------|---------------------------|
| RF-001: Gerenciar contas | CT-001 a CT-020 |
| RF-002: Enviar fundos | CT-021 a CT-040 |
| RF-003: Receber fundos | CT-041 a CT-060 |
| RF-004: Visualizar saldos | CT-061 a CT-090 |
| RF-005: Segurança PIN | CT-091 a CT-102 |
| RF-006: Scanner QR | CT-103 a CT-115 |
| RF-007: Histórico de transações | CT-074 a CT-079 |
| RF-008: Tokens customizados | CT-067 a CT-072 |

---

## Instruções para Execução dos Testes

### Preparação
1. Configurar ambiente de desenvolvimento
2. Conectar à testnet Bazari
3. Criar contas de teste
4. Preparar dados de teste (QR Codes, assets, etc)

### Ordem de Execução Recomendada
1. **Fase 1 - Fundação**: Gerenciamento de Contas (CT-001 a CT-020)
2. **Fase 2 - Visualização**: Recebimento e Dashboard (CT-041 a CT-090)
3. **Fase 3 - Transações**: Envio de Fundos (CT-021 a CT-040)
4. **Fase 4 - Componentes**: PIN e Scanner (CT-091 a CT-115)
5. **Fase 5 - Integração**: Fluxos completos end-to-end

### Registro de Execução
Para cada caso de teste:
- ✅ **Passou**: Funcionou conforme esperado
- ❌ **Falhou**: Não funcionou, registrar bug
- ⚠️ **Parcial**: Funcionou com ressalvas
- 🔄 **Não testado**: Ainda não executado
- 🚫 **Bloqueado**: Dependência não resolvida

---

## Relatório de Testes (Template)

```markdown
## Execução de Testes - [Data]

### Executado por: [Nome]
### Ambiente: [Testnet/Local/etc]
### Navegador: [Chrome/Firefox/etc]

### Resumo
- Total de casos: 115
- Executados: X
- Passaram: Y
- Falharam: Z
- Bloqueados: W

### Bugs Encontrados
1. [ID] - [Título] - [Severidade] - [CT relacionado]

### Observações
[Notas gerais sobre a execução]
```

---

## Referências

### Documentação Técnica
- [Polkadot.js API](https://polkadot.js.org/docs/)
- [Substrate Documentation](https://docs.substrate.io/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)

### Código Fonte
- `/apps/web/src/modules/wallet/pages/` - Páginas da wallet
- `/apps/web/src/modules/wallet/components/` - Componentes
- `/apps/web/src/modules/wallet/services/` - Serviços
- `/apps/web/src/modules/auth/` - Autenticação e criptografia

---

## Changelog

| Versão | Data | Alterações |
|--------|------|-----------|
| 1.0 | Out/2025 | Versão inicial com 115 casos de teste |

---

## Glossário

- **Asset**: Token customizado (não nativo) na blockchain
- **BZR**: Token nativo da blockchain Bazari
- **Mnemonic**: Frase de recuperação de 12 ou 24 palavras
- **PIN**: Código numérico de 6+ dígitos para proteger operações
- **SS58**: Formato de endereço da rede Substrate/Polkadot
- **Planck**: Menor unidade de um token (similar a satoshi para Bitcoin)
- **Free Balance**: Saldo livre (não reservado nem bloqueado)
- **Reserved Balance**: Saldo reservado (locked para operações específicas)
- **Frozen Balance**: Saldo bloqueado (não transferível)
- **SIWS**: Sign-In With Substrate (autenticação baseada em assinatura)
