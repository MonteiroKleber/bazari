# Teste de Envio de Fundos - Wallet Bazari

## Informações do Documento
- **Módulo**: Wallet - Envio de Fundos
- **Tela**: SendPage (`/app/wallet/send`)
- **Objetivo**: Validar funcionalidades de envio de tokens nativos e assets para outros endereços

---

## Pré-requisitos
- Aplicação rodando e acessível
- Ter pelo menos uma conta ativa com saldo
- Conhecer um endereço válido de destino para testes
- Conexão com a blockchain funcionando

---

## CT-021: Acessar Tela de Envio sem Conta Ativa

### Objetivo
Verificar comportamento quando usuário acessa a tela de envio sem ter conta ativa

### Pré-condições
- Não ter nenhuma conta ativa
- Acessar `/app/wallet/send`

### Passos
1. Acessar a URL `/app/wallet/send` diretamente

### Resultado Esperado
- Mensagem informativa é exibida: "Nenhuma conta ativa" ou similar
- Botão ou link "Ir para Contas" é exibido
- Formulário de envio não é exibido

### Evidências
- Screenshot da mensagem quando não há conta ativa

---

## CT-022: Visualizar Formulário de Envio

### Objetivo
Verificar se o formulário de envio é exibido corretamente

### Pré-condições
- Estar logado com conta ativa
- Acessar `/app/wallet/send`

### Passos
1. Acessar a tela de envio
2. Observar todos os campos do formulário

### Resultado Esperado
Formulário exibe os seguintes campos:
- Seletor de "Ativo" (Asset) - mostrando token nativo (BZR)
- Campo "Valor" (Amount) - input numérico
- Indicador de saldo disponível abaixo do campo valor
- Campo "Destinatário" (Recipient) - input de texto
- Botão "Escanear" ao lado do campo destinatário
- Campo "Memo" (opcional) - textarea
- Informação de taxa estimada (Fee)
- Botão "Enviar" (Submit)
- Botão "Limpar" (Reset)

### Evidências
- Screenshot do formulário completo

---

## CT-023: Enviar Token Nativo (BZR) com Sucesso

### Objetivo
Verificar fluxo completo de envio de token nativo

### Pré-condições
- Conta ativa com saldo de BZR suficiente
- Ter endereço de destino válido
- Estar na tela `/app/wallet/send`

### Passos
1. No campo "Ativo", verificar que "BZR" está selecionado
2. No campo "Valor", digitar "0.5"
3. Observar que o saldo disponível é exibido abaixo
4. No campo "Destinatário", colar um endereço válido
5. Aguardar cálculo da taxa de rede (aparece automaticamente após 400ms)
6. Observar que a taxa estimada é exibida
7. No campo "Memo" (opcional), digitar "Teste de envio"
8. Clicar no botão "Enviar"
9. Aguardar que dialog de PIN seja exibido
10. Observar os detalhes da transação no dialog:
    - Descrição
    - Valor: 0.5 BZR
    - Taxa de rede
    - Total
    - Saldo disponível com ícone de verificação
11. Digitar o PIN correto
12. Clicar em "Confirmar"
13. Aguardar as etapas de processamento:
    - "Assinando transação"
    - "Transmitindo para a rede"
    - "Incluída no bloco"
    - "Finalizada"

### Resultado Esperado
- Taxa é calculada e exibida automaticamente
- Dialog de PIN mostra todos os detalhes da transação corretamente
- Ícone de check verde aparece ao lado do saldo (indicando suficiência)
- Após confirmar PIN:
  - Mensagens de status são exibidas sequencialmente
  - Hash da transação é exibido após inclusão no bloco
  - Mensagem de sucesso "Finalizada" aparece
  - Formulário é limpo automaticamente
  - Seletor de ativo mantém a seleção (BZR)
- Transação é registrada no histórico

### Evidências
- Screenshot do formulário preenchido
- Screenshot do dialog de PIN com detalhes da transação
- Screenshot de cada estado de processamento
- Screenshot do hash da transação exibido

---

## CT-024: Validação de Saldo Insuficiente

### Objetivo
Verificar comportamento ao tentar enviar valor maior que o saldo disponível

### Pré-condições
- Conta ativa com saldo conhecido (ex: 10 BZR)
- Estar na tela de envio

### Passos
1. No campo "Valor", digitar valor maior que o saldo (ex: "100")
2. Preencher destinatário válido
3. Aguardar cálculo da taxa
4. Clicar em "Enviar"

### Resultado Esperado
- Mensagem de erro é exibida: "Saldo insuficiente" ou similar
- Formulário não prossegue para dialog de PIN
- OU: Dialog de PIN é exibido mas mostra ícone de alerta vermelho ao lado do saldo
- OU: Warning "Saldo insuficiente para completar a transação" é exibido

### Evidências
- Screenshot da mensagem de erro ou warning

---

## CT-025: Validação de Endereço Inválido

### Objetivo
Verificar validação de endereço de destinatário inválido

### Pré-condições
- Estar na tela de envio

### Passos
1. Preencher valor: "1"
2. No campo "Destinatário", digitar endereço inválido (ex: "abc123")
3. Clicar em "Enviar"

### Resultado Esperado
- Mensagem de erro é exibida: "Endereço inválido" ou similar
- Transação não é enviada
- Dialog de PIN não é aberto

### Evidências
- Screenshot da mensagem de erro de endereço inválido

---

## CT-026: Validação de Valor Inválido

### Objetivo
Verificar validações de campo de valor

### Pré-condições
- Estar na tela de envio

### Passos - Cenário 26.1: Valor Vazio
1. Deixar campo "Valor" vazio
2. Preencher destinatário válido
3. Clicar em "Enviar"

**Resultado Esperado 26.1:**
- Mensagem de erro: "Valor é obrigatório" ou similar

### Passos - Cenário 26.2: Valor Zero
1. Digitar "0" no campo valor
2. Preencher destinatário válido
3. Clicar em "Enviar"

**Resultado Esperado 26.2:**
- Mensagem de erro: "Valor inválido" ou similar

### Passos - Cenário 26.3: Valor Negativo
1. Digitar "-5" no campo valor
2. Preencher destinatário válido
3. Clicar em "Enviar"

**Resultado Esperado 26.3:**
- Valor negativo não é aceito no input OU mensagem de erro é exibida

### Evidências
- Screenshots de cada mensagem de erro

---

## CT-027: Cálculo Automático de Taxa

### Objetivo
Verificar se a taxa é calculada automaticamente ao preencher os campos

### Pré-condições
- Estar na tela de envio com conta ativa

### Passos
1. Preencher valor: "2"
2. Aguardar 1 segundo
3. Observar área de taxa (rodapé do formulário)
4. Preencher destinatário válido
5. Aguardar 1 segundo
6. Observar se a taxa foi atualizada

### Resultado Esperado
- Mensagem "Calculando taxa..." aparece brevemente
- Após ~400ms, taxa calculada é exibida (ex: "Taxa: 0.001 BZR")
- Taxa é exibida antes de clicar em "Enviar"
- Ao alterar valor ou destinatário, taxa é recalculada automaticamente

### Evidências
- Screenshot mostrando a taxa calculada

---

## CT-028: Limpar Formulário

### Objetivo
Verificar se o botão de limpar reseta todos os campos

### Pré-condições
- Estar na tela de envio

### Passos
1. Preencher todos os campos:
   - Valor: "1.5"
   - Destinatário: (endereço válido)
   - Memo: "Teste"
2. Clicar no botão "Limpar" ou "Reset"

### Resultado Esperado
- Campo "Valor" é limpo
- Campo "Destinatário" é limpo
- Campo "Memo" é limpo
- Seletor de ativo permanece na seleção atual
- Taxa é resetada para "Indisponível"

### Evidências
- Screenshot do formulário após limpar

---

## CT-029: Cancelar Envio no Dialog de PIN

### Objetivo
Verificar se é possível cancelar o envio após abrir o dialog de PIN

### Pré-condições
- Estar na tela de envio
- Formulário preenchido corretamente

### Passos
1. Preencher formulário corretamente
2. Clicar em "Enviar"
3. Dialog de PIN é exibido
4. Clicar em "Cancelar" sem digitar o PIN

### Resultado Esperado
- Dialog de PIN é fechado
- Transação não é enviada
- Formulário permanece preenchido com os dados anteriores
- Nenhuma mensagem de erro é exibida

### Evidências
- Screenshot mostrando que o formulário permanece preenchido após cancelar

---

## CT-030: Envio com PIN Incorreto

### Objetivo
Verificar comportamento ao digitar PIN incorreto durante envio

### Pré-condições
- Estar na tela de envio
- Formulário preenchido corretamente

### Passos
1. Preencher formulário corretamente
2. Clicar em "Enviar"
3. Dialog de PIN é exibido
4. Digitar PIN incorreto (ex: "000000")
5. Clicar em "Confirmar"

### Resultado Esperado
- Mensagem de erro é exibida: "PIN inválido" ou similar
- Transação não é enviada
- Dialog pode fechar OU permanecer aberto mostrando o erro
- Se fechar, formulário permanece preenchido

### Evidências
- Screenshot da mensagem de erro de PIN incorreto

---

## CT-031: Adicionar Asset Customizado e Enviar

### Objetivo
Verificar se é possível selecionar e enviar asset customizado (não nativo)

### Pré-condições
- Ter pelo menos um asset adicionado na wallet (além do BZR nativo)
- Ter saldo deste asset
- Estar na tela de envio

### Passos
1. No seletor "Ativo", clicar e observar as opções
2. Selecionar o asset customizado (ex: "USDT")
3. Observar que o saldo disponível muda para o saldo deste asset
4. Digitar valor: "5"
5. Preencher destinatário válido
6. Aguardar cálculo de taxa (taxa ainda é em BZR nativo)
7. Clicar em "Enviar"
8. Observar dialog de PIN
9. Confirmar que o valor mostrado é "5 USDT" (ou símbolo do asset)
10. Confirmar que a taxa é mostrada em BZR
11. Digitar PIN correto e confirmar
12. Aguardar finalização

### Resultado Esperado
- Seletor mostra todos os assets disponíveis
- Saldo exibido corresponde ao asset selecionado
- Taxa continua sendo calculada e cobrada em token nativo (BZR)
- Dialog de PIN mostra corretamente o valor no símbolo do asset selecionado
- Transação é processada com sucesso
- Asset correto é transferido

### Evidências
- Screenshot do seletor de assets
- Screenshot do dialog de PIN mostrando o asset correto
- Screenshot de sucesso

---

## CT-032: Verificar Indicador de Saldo Disponível

### Objetivo
Verificar se o saldo disponível é exibido corretamente para cada asset

### Pré-condições
- Estar na tela de envio
- Ter saldos em diferentes assets

### Passos
1. Selecionar token nativo (BZR) no seletor de ativo
2. Observar saldo exibido abaixo do campo "Valor"
3. Selecionar outro asset
4. Observar saldo exibido

### Resultado Esperado
- Saldo exibido corresponde ao asset selecionado
- Formato é legível (ex: "150.5 BZR")
- Saldo é atualizado imediatamente ao trocar de asset

### Evidências
- Screenshot do saldo de cada asset

---

## CT-033: Campo Memo Opcional

### Objetivo
Verificar que o campo memo é opcional e aceita texto

### Pré-condições
- Estar na tela de envio

### Passos - Cenário 33.1: Envio sem Memo
1. Preencher valor e destinatário
2. Deixar campo "Memo" vazio
3. Clicar em "Enviar"
4. Confirmar PIN
5. Aguardar finalização

**Resultado Esperado 33.1:**
- Transação é enviada com sucesso mesmo sem memo

### Passos - Cenário 33.2: Envio com Memo
1. Preencher valor e destinatário
2. No campo "Memo", digitar "Pagamento referência #123"
3. Clicar em "Enviar"
4. Confirmar PIN
5. Aguardar finalização

**Resultado Esperado 33.2:**
- Transação é enviada com sucesso incluindo o memo

### Passos - Cenário 33.3: Memo muito longo
1. Preencher valor e destinatário
2. No campo "Memo", digitar texto com mais de 140 caracteres
3. Tentar enviar

**Resultado Esperado 33.3:**
- Validação impede envio OU campo limita a 140 caracteres
- Mensagem de erro pode ser exibida

### Evidências
- Screenshots dos diferentes cenários

---

## CT-034: Usar Scanner de QR Code

### Objetivo
Verificar se o scanner de QR Code funciona para preencher endereço

### Pré-condições
- Estar na tela de envio
- Ter câmera disponível
- Ter QR Code com endereço válido

### Passos
1. Clicar no botão "Escanear" ao lado do campo destinatário
2. Observar que área de scanner é exibida
3. Permitir acesso à câmera se solicitado
4. Apontar câmera para QR Code com endereço
5. Aguardar leitura automática

### Resultado Esperado
- Área de scanner com preview de câmera é exibida
- Navegador solicita permissão de câmera (primeira vez)
- Ao detectar QR Code válido:
  - Endereço é automaticamente preenchido no campo "Destinatário"
  - Scanner é fechado automaticamente
- Se QR Code inválido, mensagem de erro pode aparecer

### Evidências
- Screenshot do scanner ativo
- Screenshot do campo destinatário preenchido após scan

---

## CT-035: Fechar Scanner sem Escanear

### Objetivo
Verificar se é possível fechar o scanner sem escanear

### Pré-condições
- Estar na tela de envio
- Scanner aberto

### Passos
1. Clicar em "Escanear"
2. Scanner é aberto
3. Clicar novamente em "Escanear" ou botão de fechar

### Resultado Esperado
- Scanner é fechado
- Campo destinatário permanece com o valor anterior (se houver)

### Evidências
- Screenshot mostrando scanner fechado

---

## CT-036: Hash da Transação Exibido

### Objetivo
Verificar se o hash da transação é exibido após envio bem-sucedido

### Pré-condições
- Realizar envio completo com sucesso

### Passos
1. Realizar envio de token seguindo fluxo completo
2. Após mensagem "Incluída no bloco", observar área de hash

### Resultado Esperado
- Hash da transação é exibido (formato encurtado, ex: "0x1a2b...3c4d")
- Hash está visível na área inferior do formulário
- Hash pode ser copiado (se houver funcionalidade)

### Evidências
- Screenshot mostrando o hash da transação

---

## CT-037: Estados de Processamento da Transação

### Objetivo
Verificar se todos os estados de processamento são exibidos corretamente

### Pré-condições
- Realizar envio completo

### Passos
1. Preencher formulário e confirmar PIN
2. Observar mensagens de status que aparecem sequencialmente

### Resultado Esperado
Estados são exibidos na seguinte ordem:
1. "Assinando transação" (Signing)
2. "Transmitindo para a rede" (Broadcasting)
3. "Incluída no bloco" (InBlock)
4. "Finalizada" (Finalized)

Cada estado é exibido claramente e substituído pelo próximo

### Evidências
- Screenshots de cada estado (se possível capturar)

---

## CT-038: Detalhes da Transação no Dialog de PIN

### Objetivo
Verificar se todos os detalhes da transação são exibidos corretamente no dialog de PIN

### Pré-condições
- Formulário de envio preenchido corretamente

### Passos
1. Preencher:
   - Ativo: BZR
   - Valor: 10
   - Destinatário: (endereço válido)
2. Aguardar cálculo de taxa
3. Clicar em "Enviar"
4. Observar dialog de PIN e seus detalhes

### Resultado Esperado
Dialog exibe:
- Título: "Digite seu PIN"
- Descrição: "Desbloqueie para assinar a transação" ou similar
- Card com detalhes da transação contendo:
  - Descrição: "Transferir BZR para 5FHne..." (endereço encurtado)
  - Valor: "10 BZR"
  - Taxa de rede: "0.001 BZR" (exemplo)
  - Separador
  - Total: "10.001 BZR"
  - Saldo disponível: "150 BZR" (exemplo)
  - Ícone de check verde se saldo é suficiente
  - Ícone de alerta vermelho se saldo é insuficiente
- Se saldo insuficiente: Warning vermelho "Saldo insuficiente para completar a transação"

### Evidências
- Screenshot do dialog de PIN com todos os detalhes

---

## CT-039: Navegação Durante Processamento

### Objetivo
Verificar comportamento se usuário tentar navegar durante processamento de envio

### Pré-condições
- Transação sendo processada (estado "Assinando" ou "Transmitindo")

### Passos
1. Iniciar envio e confirmar PIN
2. Durante processamento, tentar clicar em outro menu ou navegar

### Resultado Esperado
- Botões podem estar desabilitados durante processamento
- Se navegação for possível, warning pode aparecer
- Idealmente, processamento continua em background

### Evidências
- Screenshot do estado durante processamento

---

## CT-040: Múltiplos Envios Consecutivos

### Objetivo
Verificar se é possível realizar múltiplos envios seguidos

### Pré-condições
- Saldo suficiente para múltiplas transações
- Estar na tela de envio

### Passos
1. Realizar primeiro envio completo até finalização
2. Observar que formulário é limpo
3. Preencher novamente e realizar segundo envio
4. Repetir processo para terceiro envio

### Resultado Esperado
- Cada envio é processado independentemente
- Formulário é limpo após cada envio bem-sucedido
- Saldo é atualizado após cada transação
- Não há erros ou travamentos

### Evidências
- Screenshot de múltiplas transações no histórico (tela de dashboard)

---

## Observações Finais

### Notas para o Analista de Testes
1. Usar endereços de teste em ambiente de desenvolvimento/testnet
2. Nunca usar mnemonics ou fundos reais durante testes
3. Verificar saldo antes e depois de cada transação
4. Taxa de rede pode variar dependendo da congestão da rede
5. Tempo de processamento pode variar (alguns blocos podem levar mais tempo)
6. Testar com diferentes valores decimais (0.1, 0.001, etc)

### Ambiente de Teste Recomendado
- Usar testnet (não mainnet)
- Ter pelo menos 2 contas de teste (origem e destino)
- Verificar conexão com RPC node antes dos testes

### Bugs Conhecidos
(A ser preenchido durante os testes)

### Melhorias Sugeridas
(A ser preenchido durante os testes)
