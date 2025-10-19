# Teste de PIN e Scanner QR - Wallet Bazari

## Informações do Documento
- **Módulo**: Wallet - Sistema de PIN e Scanner de QR Code
- **Componentes**: PinDialog, Scanner, PinService
- **Objetivo**: Validar funcionalidades de segurança (PIN) e scanner de QR Code

---

## Pré-requisitos
- Aplicação rodando e acessível
- Conta criada para testar PIN
- (Para scanner) Câmera disponível e QR Codes de teste

---

## Seção 1: Sistema de PIN

## CT-091: Dialog de PIN - Estrutura Básica

### Objetivo
Verificar se o dialog de PIN é exibido corretamente

### Pré-condições
- Iniciar ação que requer PIN (ex: enviar fundos, ativar conta, exportar conta)

### Passos
1. Realizar ação que abre dialog de PIN (ex: clicar em "Enviar" na tela de envio)
2. Observar estrutura do dialog

### Resultado Esperado
Dialog de PIN contém:
- **Overlay**: Fundo escuro com blur cobrindo toda a tela
- **Card central** com:
  - **Header**:
    - Título (ex: "Digite seu PIN")
    - Descrição (ex: "Desbloqueie para assinar a transação")
  - **Content**:
    - Detalhes da transação (se aplicável) em box destacado
    - Campo de input para PIN (tipo password, teclado numérico)
    - Label "PIN"
    - Mensagem de erro (se houver)
  - **Footer/Actions**:
    - Botão "Cancelar"
    - Botão "Confirmar"
- Dialog está centralizado na tela
- Não é possível clicar fora do dialog para fechar

### Evidências
- Screenshot do dialog de PIN completo

---

## CT-092: Campo de Input do PIN

### Objetivo
Verificar comportamento do campo de input de PIN

### Pré-condições
- Dialog de PIN aberto

### Passos
1. Observar o campo de PIN
2. Clicar no campo
3. Digitar números
4. Tentar digitar letras

### Resultado Esperado
- Campo é do tipo `password` (caracteres são mascarados)
- Atributo `inputMode="numeric"` faz teclado numérico aparecer em mobile
- Apenas números podem ser digitados (ou validação posterior)
- Campo recebe foco automaticamente ao abrir (autofocus)
- Caracteres são substituídos por bullets/asteriscos

### Evidências
- Screenshot do campo com PIN digitado (mascarado)

---

## CT-093: Confirmar PIN Correto

### Objetivo
Verificar fluxo de sucesso ao digitar PIN correto

### Pré-condições
- Dialog de PIN aberto
- Conhecer PIN correto da conta

### Passos
1. Digitar PIN correto no campo
2. Clicar em "Confirmar"
3. Aguardar processamento

### Resultado Esperado
- Após clicar em "Confirmar":
  - Botão muda para "Processando..." ou similar
  - Botões ficam desabilitados
  - PIN é validado
  - Se válido:
    - Dialog é fechado
    - Ação continua (ex: transação é enviada, conta é ativada, etc)
  - Não há mensagem de erro

### Evidências
- Screenshot do estado de processamento
- Screenshot da ação completada após fechar dialog

---

## CT-094: Confirmar PIN Incorreto

### Objetivo
Verificar validação de PIN incorreto

### Pré-condições
- Dialog de PIN aberto

### Passos
1. Digitar PIN incorreto (ex: "000000")
2. Clicar em "Confirmar"
3. Aguardar resposta

### Resultado Esperado
- Após clicar em "Confirmar":
  - Validação é executada
  - Mensagem de erro é exibida abaixo do campo: "PIN inválido" ou similar
  - Texto de erro em cor vermelha/destrutiva
  - Dialog permanece aberto
  - Campo de PIN é limpo ou mantém o valor
  - Usuário pode tentar novamente

### Evidências
- Screenshot da mensagem de erro de PIN incorreto

---

## CT-095: Cancelar Dialog de PIN

### Objetivo
Verificar se é possível cancelar a operação

### Pré-condições
- Dialog de PIN aberto

### Passos
1. Sem digitar PIN, clicar em "Cancelar"
2. Observar comportamento

### Resultado Esperado
- Dialog é fechado imediatamente
- Ação é cancelada (transação não é enviada, conta não é ativada, etc)
- Usuário retorna à tela anterior
- Formulário ou estado anterior é preservado (se aplicável)

### Evidências
- Screenshot mostrando que dialog foi fechado e ação cancelada

---

## CT-096: Dialog de PIN com Detalhes de Transação

### Objetivo
Verificar exibição de detalhes de transação no dialog de PIN

### Pré-condições
- Iniciar envio de fundos que abre dialog de PIN

### Passos
1. Preencher formulário de envio (valor, destinatário)
2. Clicar em "Enviar"
3. Observar dialog de PIN

### Resultado Esperado
Dialog exibe box com detalhes da transação contendo:
- **Descrição**: "Transferir [símbolo] para [endereço encurtado]"
- **Valor**: "10 BZR" (exemplo)
- **Taxa de rede**: "0.001 BZR" (exemplo)
- **Separador visual**
- **Total**: "10.001 BZR"
- **Saldo disponível**: "150 BZR" com ícone de verificação
- **Ícone de check verde** se saldo é suficiente
- **Ícone de alerta vermelho** se saldo é insuficiente
- Se saldo insuficiente: **Alert vermelho** com warning "Saldo insuficiente para completar a transação"

Box tem fundo destacado e bordas

### Evidências
- Screenshot do dialog com detalhes de transação

---

## CT-097: Warning de Saldo Insuficiente

### Objetivo
Verificar exibição de warning quando saldo é insuficiente

### Pré-condições
- Tentar enviar valor que excede saldo (incluindo taxa)

### Passos
1. Preencher envio com valor alto (maior que saldo - taxa)
2. Clicar em "Enviar"
3. Observar dialog de PIN

### Resultado Esperado
Dialog exibe:
- Ícone de alerta vermelho ao lado do saldo
- Alert com fundo vermelho contendo:
  - Ícone de alerta
  - Texto: "Saldo insuficiente para completar a transação"
- Usuário ainda pode tentar confirmar (mas pode falhar na blockchain)

### Evidências
- Screenshot do warning de saldo insuficiente

---

## CT-098: Dialog de PIN sem Detalhes de Transação

### Objetivo
Verificar dialog de PIN para ações que não são transações

### Pré-condições
- Ação que requer PIN mas não é transação (ex: exportar conta, ativar conta)

### Passos
1. Clicar em "Exportar" em uma conta
2. Observar dialog de PIN

### Resultado Esperado
- Dialog é exibido sem box de detalhes de transação
- Apenas:
  - Título
  - Descrição (ex: "Desbloqueie para revelar o mnemonic")
  - Campo de PIN
  - Botões

### Evidências
- Screenshot do dialog sem detalhes de transação

---

## CT-099: Múltiplas Tentativas de PIN

### Objetivo
Verificar se é possível tentar múltiplas vezes após erro

### Pré-condições
- Dialog de PIN aberto

### Passos
1. Digitar PIN incorreto
2. Clicar em "Confirmar"
3. Observar erro
4. Digitar novamente (desta vez correto)
5. Clicar em "Confirmar"

### Resultado Esperado
- Após primeiro erro:
  - Mensagem de erro é exibida
  - Campo é liberado para nova tentativa
- Ao digitar PIN correto na segunda tentativa:
  - Erro desaparece
  - Validação é bem-sucedida
  - Ação continua
- Não há limite de tentativas (ou limite alto)

### Evidências
- Screenshots das tentativas

---

## CT-100: PIN e Estado de Loading

### Objetivo
Verificar indicadores de loading durante validação

### Pré-condições
- Dialog de PIN aberto

### Passos
1. Digitar PIN
2. Clicar em "Confirmar"
3. Observar estado do botão

### Resultado Esperado
- Enquanto valida/processa:
  - Botão "Confirmar" muda para "Processando..." ou similar
  - Ambos botões ficam desabilitados
  - Campo de PIN é desabilitado
  - (Opcional) Spinner/loader é exibido
- Após validação:
  - Se sucesso: Dialog fecha
  - Se erro: Estado volta ao normal com erro exibido

### Evidências
- Screenshot do estado de loading

---

## CT-101: PinService - Validação Customizada

### Objetivo
Verificar se validação customizada de PIN funciona (validador async)

### Pré-condições
- Contexto onde PinService.getPin() é chamado com função validate

### Passos
1. Observar comportamento de validação em diferentes contextos
2. Ex: Ao ativar conta, validação verifica se PIN pertence àquela conta

### Resultado Esperado
- Função `validate` é chamada antes de resolver
- Se validate retorna erro: mensagem customizada é exibida
- Se validate retorna null: PIN é aceito
- Erro customizado pode ser específico (ex: "PIN não pertence a esta conta")

### Evidências
- Screenshots de diferentes mensagens de validação customizadas

---

## CT-102: Fechar Dialog ao Pressionar ESC

### Objetivo
Verificar se ESC fecha o dialog

### Pré-condições
- Dialog de PIN aberto

### Passos
1. Pressionar tecla ESC

### Resultado Esperado
- Dialog é fechado (mesmo comportamento que "Cancelar")
- OU: ESC é ignorado (dialog modal não fecha com ESC)

Verificar qual é o comportamento implementado

### Evidências
- Anotar comportamento observado

---

## Seção 2: Scanner de QR Code

## CT-103: Abrir Scanner de QR Code

### Objetivo
Verificar se scanner abre corretamente

### Pré-condições
- Estar na tela de envio
- Navegador com suporte a câmera

### Passos
1. Clicar no botão "Escanear" ao lado do campo destinatário
2. Observar área de scanner

### Resultado Esperado
- Área de scanner é exibida abaixo do formulário
- Box com:
  - Elemento `<video>` mostrando preview da câmera
  - Fundo preto
  - Bordas arredondadas
  - Tamanho fixo (ex: altura 192px)
- Navegador solicita permissão de câmera (primeira vez)

### Evidências
- Screenshot da solicitação de permissão
- Screenshot do scanner ativo com preview

---

## CT-104: Permissão de Câmera - Concedida

### Objetivo
Verificar comportamento quando permissão é concedida

### Pré-condições
- Scanner aberto
- Primeira vez usando câmera no site

### Passos
1. Abrir scanner
2. Navegador solicita permissão
3. Clicar em "Permitir"

### Resultado Esperado
- Após permitir:
  - Preview da câmera é exibido no elemento video
  - Scanner fica ativo
  - Imagem da câmera é exibida em tempo real
- Scanner começa a procurar por QR Codes automaticamente

### Evidências
- Screenshot do preview da câmera ativo

---

## CT-105: Permissão de Câmera - Negada

### Objetivo
Verificar comportamento quando permissão é negada

### Pré-condições
- Scanner aberto
- Permissão solicitada

### Passos
1. Abrir scanner
2. Clicar em "Bloquear" ou "Negar" na solicitação de permissão

### Resultado Esperado
- Mensagem de erro é exibida: "Permissão de câmera negada" ou similar
- Preview não é exibido (video fica preto ou vazio)
- Erro em cor vermelha abaixo do video

### Evidências
- Screenshot do erro de permissão negada

---

## CT-106: Escanear QR Code com Endereço

### Objetivo
Verificar se scanner lê QR Code e preenche campo

### Pré-condições
- Scanner aberto com câmera funcionando
- QR Code com endereço válido disponível

### Passos
1. Apontar câmera para QR Code com endereço
2. Aguardar leitura automática

### Resultado Esperado
- Scanner detecta o QR Code automaticamente
- Ao detectar:
  - Endereço é extraído do QR Code
  - Campo "Destinatário" é preenchido automaticamente com o endereço
  - Scanner é fechado automaticamente
  - Câmera é desligada
- Se QR Code contém formato `substrate:5FHne...`, apenas endereço é extraído

### Evidências
- Screenshot do campo destinatário preenchido após scan

---

## CT-107: Escanear QR Code Inválido

### Objetivo
Verificar comportamento ao escanear QR Code que não contém endereço

### Pré-condições
- Scanner aberto
- QR Code com conteúdo inválido (ex: URL, texto aleatório)

### Passos
1. Apontar câmera para QR Code inválido
2. Aguardar tentativa de leitura

### Resultado Esperado
- Scanner tenta ler o QR Code
- Pode exibir erro: "QR Code inválido" ou similar
- OU: Preenche campo com o conteúdo lido (que será invalidado posteriormente)
- Scanner pode permanecer aberto para nova tentativa

### Evidências
- Screenshot do comportamento ao escanear QR inválido

---

## CT-108: Fechar Scanner sem Escanear

### Objetivo
Verificar se é possível fechar scanner manualmente

### Pré-condições
- Scanner aberto

### Passos
1. Clicar novamente no botão "Escanear" (que agora pode fechar o scanner)
2. OU: Procurar botão de fechar

### Resultado Esperado
- Scanner é fechado
- Câmera é desligada
- Campo destinatário mantém valor anterior (se houver)
- Botão "Escanear" volta ao estado inicial

### Evidências
- Screenshot mostrando scanner fechado

---

## CT-109: Scanner - Preview de Câmera

### Objetivo
Verificar qualidade e funcionalidade do preview

### Pré-condições
- Scanner aberto com câmera ativa

### Passos
1. Observar preview da câmera
2. Mover câmera (se em dispositivo móvel) ou objeto (se webcam)

### Resultado Esperado
- Preview é exibido em tempo real
- Frame rate é aceitável (não travando)
- Video tem dimensões fixas (192px altura x largura total)
- Video usa `object-fit: cover` para preencher área
- Qualidade é suficiente para detectar QR Codes

### Evidências
- Screenshot do preview

---

## CT-110: Erro de Câmera Indisponível

### Objetivo
Verificar comportamento quando não há câmera disponível

### Pré-condições
- Dispositivo sem câmera ou câmera em uso por outro app

### Passos
1. Tentar abrir scanner sem câmera disponível

### Resultado Esperado
- Mensagem de erro é exibida
- Possíveis erros:
  - "Câmera não disponível"
  - "Câmera em uso por outro aplicativo"
- Preview não é exibido

### Evidências
- Screenshot do erro de câmera indisponível

---

## CT-111: Scanner - Responsividade Mobile

### Objetivo
Verificar scanner em dispositivo móvel

### Pré-condições
- Acessar em dispositivo móvel
- Abrir scanner

### Passos
1. Abrir scanner em mobile
2. Observar layout e funcionalidade

### Resultado Esperado
- Scanner funciona em mobile
- Preview ocupa largura adequada
- Câmera traseira é usada por padrão (se disponível)
- É possível escanear QR Codes confortavelmente
- Layout é responsivo

### Evidências
- Screenshot do scanner em mobile

---

## CT-112: Múltiplas Leituras Sequenciais

### Objetivo
Verificar se é possível escanear múltiplos QR Codes em sequência

### Pré-condições
- Scanner funcionando
- Múltiplos QR Codes disponíveis

### Passos
1. Escanear primeiro QR Code
2. Scanner fecha e preenche campo
3. Abrir scanner novamente
4. Escanear segundo QR Code

### Resultado Esperado
- Primeira leitura funciona e preenche campo
- É possível abrir scanner novamente
- Segunda leitura sobrescreve o campo com novo endereço
- Não há erros ou travamentos

### Evidências
- Screenshots das diferentes leituras

---

## CT-113: Scanner - Cleanup de Recursos

### Objetivo
Verificar se recursos da câmera são liberados corretamente

### Pré-condições
- Scanner aberto

### Passos
1. Abrir scanner (câmera ativa)
2. Fechar scanner
3. Navegar para outra página
4. Voltar e abrir scanner novamente

### Resultado Esperado
- Ao fechar scanner, câmera é desligada (luz da câmera apaga)
- Recursos são liberados
- Ao abrir novamente, câmera funciona normalmente
- Não há vazamento de recursos (memory leak)

### Evidências
- Verificar luz da câmera apagando ao fechar
- Testar reabertura do scanner

---

## CT-114: Biblioteca ZXing - Erros Ignorados

### Objetivo
Verificar se erros da biblioteca de scan não quebram a interface

### Pré-condições
- Scanner ativo

### Passos
1. Observar console do navegador
2. Apontar câmera para diferentes objetos (não QR Codes)

### Resultado Esperado
- Erros "No MultiFormat Readers" são ignorados (não exibidos ao usuário)
- Apenas erros relevantes são mostrados
- Interface permanece funcional

### Evidências
- Screenshot do console (se houver erros)

---

## CT-115: Acessibilidade do Scanner

### Objetivo
Verificar acessibilidade do componente de scanner

### Pré-condições
- Scanner aberto

### Passos
1. Verificar atributos ARIA e roles
2. Testar com leitor de tela

### Resultado Esperado
- Elemento video tem descrição acessível
- Mensagens de erro têm role="status" e aria-live="polite"
- Botão de escanear tem label descritivo
- Leitor de tela anuncia estado do scanner

### Evidências
- Lista de atributos de acessibilidade encontrados

---

## Observações Finais

### Notas para o Analista de Testes

**Sistema de PIN:**
1. Sempre testar com PINs de diferentes tamanhos
2. Verificar se PIN é mascarado em screenshots (segurança)
3. Testar em diferentes contextos (envio, ativação, exportação)
4. Validar mensagens de erro específicas de cada contexto
5. Verificar que dialog não fecha acidentalmente (modal)

**Scanner de QR Code:**
1. Testar com diferentes tipos de QR Codes
2. Verificar iluminação adequada ao testar scanner
3. Testar em diferentes dispositivos e navegadores
4. Verificar permissões de câmera em configurações do navegador
5. Sempre verificar se câmera é desligada ao fechar

### Componentes Relacionados
- `PinDialog.tsx` - Componente do dialog de PIN
- `PinService.ts` - Serviço de gerenciamento de estado do PIN
- `Scanner.tsx` - Componente do scanner de QR Code
- Biblioteca `@zxing/browser` para leitura de QR Codes

### Funcionalidades de Segurança
- PIN nunca é armazenado em claro
- PIN é usado para descriptografar mnemonic criptografado
- Validação customizada por contexto
- Máscaramento visual do PIN

### Bugs Conhecidos
(A ser preenchido durante os testes)

### Melhorias Sugeridas
(A ser preenchido durante os testes)
