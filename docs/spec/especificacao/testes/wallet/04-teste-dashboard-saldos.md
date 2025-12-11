# Teste de Dashboard e Saldos - Wallet Bazari

## Informações do Documento
- **Módulo**: Wallet - Dashboard e Gerenciamento de Saldos
- **Tela**: WalletDashboard (`/app/wallet`)
- **Objetivo**: Validar funcionalidades de visualização de saldos, histórico de transações e gerenciamento de tokens

---

## Pré-requisitos
- Aplicação rodando e acessível
- Ter pelo menos uma conta ativa
- Conexão com blockchain funcionando
- (Opcional) Ter transações históricas para validar histórico

---

## CT-061: Acessar Dashboard sem Conta Ativa

### Objetivo
Verificar comportamento ao acessar dashboard sem conta ativa

### Pré-condições
- Não ter conta ativa
- Acessar `/app/wallet`

### Passos
1. Acessar a URL `/app/wallet` sem conta ativa

### Resultado Esperado
- Card informativo é exibido com bordas tracejadas
- Título: "Nenhuma conta ativa" ou similar
- Descrição: "Crie ou importe uma conta para começar" ou similar
- Botão "Ir para Contas" é exibido
- Ao clicar no botão, usuário é redirecionado para `/app/wallet/accounts`

### Evidências
- Screenshot do dashboard sem conta ativa

---

## CT-062: Visualizar Layout do Dashboard

### Objetivo
Verificar se todos os componentes do dashboard são exibidos corretamente

### Pré-condições
- Ter conta ativa com saldo
- Estar em `/app/wallet`

### Passos
1. Acessar o dashboard da wallet
2. Observar todos os cards e seções

### Resultado Esperado
Dashboard exibe as seguintes seções:
1. **Card de Conta**:
   - Título: "Conta Ativa" ou similar
   - Endereço completo da conta em formato code
   - Botão "Copiar Endereço"
   - Botão "Receber" com ícone
   - Botão "Enviar" com ícone
   - Status: "Pronto" ou "Carregando"
   - Número de contas totais

2. **Card de Tokens**:
   - Título: "Tokens"
   - Campo de input "ID do Asset"
   - Botão "Verificar" / "Adicionar"
   - Lista de tokens ativos
   - Botão "Remover" em cada token

3. **Tabela de Saldos**:
   - Título: "Saldos"
   - Botão "Atualizar"
   - Colunas: Ativo, Livre, Reservado, Bloqueado, Ações
   - Linha para token nativo (BZR)
   - Linhas para cada token adicionado

4. **Tabela de Histórico**:
   - Título: "Histórico de Transações"
   - Colunas: Data/Hora, Evento, Contraparte, Valor, Hash
   - Lista de transações recentes
   - Botão "Carregar Mais"

### Evidências
- Screenshots de cada seção do dashboard

---

## CT-063: Card de Conta - Informações Exibidas

### Objetivo
Verificar se as informações da conta são exibidas corretamente

### Pré-condições
- Conta ativa
- Dashboard aberto

### Passos
1. Observar o card de conta no dashboard
2. Verificar cada informação exibida

### Resultado Esperado
- **Endereço**: Exibido completo em formato monospace, pode ser copiado
- **Status**: "Pronto" quando carregado, "Carregando" durante inicialização
- **Número de contas**: Exibe quantidade total de contas (ex: "2")
- **Botões de ação**:
  - "Copiar Endereço": Copia endereço para clipboard
  - "Receber" com ícone de seta para baixo: Redireciona para `/app/wallet/receive`
  - "Enviar" com ícone de seta para cima: Redireciona para `/app/wallet/send`

### Evidências
- Screenshot do card de conta completo

---

## CT-064: Copiar Endereço do Dashboard

### Objetivo
Verificar funcionalidade de copiar endereço

### Pré-condições
- Dashboard aberto

### Passos
1. Clicar no botão "Copiar Endereço" no card de conta
2. Abrir bloco de notas e colar

### Resultado Esperado
- Endereço é copiado para clipboard
- Ao colar, endereço completo aparece
- Pode haver feedback visual (não especificado no código, mas desejável)

### Evidências
- Screenshot do endereço colado

---

## CT-065: Navegação para Receber e Enviar

### Objetivo
Verificar se os botões de navegação funcionam

### Pré-condições
- Dashboard aberto

### Passos
1. Clicar no botão "Receber"
2. Verificar redirecionamento
3. Voltar ao dashboard
4. Clicar no botão "Enviar"
5. Verificar redirecionamento

### Resultado Esperado
- Botão "Receber" redireciona para `/app/wallet/receive`
- Botão "Enviar" redireciona para `/app/wallet/send`
- Links funcionam corretamente

### Evidências
- Screenshots das telas de destino

---

## CT-066: Tabela de Saldos - Token Nativo

### Objetivo
Verificar se o saldo do token nativo é exibido corretamente

### Pré-condições
- Conta ativa com saldo de BZR
- Dashboard aberto

### Passos
1. Localizar a tabela de "Saldos"
2. Encontrar linha do token nativo (BZR)
3. Observar todas as colunas

### Resultado Esperado
Linha do token nativo exibe:
- **Ativo**: Nome "BZR" com badge mostrando símbolo
- **Livre**: Saldo livre formatado (ex: "150.5")
- **Reservado**: Saldo reservado formatado (ex: "0")
- **Bloqueado**: Saldo bloqueado/frozen formatado (ex: "0")
- **Ações**: Texto indicando ações não disponíveis ou "—"

Valores são formatados com decimais corretos (12 decimals para BZR)

### Evidências
- Screenshot da linha do token nativo na tabela

---

## CT-067: Adicionar Token Customizado

### Objetivo
Verificar fluxo de adicionar um token (asset) customizado

### Pré-condições
- Dashboard aberto
- Conhecer ID de um asset válido existente na chain

### Passos
1. Localizar card de "Tokens"
2. No campo "ID do Asset", digitar ID válido (ex: "1")
3. Clicar em "Verificar" ou "Adicionar"
4. Aguardar verificação
5. Observar preview do token

### Resultado Esperado
- Campo aceita input do ID
- Após clicar em verificar:
  - Loading/spinner é exibido brevemente
  - Preview do token é exibido mostrando:
    - Símbolo (ex: "USDT")
    - ID do asset
    - Decimals
    - Nome (se disponível)
  - Botão "Adicionar" com ícone de "+" aparece
  - Botão "Cancelar" aparece
- Ao clicar em "Adicionar":
  - Mensagem de sucesso é exibida
  - Token aparece na lista de tokens ativos
  - Preview é fechado
  - Campo de ID é limpo

### Evidências
- Screenshot do preview do token
- Screenshot do token na lista após adicionar

---

## CT-068: Validação de Asset Inexistente

### Objetivo
Verificar comportamento ao tentar adicionar asset que não existe

### Pré-condições
- Dashboard aberto

### Passos
1. No campo "ID do Asset", digitar ID que não existe (ex: "99999")
2. Clicar em "Verificar"

### Resultado Esperado
- Mensagem de erro é exibida: "Token não encontrado" ou similar
- Preview não é exibido
- Token não é adicionado

### Evidências
- Screenshot da mensagem de erro

---

## CT-069: Validação de Asset Já Adicionado

### Objetivo
Verificar comportamento ao tentar adicionar asset que já está na lista

### Pré-condições
- Dashboard aberto
- Ter pelo menos um token já adicionado

### Passos
1. Anotar o ID de um token já adicionado
2. Digitar este mesmo ID no campo "ID do Asset"
3. Clicar em "Verificar"

### Resultado Esperado
- Mensagem de erro é exibida: "Token já adicionado" ou similar
- Preview não é exibido
- Não é possível adicionar duplicado

### Evidências
- Screenshot da mensagem de erro

---

## CT-070: Listar Tokens Ativos

### Objetivo
Verificar se tokens adicionados são listados corretamente

### Pré-condições
- Ter pelo menos 2 tokens adicionados
- Dashboard aberto

### Passos
1. Observar a seção de "Tokens Ativos" no card de Tokens
2. Verificar informações de cada token

### Resultado Esperado
- Número de tokens ativos é exibido (ex: "2")
- Cada token na lista mostra:
  - Nome ou símbolo principal
  - Badge com símbolo
  - ID do asset em texto menor
  - Botão "Remover"
- Se não houver tokens: Mensagem "Nenhum token adicionado" ou similar

### Evidências
- Screenshot da lista de tokens ativos

---

## CT-071: Remover Token da Lista

### Objetivo
Verificar se é possível remover token adicionado

### Pré-condições
- Ter pelo menos um token adicionado
- Dashboard aberto

### Passos
1. Localizar um token na lista de "Tokens Ativos"
2. Clicar no botão "Remover"
3. Observar resultado

### Resultado Esperado
- Token é removido imediatamente da lista
- Contador de tokens ativos é atualizado
- Linha do token desaparece da tabela de saldos
- Não há confirmação (remoção é direta)

### Evidências
- Screenshot antes e depois de remover

---

## CT-072: Saldo de Token Customizado

### Objetivo
Verificar se saldo de token customizado é exibido na tabela

### Pré-condições
- Ter token customizado adicionado
- Conta com saldo deste token (ou sem saldo)
- Dashboard aberto

### Passos
1. Adicionar token customizado
2. Aguardar carregamento do saldo
3. Observar linha do token na tabela de saldos

### Resultado Esperado
- Linha do token aparece na tabela
- **Ativo**: Nome e símbolo do token, ID exibido
- **Livre**: Saldo livre (ou "0" se não houver saldo)
- **Reservado**: Saldo reservado
- **Bloqueado**: Saldo bloqueado
- **Ações**: Botão "Remover"
- Valores são formatados com decimals corretos do token

### Evidências
- Screenshot da linha do token na tabela

---

## CT-073: Atualizar Saldos Manualmente

### Objetivo
Verificar funcionalidade de refresh de saldos

### Pré-condições
- Dashboard aberto com saldos carregados

### Passos
1. Observar saldos atuais
2. Clicar no botão "Atualizar" (ícone de refresh) no card de Saldos
3. Observar loading/atualização

### Resultado Esperado
- Ao clicar em "Atualizar":
  - Ícone de refresh pode girar (loading)
  - Saldos são recarregados da blockchain
  - Valores são atualizados se houver mudanças
- Processo completa em poucos segundos

### Evidências
- Screenshot do botão de atualizar

---

## CT-074: Histórico de Transações - Exibição

### Objetivo
Verificar se histórico de transações é exibido corretamente

### Pré-condições
- Conta com pelo menos algumas transações históricas
- Dashboard aberto

### Passos
1. Localizar a seção "Histórico de Transações"
2. Observar a tabela

### Resultado Esperado
Tabela de histórico exibe:
- **Colunas**: Data/Hora, Evento, Contraparte, Valor, Hash
- Até 25 transações mais recentes são carregadas inicialmente
- Cada linha mostra:
  - **Data/Hora**: Timestamp formatado (ex: "18/10/2025 14:30:45")
  - **Evento**: Direção (Recebido/Enviado) e tipo (balances.transfer, assets.transfer, etc)
  - **Contraparte**: Endereço de origem (se recebido) ou destino (se enviado) em formato code
  - **Valor**: Quantidade e símbolo (ex: "10.5 BZR")
  - **Hash**: Hash da transação encurtado (ex: "0x1a2b...3c4d")
- Transações mais recentes aparecem no topo
- Hover na linha destaca a linha (background muted)

### Evidências
- Screenshot da tabela de histórico

---

## CT-075: Histórico Vazio

### Objetivo
Verificar comportamento quando não há histórico

### Pré-condições
- Conta nova sem transações
- Dashboard aberto

### Passos
1. Observar a seção de histórico

### Resultado Esperado
- Mensagem "Nenhuma transação encontrada" ou similar é exibida
- Tabela está vazia ou não é exibida
- Botão "Carregar Mais" pode estar desabilitado

### Evidências
- Screenshot do histórico vazio

---

## CT-076: Carregar Mais Transações

### Objetivo
Verificar funcionalidade de paginação do histórico

### Pré-condições
- Conta com mais de 25 transações
- Dashboard aberto com histórico exibido

### Passos
1. Rolar até o final da tabela de histórico
2. Clicar no botão "Carregar Mais"
3. Aguardar carregamento

### Resultado Esperado
- Ao clicar em "Carregar Mais":
  - Texto do botão muda para "Carregando..." ou similar
  - Até 25 transações adicionais são carregadas
  - Novas transações aparecem na tabela (mais antigas)
  - Botão volta ao estado normal
- Se não houver mais transações: Botão pode ser desabilitado ou escondido

### Evidências
- Screenshot antes e depois de carregar mais

---

## CT-077: Direção das Transações

### Objetivo
Verificar se transações de entrada e saída são diferenciadas

### Pré-condições
- Ter transações de entrada (recebidas) e saída (enviadas)
- Dashboard aberto

### Passos
1. Observar coluna "Evento" no histórico
2. Identificar transações de entrada e saída

### Resultado Esperado
- Transações **recebidas** (in):
  - Texto: "Recebido" ou similar
  - Coluna "Contraparte" mostra "De: [endereço]"
- Transações **enviadas** (out):
  - Texto: "Enviado" ou similar
  - Coluna "Contraparte" mostra "Para: [endereço]"
- Diferenciação visual pode existir (cores, ícones)

### Evidências
- Screenshot mostrando ambos os tipos de transação

---

## CT-078: Atualização em Tempo Real de Saldos

### Objetivo
Verificar se saldos são atualizados automaticamente quando há nova transação

### Pré-condições
- Dashboard aberto
- Capacidade de enviar transação para a conta (de outra wallet)

### Passos
1. Anotar saldo atual
2. Enviar transação para a conta ativa (de outra wallet ou conta)
3. Aguardar transação ser incluída na blockchain
4. Observar dashboard (sem dar refresh manual)

### Resultado Esperado
- Após transação ser finalizada:
  - Saldo na tabela é atualizado automaticamente
  - Nova transação aparece no histórico automaticamente
  - Não é necessário dar refresh manual na página
- Atualização ocorre via subscription/polling

### Evidências
- Screenshots antes e depois da transação

---

## CT-079: Atualização em Tempo Real de Histórico

### Objetivo
Verificar se histórico é atualizado em tempo real

### Pré-condições
- Dashboard aberto
- Realizar nova transação de envio

### Passos
1. Observar histórico atual
2. Realizar envio de fundos da própria conta
3. Aguardar finalização
4. Observar histórico (sem refresh manual)

### Resultado Esperado
- Nova transação aparece no topo do histórico automaticamente
- Não é necessário clicar em "Atualizar"
- Timestamp é atual

### Evidências
- Screenshot do histórico atualizado

---

## CT-080: Erro ao Carregar Histórico

### Objetivo
Verificar comportamento quando há erro ao carregar histórico

### Pré-condições
- Simular erro de conexão ou RPC

### Passos
1. Desconectar da blockchain ou simular erro
2. Acessar dashboard

### Resultado Esperado
- Alert de erro é exibido: "Erro ao carregar histórico" ou similar
- Histórico pode estar vazio ou exibir mensagem de erro
- Botão "Carregar Mais" pode estar desabilitado

### Evidências
- Screenshot do erro de histórico

---

## CT-081: Formatação de Valores na Tabela de Saldos

### Objetivo
Verificar se valores são formatados corretamente

### Pré-condições
- Dashboard aberto com saldos

### Passos
1. Observar valores na tabela de saldos
2. Verificar formatação de decimais

### Resultado Esperado
- Valores são formatados com decimals corretos:
  - BZR: 12 decimals
  - Tokens customizados: decimals conforme metadata
- Valores muito pequenos ou zero são exibidos como "0" ou "0.0"
- Valores grandes são formatados com separadores (ex: "1,234.56")
- Não há overflow ou corte de números

### Evidências
- Screenshot de valores formatados

---

## CT-082: Responsividade do Dashboard - Mobile

### Objetivo
Verificar layout responsivo em mobile

### Pré-condições
- Acessar dashboard em dispositivo mobile ou simulador

### Passos
1. Acessar `/app/wallet` em mobile
2. Observar layout de todos os componentes

### Resultado Esperado
- Cards são empilhados verticalmente
- Tabelas têm scroll horizontal se necessário
- Botões são acessíveis e clicáveis
- Texto é legível sem zoom
- Endereços quebram em múltiplas linhas se necessário

### Evidências
- Screenshot do dashboard em mobile

---

## CT-083: Responsividade - Tablet e Desktop

### Objetivo
Verificar layout em telas maiores

### Pré-condições
- Acessar dashboard em tablet/desktop

### Passos
1. Acessar dashboard em tela grande
2. Observar layout

### Resultado Esperado
- Cards de "Conta" e "Tokens" são exibidos lado a lado (grid 2 colunas)
- Tabelas aproveitam largura disponível
- Layout é bem espaçado e organizado
- Não há espaços vazios excessivos

### Evidências
- Screenshot do dashboard em desktop

---

## CT-084: Estado de Carregamento Inicial

### Objetivo
Verificar indicadores de loading ao carregar dashboard

### Pré-condições
- Limpar cache ou acessar pela primeira vez
- Dashboard carregando

### Passos
1. Acessar dashboard
2. Observar estados de carregamento

### Resultado Esperado
- Enquanto carrega:
  - Status da conta mostra "Carregando..."
  - Saldos podem mostrar "—" ou loading
  - Histórico mostra "Carregando transações..."
- Após carregar:
  - Todos os dados são exibidos
  - Status muda para "Pronto"

### Evidências
- Screenshot do estado de carregamento

---

## CT-085: Múltiplos Assets na Tabela

### Objetivo
Verificar exibição quando há múltiplos tokens adicionados

### Pré-condições
- Adicionar 3-5 tokens diferentes
- Dashboard aberto

### Passos
1. Adicionar múltiplos tokens
2. Observar tabela de saldos

### Resultado Esperado
- Todos os tokens são listados
- Ordem: Token nativo primeiro, depois tokens customizados
- Cada linha é claramente separada
- Scroll vertical aparece se necessário
- Informações não ficam sobrepostas

### Evidências
- Screenshot da tabela com múltiplos assets

---

## CT-086: Navegação entre Abas da Wallet

### Objetivo
Verificar menu de navegação da wallet no dashboard

### Pré-condições
- Dashboard aberto

### Passos
1. Observar menu/tabs de navegação
2. Verificar item ativo

### Resultado Esperado
- Menu mostra abas: Overview (Dashboard), Contas, Enviar, Receber
- Aba "Overview" ou equivalente está destacada/ativa
- Ao clicar em outras abas, navegação funciona
- Estado é preservado ao voltar

### Evidências
- Screenshot do menu com aba ativa

---

## CT-087: Link para Transação na Blockchain (se houver)

### Objetivo
Verificar se hash de transação é clicável/copiável

### Pré-condições
- Histórico com transações
- Dashboard aberto

### Passos
1. Observar hash de uma transação no histórico
2. Tentar interagir com o hash

### Resultado Esperado
- Hash pode ser copiado ao clicar (se implementado)
- OU hash pode ser link para explorer (se implementado)
- OU hash é apenas texto exibido (read-only)

### Evidências
- Screenshot do hash e possível interação

---

## CT-088: Troca de Conta Ativa - Atualização do Dashboard

### Objetivo
Verificar se dashboard é atualizado ao trocar conta ativa

### Pré-condições
- Ter múltiplas contas
- Dashboard aberto

### Passos
1. Anotar endereço e saldos da conta atual
2. Navegar para `/app/wallet/accounts`
3. Trocar para outra conta ativa
4. Voltar ao dashboard

### Resultado Esperado
- Endereço exibido muda para a nova conta
- Saldos são atualizados para refletir a nova conta
- Histórico mostra transações da nova conta
- Tokens ativos podem ser diferentes (cada conta tem sua lista)
- Atualização é automática (pode haver reload)

### Evidências
- Screenshots antes e depois da troca

---

## CT-089: Performance com Muitas Transações

### Objetivo
Verificar performance ao carregar histórico grande

### Pré-condições
- Conta com centenas de transações
- Dashboard aberto

### Passos
1. Acessar dashboard
2. Observar tempo de carregamento inicial
3. Carregar mais transações várias vezes

### Resultado Esperado
- Carregamento inicial é rápido (até 25 itens)
- Paginação funciona suavemente
- Interface não trava ou fica lenta
- Scroll é fluido

### Evidências
- Anotar tempo de carregamento
- Screenshot do histórico com muitos itens

---

## CT-090: Validação de Decimals - Zero Balance

### Objetivo
Verificar exibição quando saldo é zero

### Pré-condições
- Conta com saldo zero em algum asset
- Dashboard aberto

### Passos
1. Observar linha do asset com saldo zero

### Resultado Esperado
- Valores são exibidos como "0" ou "0.0"
- Não há erro ou "NaN"
- Formatação está correta

### Evidências
- Screenshot do saldo zero

---

## Observações Finais

### Notas para o Analista de Testes
1. Testar com diferentes quantidades de saldo (pequeno, médio, grande)
2. Testar com diferentes números de tokens (0, 1, 5, 10+)
3. Verificar performance com histórico grande
4. Testar responsividade em diferentes resoluções
5. Validar formatação de números com muitos decimais
6. Testar com diferentes fusos horários (timestamps)

### Funcionalidades do Dashboard
- Visualização de conta ativa e suas informações
- Gestão de tokens customizados
- Visualização de saldos (livre, reservado, bloqueado)
- Histórico de transações com paginação
- Atualização em tempo real via subscriptions
- Navegação rápida para enviar/receber

### Componentes e Serviços Relacionados
- `useVaultAccounts` hook
- `useChainProps` hook
- `useTokens` store
- `balances.ts` service (getNativeBalance, subscribeNativeBalance, etc)
- `history.ts` service (fetchRecentTransfers, subscribeTransferStream)
- `assets.ts` service (fetchAssetMetadata)

### Bugs Conhecidos
(A ser preenchido durante os testes)

### Melhorias Sugeridas
(A ser preenchido durante os testes)
