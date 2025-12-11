# Teste de Gerenciamento de Contas - Wallet Bazari

## Informações do Documento
- **Módulo**: Wallet - Gerenciamento de Contas
- **Tela**: AccountsPage (`/app/wallet/accounts`)
- **Objetivo**: Validar funcionalidades de criação, importação, ativação, exportação e remoção de contas

---

## Pré-requisitos
- Aplicação rodando e acessível
- Navegador com suporte a WebCrypto API
- Acesso à tela de contas da wallet

---

## CT-001: Criar Nova Conta

### Objetivo
Verificar se o usuário consegue criar uma nova conta com mnemonic gerado automaticamente

### Pré-condições
- Estar na tela `/app/wallet/accounts`

### Passos
1. Clicar no botão "Criar Conta" (ou equivalente conforme tradução)
2. Observar que um painel de criação de conta é exibido
3. Verificar que um mnemonic de 12 ou 24 palavras é gerado automaticamente
4. Verificar que as palavras estão numeradas (1., 2., 3., etc.)
5. Clicar no botão "Copiar Mnemonic"
6. Abrir bloco de notas e colar (Ctrl+V) para verificar se copiou
7. Colar o mnemonic no campo "Confirmação" (textarea)
8. Preencher campo "Nome" (opcional) com "Conta Teste 1"
9. Preencher campo "PIN" com "123456"
10. Preencher campo "Confirmar PIN" com "123456"
11. Clicar no botão "Salvar" ou "Criar"
12. Aguardar processamento

### Resultado Esperado
- Painel de criação é exibido corretamente
- Mnemonic é gerado com 12 ou 24 palavras numeradas
- Botão de copiar funciona e copia o mnemonic para área de transferência
- Após preencher todos os campos corretamente e clicar em Salvar:
  - Mensagem de sucesso é exibida
  - Painel de criação é fechado
  - Nova conta aparece na lista de contas
  - Conta criada mostra o endereço e o nome "Conta Teste 1"

### Evidências
- Screenshot do painel de criação com mnemonic gerado
- Screenshot da mensagem de sucesso
- Screenshot da conta criada na lista

---

## CT-002: Validação de Campos ao Criar Conta

### Objetivo
Verificar validações de campos obrigatórios e regras de negócio na criação de conta

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Painel de criar conta aberto

### Passos - Cenário 2.1: Confirmação do Mnemonic Incorreta
1. Clicar no botão "Criar Conta"
2. Copiar o mnemonic gerado
3. No campo "Confirmação", colar o mnemonic mas alterar uma palavra
4. Preencher PIN: "123456"
5. Preencher Confirmar PIN: "123456"
6. Clicar em "Salvar"

**Resultado Esperado 2.1:**
- Mensagem de erro informando que a confirmação não confere com o mnemonic
- Conta não é criada

### Passos - Cenário 2.2: PIN muito curto
1. Clicar no botão "Criar Conta"
2. Copiar e colar o mnemonic corretamente no campo Confirmação
3. Preencher PIN: "123" (menos de 6 dígitos)
4. Preencher Confirmar PIN: "123"
5. Clicar em "Salvar"

**Resultado Esperado 2.2:**
- Mensagem de erro informando que o PIN deve ter no mínimo 6 caracteres
- Conta não é criada

### Passos - Cenário 2.3: PINs não conferem
1. Clicar no botão "Criar Conta"
2. Copiar e colar o mnemonic corretamente
3. Preencher PIN: "123456"
4. Preencher Confirmar PIN: "654321"
5. Clicar em "Salvar"

**Resultado Esperado 2.3:**
- Mensagem de erro informando que os PINs não conferem
- Conta não é criada

### Passos - Cenário 2.4: Confirmação vazia
1. Clicar no botão "Criar Conta"
2. Deixar campo "Confirmação" vazio
3. Preencher PIN e Confirmar PIN corretamente
4. Clicar em "Salvar"

**Resultado Esperado 2.4:**
- Mensagem de erro informando que a confirmação é obrigatória
- Conta não é criada

### Evidências
- Screenshot de cada mensagem de erro

---

## CT-003: Regenerar Mnemonic

### Objetivo
Verificar se é possível regenerar o mnemonic antes de criar a conta

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Painel de criar conta aberto

### Passos
1. Clicar no botão "Criar Conta"
2. Anotar as 3 primeiras palavras do mnemonic gerado
3. Clicar no botão "Regenerar" ou "Gerar Novo"
4. Observar o novo mnemonic gerado
5. Verificar se as palavras mudaram

### Resultado Esperado
- Novo mnemonic é gerado
- As palavras são diferentes do mnemonic anterior
- Campo de confirmação é limpo (se houver algo preenchido)

### Evidências
- Screenshot do primeiro mnemonic
- Screenshot do segundo mnemonic após regenerar

---

## CT-004: Importar Conta Existente

### Objetivo
Verificar se o usuário consegue importar uma conta usando mnemonic existente

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Ter um mnemonic válido disponível (pode ser de uma conta criada anteriormente)

### Passos
1. Clicar no botão "Importar Conta"
2. Observar que um painel de importação é exibido
3. Colar um mnemonic válido no campo "Mnemonic"
4. Preencher campo "Nome" (opcional) com "Conta Importada 1"
5. Preencher campo "PIN" com "654321"
6. Preencher campo "Confirmar PIN" com "654321"
7. Clicar no botão "Importar" ou "Salvar"
8. Aguardar processamento

### Resultado Esperado
- Painel de importação é exibido
- Após preencher e clicar em Importar:
  - Mensagem de sucesso é exibida
  - Painel é fechado
  - Conta importada aparece na lista
  - Mostra o endereço derivado do mnemonic e nome "Conta Importada 1"

### Evidências
- Screenshot do painel de importação preenchido
- Screenshot da conta importada na lista

---

## CT-005: Validação de Mnemonic na Importação

### Objetivo
Verificar validação de mnemonic inválido ao importar conta

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Painel de importar conta aberto

### Passos
1. Clicar no botão "Importar Conta"
2. No campo "Mnemonic", digitar palavras aleatórias (ex: "abc def ghi jkl mno pqr")
3. Preencher PIN: "123456"
4. Preencher Confirmar PIN: "123456"
5. Clicar em "Importar"

### Resultado Esperado
- Mensagem de erro informando que o mnemonic é inválido
- Conta não é importada

### Evidências
- Screenshot da mensagem de erro de mnemonic inválido

---

## CT-006: Editar Rótulo (Nome) da Conta

### Objetivo
Verificar se o usuário consegue editar o nome/rótulo de uma conta existente

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Ter pelo menos uma conta criada

### Passos
1. Localizar uma conta na lista
2. Clicar no botão "Editar rótulo" ou equivalente
3. Observar que um campo de input aparece
4. Digitar "Minha Conta Principal"
5. Clicar em "Salvar"
6. Aguardar processamento

### Resultado Esperado
- Campo de edição aparece
- Após salvar:
  - Campo de edição desaparece
  - Novo nome "Minha Conta Principal" é exibido na conta
  - Badge ou tag com o nome aparece próximo ao endereço

### Evidências
- Screenshot do campo de edição
- Screenshot da conta com o novo nome salvo

---

## CT-007: Cancelar Edição de Rótulo

### Objetivo
Verificar se é possível cancelar a edição do nome sem salvar

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Ter uma conta com nome já definido

### Passos
1. Clicar em "Editar rótulo" em uma conta
2. Alterar o nome para "Nome Temporário"
3. Clicar em "Cancelar"

### Resultado Esperado
- Campo de edição é fechado
- Nome original da conta permanece inalterado
- Alteração não é salva

### Evidências
- Screenshot mostrando que o nome não foi alterado

---

## CT-008: Copiar Endereço da Conta

### Objetivo
Verificar se o botão de copiar endereço funciona

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Ter pelo menos uma conta na lista

### Passos
1. Localizar uma conta na lista
2. Clicar no ícone de "Copiar endereço" (ícone de Copy)
3. Observar feedback visual
4. Abrir bloco de notas e colar (Ctrl+V)

### Resultado Esperado
- Após clicar no ícone:
  - Ícone muda para check verde
  - Tooltip ou mensagem "Copiado!" aparece
  - Endereço é copiado para área de transferência
- Ao colar, o endereço completo da conta aparece

### Evidências
- Screenshot do feedback visual (ícone check ou tooltip)
- Screenshot do endereço colado no bloco de notas

---

## CT-009: Definir Conta como Ativa

### Objetivo
Verificar se o usuário consegue ativar uma conta diferente

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Ter pelo menos 2 contas criadas
- Uma conta já está ativa (possui badge "Ativa")

### Passos
1. Identificar a conta que está ativa atualmente (possui badge "Ativa")
2. Localizar outra conta que não está ativa
3. Clicar no botão "Tornar Ativa" ou "Ativar" nesta conta
4. Aguardar que dialog de PIN seja exibido
5. Digitar o PIN correto da conta a ser ativada
6. Clicar em "Confirmar"
7. Aguardar processamento e validação SIWS (Sign-In with Substrate)

### Resultado Esperado
- Dialog de PIN é exibido com título "Digite seu PIN"
- Após confirmar PIN correto:
  - Mensagem de sucesso aparece
  - Conta selecionada agora possui badge "Ativa"
  - Conta anteriormente ativa perde o badge "Ativa"
  - Botão "Tornar Ativa" aparece na conta anteriormente ativa
  - Página pode recarregar automaticamente

### Evidências
- Screenshot da conta antes de ativar
- Screenshot do dialog de PIN
- Screenshot da conta ativada com badge "Ativa"

---

## CT-010: Ativar Conta com PIN Incorreto

### Objetivo
Verificar comportamento ao tentar ativar conta com PIN errado

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Ter pelo menos 2 contas

### Passos
1. Clicar em "Tornar Ativa" em uma conta não ativa
2. No dialog de PIN, digitar PIN incorreto (ex: "000000")
3. Clicar em "Confirmar"

### Resultado Esperado
- Mensagem de erro é exibida: "PIN não pertence a esta conta" ou similar
- Conta não é ativada
- Badge "Ativa" permanece na conta anteriormente ativa
- Dialog pode permanecer aberto ou fechar dependendo do comportamento

### Evidências
- Screenshot da mensagem de erro de PIN incorreto

---

## CT-011: Exportar Conta (Revelar Mnemonic)

### Objetivo
Verificar se o usuário consegue exportar o mnemonic de uma conta

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Ter pelo menos uma conta criada

### Passos
1. Localizar uma conta na lista
2. Clicar no botão "Exportar"
3. Observar que um painel de exportação aparece abaixo da conta
4. Digitar o PIN correto da conta no campo "PIN"
5. Clicar em "Exportar" ou "Revelar"
6. Aguardar processamento

### Resultado Esperado
- Painel de exportação é exibido
- Após digitar PIN correto e confirmar:
  - Mnemonic é revelado em um box com fundo destacado (geralmente vermelho/destrutivo)
  - Mensagem de aviso de segurança é exibida
  - Botão "Copiar" aparece ao lado do mnemonic
  - Mnemonic exibido contém todas as palavras da seed phrase

### Evidências
- Screenshot do painel de exportação
- Screenshot do mnemonic revelado (pode censurar parcialmente por segurança)

---

## CT-012: Exportar Conta com PIN Incorreto

### Objetivo
Verificar validação ao tentar exportar com PIN errado

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Painel de exportação aberto

### Passos
1. Clicar em "Exportar" em uma conta
2. Digitar PIN incorreto (ex: "999999")
3. Clicar em "Exportar"

### Resultado Esperado
- Mensagem de erro é exibida
- Mnemonic não é revelado
- Painel permanece aberto

### Evidências
- Screenshot da mensagem de erro

---

## CT-013: Copiar Mnemonic Exportado

### Objetivo
Verificar se é possível copiar o mnemonic revelado

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Mnemonic já revelado através da exportação

### Passos
1. Com o mnemonic já revelado, clicar no botão "Copiar"
2. Abrir bloco de notas e colar (Ctrl+V)

### Resultado Esperado
- Mnemonic completo é copiado para área de transferência
- Ao colar, todas as palavras aparecem no bloco de notas

### Evidências
- Screenshot do mnemonic colado no bloco de notas (pode censurar)

---

## CT-014: Fechar Painel de Exportação

### Objetivo
Verificar se é possível fechar o painel de exportação sem revelar o mnemonic

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Painel de exportação aberto

### Passos
1. Clicar em "Exportar" em uma conta
2. Sem digitar o PIN, clicar em "Fechar" ou "Cancelar"

### Resultado Esperado
- Painel de exportação é fechado
- Mnemonic não é revelado
- Conta permanece na lista normalmente

### Evidências
- Screenshot mostrando o painel fechado

---

## CT-015: Remover Conta

### Objetivo
Verificar se o usuário consegue remover uma conta da wallet

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Ter pelo menos 2 contas (uma pode ser removida sem perder acesso)

### Passos
1. Localizar uma conta que pode ser removida
2. Clicar no botão "Remover" (botão vermelho/destrutivo)
3. Observar que um painel de confirmação aparece
4. Ler a mensagem de confirmação
5. No campo "Confirmar endereço", colar ou digitar o endereço completo da conta
6. Clicar em "Remover" ou "Confirmar Remoção"
7. Aguardar processamento

### Resultado Esperado
- Painel de confirmação é exibido com fundo vermelho/destrutivo
- Mensagem de aviso sobre remoção é mostrada
- Após digitar o endereço correto e confirmar:
  - Mensagem de sucesso é exibida
  - Conta é removida da lista
  - Conta não aparece mais na interface

### Evidências
- Screenshot do painel de confirmação
- Screenshot da lista de contas após remoção (mostrando que a conta foi removida)

---

## CT-016: Cancelar Remoção de Conta

### Objetivo
Verificar se é possível cancelar a remoção de uma conta

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Painel de remoção aberto

### Passos
1. Clicar em "Remover" em uma conta
2. Painel de confirmação é exibido
3. Clicar em "Cancelar"

### Resultado Esperado
- Painel de confirmação é fechado
- Conta permanece na lista
- Nada é removido

### Evidências
- Screenshot mostrando que a conta permanece na lista

---

## CT-017: Validação de Endereço ao Remover Conta

### Objetivo
Verificar validação ao tentar remover conta com endereço incorreto

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Painel de remoção aberto

### Passos
1. Clicar em "Remover" em uma conta
2. No campo de confirmação, digitar endereço diferente (ou texto aleatório)
3. Clicar em "Confirmar Remoção"

### Resultado Esperado
- Mensagem de erro informando que o endereço não confere
- Conta não é removida
- Painel permanece aberto

### Evidências
- Screenshot da mensagem de erro

---

## CT-018: Lista Vazia de Contas

### Objetivo
Verificar comportamento quando não há contas criadas

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Não ter nenhuma conta criada (pode precisar remover todas as contas ou usar navegador em modo anônimo)

### Passos
1. Acessar `/app/wallet/accounts`
2. Observar a área de lista de contas

### Resultado Esperado
- Mensagem "Nenhuma conta encontrada" ou similar é exibida
- Botões "Criar Conta" e "Importar Conta" estão disponíveis
- Lista de contas está vazia

### Evidências
- Screenshot da tela com mensagem de lista vazia

---

## CT-019: Alternar entre Painéis de Criar e Importar

### Objetivo
Verificar se é possível alternar entre os painéis de criar e importar conta

### Pré-condições
- Estar na tela `/app/wallet/accounts`

### Passos
1. Clicar no botão "Criar Conta"
2. Observar que painel de criação é exibido
3. Clicar no botão "Importar Conta"
4. Observar que painel de criação é fechado e painel de importação é aberto
5. Clicar novamente em "Criar Conta"
6. Observar que painel de importação é fechado e painel de criação é aberto

### Resultado Esperado
- Apenas um painel é exibido por vez
- Ao clicar em um botão, o painel anterior é fechado e o novo é aberto
- Campos são limpos ao trocar de painel

### Evidências
- Screenshots dos diferentes estados

---

## CT-020: Data de Criação da Conta

### Objetivo
Verificar se a data de criação é exibida corretamente

### Pré-condições
- Estar na tela `/app/wallet/accounts`
- Ter conta criada

### Passos
1. Criar uma nova conta
2. Observar a informação de data abaixo do endereço

### Resultado Esperado
- Data e hora de criação são exibidas no formato local (ex: "18/10/2025 14:30:45")
- Informação está visível e legível
- Data corresponde ao momento da criação

### Evidências
- Screenshot mostrando a data de criação

---

## Observações Finais

### Notas para o Analista de Testes
1. Todos os testes devem ser executados em diferentes navegadores (Chrome, Firefox, Safari, Edge)
2. Testar também em dispositivos móveis quando aplicável
3. Mnemonic deve sempre ser tratado com cuidado - não compartilhar screenshots completos de mnemonics reais
4. PIN deve ter no mínimo 6 caracteres conforme implementação
5. Sempre manter backup de contas de teste antes de realizar remoções

### Bugs Conhecidos
(A ser preenchido durante os testes)

### Melhorias Sugeridas
(A ser preenchido durante os testes)
