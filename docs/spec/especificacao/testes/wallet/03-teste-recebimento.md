# Teste de Recebimento de Fundos - Wallet Bazari

## Informações do Documento
- **Módulo**: Wallet - Recebimento de Fundos
- **Tela**: ReceivePage (`/app/wallet/receive`)
- **Objetivo**: Validar funcionalidades de exibição de endereço, QR Code e compartilhamento para recebimento

---

## Pré-requisitos
- Aplicação rodando e acessível
- Ter pelo menos uma conta ativa
- Navegador com suporte a Clipboard API
- (Opcional) Leitor de QR Code para validar QR Code gerado

---

## CT-041: Acessar Tela de Recebimento sem Conta

### Objetivo
Verificar comportamento ao acessar tela de recebimento sem conta ativa

### Pré-condições
- Não ter conta ativa
- Acessar `/app/wallet/receive`

### Passos
1. Acessar a URL `/app/wallet/receive` sem conta ativa

### Resultado Esperado
- Mensagem "Nenhuma conta ativa" ou similar é exibida
- QR Code não é exibido
- Endereço não é exibido

### Evidências
- Screenshot da mensagem quando não há conta

---

## CT-042: Visualizar Endereço de Recebimento

### Objetivo
Verificar se o endereço da conta ativa é exibido corretamente

### Pré-condições
- Ter conta ativa
- Estar na tela `/app/wallet/receive`

### Passos
1. Acessar a tela de recebimento
2. Observar o card com informações de endereço

### Resultado Esperado
A tela exibe:
- Título: "Receber" ou similar
- Subtítulo explicativo
- Card contendo:
  - Título: "Seu endereço" ou similar
  - Descrição: "Compartilhe este endereço para receber fundos" ou similar
  - QR Code gerado a partir do endereço
  - Endereço completo exibido em formato `code` (monospace)
  - Botão "Copiar"
  - Botão "Compartilhar" (se suportado pelo navegador/dispositivo)
  - Informação sobre o formato do endereço (SS58 prefix e versão encurtada)
- Alert/Box informativo sobre a rede (ex: "Receba apenas tokens BZR nesta rede")

### Evidências
- Screenshot da tela completa de recebimento

---

## CT-043: QR Code Gerado Corretamente

### Objetivo
Verificar se o QR Code é gerado e pode ser escaneado

### Pré-condições
- Estar na tela de recebimento com conta ativa
- Ter leitor de QR Code disponível (app no celular ou software)

### Passos
1. Observar o QR Code exibido na tela
2. Usar leitor de QR Code para escanear (pode tirar foto da tela com celular)
3. Verificar o conteúdo lido

### Resultado Esperado
- QR Code é exibido claramente
- QR Code pode ser escaneado
- Conteúdo lido contém o endereço completo da conta
- Formato pode ser `substrate:5FHne...` ou apenas o endereço

### Evidências
- Screenshot do QR Code
- Screenshot ou texto do conteúdo escaneado

---

## CT-044: Copiar Endereço

### Objetivo
Verificar se o botão de copiar endereço funciona

### Pré-condições
- Estar na tela de recebimento com conta ativa

### Passos
1. Clicar no botão "Copiar" ou "Copiar endereço"
2. Observar feedback visual
3. Abrir bloco de notas ou editor de texto
4. Colar (Ctrl+V ou Cmd+V)

### Resultado Esperado
- Após clicar em "Copiar":
  - Texto do botão muda para "Copiado!" ou similar
  - Feedback visual é exibido por ~2 segundos
  - Endereço é copiado para área de transferência
- Ao colar, endereço completo aparece no editor
- Endereço colado corresponde ao exibido na tela

### Evidências
- Screenshot do feedback "Copiado!"
- Screenshot do endereço colado no editor

---

## CT-045: Botão Compartilhar (Web Share API)

### Objetivo
Verificar se o botão de compartilhar funciona em dispositivos/navegadores que suportam

### Pré-condições
- Estar na tela de recebimento
- Usar navegador/dispositivo com suporte a Web Share API (geralmente mobile)

### Passos
1. Observar se botão "Compartilhar" está visível
2. Clicar no botão "Compartilhar"
3. Observar que dialog nativo de compartilhamento do sistema é aberto
4. Verificar conteúdo a ser compartilhado

### Resultado Esperado
- Botão "Compartilhar" está visível apenas em navegadores com suporte
- Ao clicar, dialog nativo do sistema é aberto
- Conteúdo compartilhado contém:
  - Título: "Receber BZR" ou similar
  - Texto explicativo
  - URL ou endereço no formato `substrate:5FHne...`
- Usuário pode escolher app para compartilhar (WhatsApp, Telegram, Email, etc)

### Evidências
- Screenshot do botão "Compartilhar"
- Screenshot do dialog de compartilhamento do sistema (se possível)

---

## CT-046: Compartilhar em Desktop (sem suporte)

### Objetivo
Verificar comportamento em navegadores desktop que não suportam Web Share API

### Pré-condições
- Usar navegador desktop (Chrome/Firefox no PC)
- Estar na tela de recebimento

### Passos
1. Observar a área de botões

### Resultado Esperado
- Botão "Compartilhar" não é exibido OU está desabilitado
- Apenas botão "Copiar" está disponível

### Evidências
- Screenshot mostrando ausência do botão compartilhar

---

## CT-047: Formato do Endereço SS58

### Objetivo
Verificar se o endereço é exibido no formato SS58 correto da rede

### Pré-condições
- Estar na tela de recebimento
- Conhecer o SS58 prefix da rede Bazari

### Passos
1. Observar o endereço completo exibido
2. Verificar informação sobre o formato na tela
3. Comparar com endereço em outra tela (ex: Accounts)

### Resultado Esperado
- Endereço é exibido no formato SS58 correto
- Informação sobre o prefix é exibida (ex: "Formato: SS58 (prefix: 42)")
- Versão encurtada do endereço também pode ser exibida (ex: "5FHne...3c4d")
- Endereço é consistente em todas as telas da wallet

### Evidências
- Screenshot mostrando o endereço e informações de formato

---

## CT-048: Responsividade - Mobile

### Objetivo
Verificar se a tela de recebimento é responsiva em dispositivos móveis

### Pré-condições
- Acessar tela em dispositivo móvel ou usar DevTools para simular

### Passos
1. Acessar `/app/wallet/receive` em mobile ou simulador
2. Observar layout

### Resultado Esperado
- QR Code e endereço são exibidos em layout vertical (coluna)
- QR Code tem tamanho adequado para a tela
- Endereço é quebrado em múltiplas linhas se necessário
- Botões são empilhados verticalmente ou em grid responsivo
- Tudo é legível e acessível sem zoom

### Evidências
- Screenshot da tela em mobile

---

## CT-049: Responsividade - Desktop

### Objetivo
Verificar layout em tela desktop

### Pré-condições
- Acessar tela em desktop

### Passos
1. Acessar `/app/wallet/receive` em tela grande
2. Observar layout

### Resultado Esperado
- QR Code e endereço podem estar lado a lado (layout horizontal)
- QR Code tem tamanho fixo adequado
- Endereço é exibido em uma ou poucas linhas
- Botões são exibidos em linha horizontal
- Layout aproveita bem o espaço disponível

### Evidências
- Screenshot da tela em desktop

---

## CT-050: Alert Informativo sobre a Rede

### Objetivo
Verificar se há informação sobre qual rede/token pode ser recebido

### Pré-condições
- Estar na tela de recebimento

### Passos
1. Rolar a tela até o final
2. Observar alertas ou boxes informativos

### Resultado Esperado
- Alert/box informativo é exibido
- Mensagem informa qual token pode ser recebido (ex: "Receba apenas tokens BZR da rede Bazari neste endereço")
- Cor do alert é neutra ou informativa (azul/cinza)

### Evidências
- Screenshot do alert informativo

---

## CT-051: Erro ao Carregar Propriedades da Chain

### Objetivo
Verificar comportamento quando há erro ao carregar propriedades da blockchain

### Pré-condições
- Simular erro de conexão com a chain (desconectar RPC ou usar mock)

### Passos
1. Acessar tela de recebimento com erro de chain
2. Observar mensagens de erro

### Resultado Esperado
- Alert de erro é exibido: "Erro ao conectar com a blockchain" ou similar
- Endereço ainda pode ser exibido (formato genérico)
- QR Code pode ser gerado com endereço genérico
- Funcionalidades básicas (copiar) ainda funcionam

### Evidências
- Screenshot do erro de chain

---

## CT-052: Múltiplas Contas - Trocar Conta Ativa

### Objetivo
Verificar se o endereço muda ao trocar a conta ativa

### Pré-condições
- Ter 2 ou mais contas criadas
- Estar na tela de recebimento

### Passos
1. Anotar o endereço atual exibido
2. Tirar screenshot do QR Code atual
3. Navegar para `/app/wallet/accounts`
4. Trocar a conta ativa para outra conta
5. Voltar para `/app/wallet/receive`
6. Observar o endereço e QR Code

### Resultado Esperado
- Endereço exibido muda para o endereço da nova conta ativa
- QR Code é regenerado com o novo endereço
- Informações de formato são atualizadas
- Não há cache do endereço anterior

### Evidências
- Screenshot do primeiro endereço
- Screenshot do segundo endereço após trocar conta

---

## CT-053: Acessibilidade - Leitores de Tela

### Objetivo
Verificar se a tela é acessível para usuários com leitores de tela

### Pré-condições
- Ativar leitor de tela (NVDA, JAWS, VoiceOver, etc)
- Acessar tela de recebimento

### Passos
1. Navegar pela tela usando apenas teclado (Tab)
2. Ouvir descrições do leitor de tela

### Resultado Esperado
- Título e descrição são lidos corretamente
- Endereço é identificado como código/texto importante
- Botões têm labels descritivas ("Copiar endereço", "Compartilhar endereço")
- QR Code tem texto alternativo descritivo
- Alert informativo é lido corretamente
- Ordem de foco é lógica

### Evidências
- Lista de elementos lidos pelo screen reader
- Ordem de navegação por Tab

---

## CT-054: Atualização Dinâmica ao Trocar Conta

### Objetivo
Verificar se a tela se atualiza dinamicamente sem necessidade de refresh

### Pré-condições
- Ter múltiplas contas
- Tela de recebimento aberta

### Passos
1. Abrir tela de recebimento em uma aba
2. Abrir tela de contas em outra aba
3. Trocar a conta ativa na segunda aba
4. Voltar para a aba de recebimento (sem dar refresh)

### Resultado Esperado
- Endereço e QR Code são atualizados automaticamente
- Não é necessário dar refresh manual na página
- Mudança é refletida imediatamente ou em poucos segundos

### Evidências
- Screenshot antes e depois da troca de conta (mesma aba)

---

## CT-055: Validação do QR Code com Scanner

### Objetivo
Validar que o QR Code contém o endereço correto e pode ser escaneado por wallet externa

### Pré-condições
- Ter outra wallet com scanner de QR Code (ex: wallet mobile)
- Estar na tela de recebimento

### Passos
1. Exibir a tela de recebimento em um monitor/tela
2. Usar wallet mobile ou app de envio para escanear o QR Code
3. Verificar o endereço lido

### Resultado Esperado
- Wallet externa consegue escanear o QR Code
- Endereço lido corresponde exatamente ao exibido na tela
- Wallet externa reconhece o endereço como válido
- É possível iniciar envio para este endereço a partir da wallet externa

### Evidências
- Screenshot da wallet externa mostrando o endereço escaneado

---

## CT-056: Copiar Endereço Múltiplas Vezes

### Objetivo
Verificar se é possível copiar o endereço múltiplas vezes seguidas

### Pré-condições
- Estar na tela de recebimento

### Passos
1. Clicar em "Copiar"
2. Aguardar feedback "Copiado!"
3. Aguardar feedback desaparecer (~2s)
4. Clicar em "Copiar" novamente
5. Colar em editor

### Resultado Esperado
- É possível copiar múltiplas vezes
- Feedback é exibido a cada clique
- Endereço é copiado corretamente sempre

### Evidências
- Screenshot mostrando que é possível copiar novamente

---

## CT-057: Navegação - Menu de Wallet

### Objetivo
Verificar se a navegação entre telas da wallet funciona

### Pré-condições
- Estar na tela de recebimento

### Passos
1. Observar menu de navegação da wallet (tabs/links)
2. Clicar em "Overview" / "Dashboard"
3. Voltar e clicar em "Enviar"
4. Voltar e clicar em "Receber"

### Resultado Esperado
- Menu de navegação está visível e acessível
- Item "Receber" está destacado/ativo quando na tela de recebimento
- Ao clicar em outras abas, navegação funciona corretamente
- Estado da tela de recebimento é preservado ao voltar

### Evidências
- Screenshot do menu com "Receber" ativo

---

## CT-058: Endereço Formatado vs Raw

### Objetivo
Verificar se o endereço é formatado corretamente de acordo com a chain

### Pré-condições
- Conhecer o endereço raw (genérico) da conta
- Conhecer o SS58 prefix da chain Bazari

### Passos
1. Acessar tela de recebimento
2. Copiar o endereço exibido
3. Comparar com o endereço em formato genérico (prefix 42)

### Resultado Esperado
- Endereço exibido usa o SS58 prefix correto da chain Bazari
- Se prefix da chain é diferente de 42, o endereço é diferente do genérico
- Informação sobre o prefix é exibida na tela
- Exemplo de versão encurtada é exibida (ex: "5FHne...3c4d")

### Evidências
- Screenshot do endereço formatado
- Comparação com endereço genérico (documentar os formatos)

---

## CT-059: Performance do Carregamento

### Objetivo
Verificar se a tela carrega rapidamente

### Pré-condições
- Rede estável
- Conta ativa

### Passos
1. Acessar `/app/wallet/receive`
2. Medir tempo de carregamento até QR Code e endereço aparecerem

### Resultado Esperado
- Tela carrega em menos de 2 segundos
- QR Code é gerado rapidamente
- Não há delay perceptível na exibição do endereço

### Evidências
- Anotar tempo de carregamento
- Screenshot da tela carregada

---

## CT-060: Teste de Stress - QR Code Muito Grande

### Objetivo
Verificar comportamento se o endereço for muito longo (caso extremo)

### Pré-condições
- (Este teste pode não ser aplicável se o endereço tem tamanho fixo)

### Passos
1. Observar tamanho do QR Code
2. Observar renderização do endereço

### Resultado Esperado
- QR Code é renderizado corretamente independente do tamanho
- Endereço muito longo é quebrado em múltiplas linhas
- Interface não quebra ou corta informações

### Evidências
- Screenshot do endereço e QR Code

---

## Observações Finais

### Notas para o Analista de Testes
1. Testar em diferentes dispositivos (desktop, tablet, mobile)
2. Testar em diferentes navegadores (Chrome, Firefox, Safari, Edge)
3. Validar QR Code com leitor externo real sempre que possível
4. Verificar que endereço copiado não contém espaços ou caracteres extras
5. Testar com diferentes níveis de zoom no navegador

### Funcionalidades da Tela
- Exibição de endereço formatado
- Geração de QR Code
- Cópia de endereço para clipboard
- Compartilhamento nativo (mobile)
- Informações sobre formato e rede
- Responsividade

### Componentes Relacionados
- `AddressQr` component (geração de QR Code)
- `useChainProps` hook (propriedades da chain)
- Utilitários de formatação (`normaliseAddress`, `shortenAddress`)

### Bugs Conhecidos
(A ser preenchido durante os testes)

### Melhorias Sugeridas
(A ser preenchido durante os testes)
