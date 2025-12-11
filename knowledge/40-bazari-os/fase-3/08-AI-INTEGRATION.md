# 08 - Integracao com IA (Especialista Bazari)

## Objetivo

Integrar um assistente de IA **especialista no ecossistema Bazari** para ajudar desenvolvedores:
- Gerar codigo usando o SDK Bazari corretamente
- Explicar padroes e APIs do ecossistema
- Debugar erros especificos do Bazari
- Sugerir solucoes dentro do escopo disponivel
- **CRITICO**: IA usa APENAS o fluxo e APIs existentes - NAO inventa nada novo

## Principio Fundamental: Especialista Bazari

A IA NAO e um assistente de programacao generico. Ela e um **Especialista Bazari** que:

1. **CONHECE profundamente**:
   - SDK Bazari (`@bazari.libervia.xyz/app-sdk`)
   - Estrutura de projetos e templates
   - Padroes ink! para smart contracts
   - APIs disponiveis no ecossistema
   - Fluxo de desenvolvimento: create → build → publish
   - Permissoes e manifest

2. **NAO FAZ**:
   - Inventar endpoints que nao existem
   - Sugerir bibliotecas incompativeis
   - Criar fluxos alternativos ao CLI
   - Modificar o SDK
   - Acessar recursos fora do escopo Bazari

3. **Segue o fluxo existente**:

```
Prompt do usuario
       │
       ▼
IA analisa e planeja (dentro do escopo Bazari)
       │
       ▼
IA gera codigo usando SDK/APIs documentadas:
- Edita arquivos via Monaco → salva via API local
- Build via API local (mesma logica do CLI)
- Publish via API local (mesma logica do CLI)
       │
       ▼
Admin aprova (fluxo normal)
```

## Arquivos a Criar

```
apps/web/src/apps/studio/
├── services/
│   └── ai.service.ts           // Service de IA
├── components/
│   └── ai/
│       ├── AIAssistant.tsx     // Painel principal
│       ├── AIPromptInput.tsx   // Input de prompt
│       ├── AIMessage.tsx       // Mensagem individual
│       └── AICodeBlock.tsx     // Bloco de codigo
├── hooks/
│   └── useAI.ts                // Hook para IA
├── data/
│   └── ai/
│       ├── system-prompt.ts    // System prompt com contexto
│       └── examples.ts         // Exemplos few-shot
└── types/
    └── ai.types.ts             // Tipos
```

## Especificacao

### ai.types.ts

```typescript
interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeBlocks?: CodeBlock[];
  actions?: AIAction[];
}

interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

interface AIAction {
  type: 'create_file' | 'edit_file' | 'run_command' | 'apply_code';
  payload: unknown;
  label: string;
}

interface AIContext {
  projectName: string;
  projectType: 'react-ts' | 'vanilla' | 'contract';
  openFiles: string[];
  currentFile?: {
    path: string;
    content: string;
  };
  manifest: AppManifest;
  recentErrors?: string[];
}
```

### ai.service.ts

```typescript
class AIService {
  private apiKey: string;
  private conversationHistory: AIMessage[] = [];

  constructor() {
    // API key deve vir de configuracao segura
    this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  }

  async chat(
    userMessage: string,
    context: AIContext
  ): Promise<AIMessage> {
    // Construir system prompt com contexto do projeto
    const systemPrompt = this.buildSystemPrompt(context);

    // Chamar Claude API
    const response = await this.callClaudeAPI(systemPrompt, userMessage);

    // Processar resposta e extrair acoes
    return this.processResponse(response);
  }

  private buildSystemPrompt(context: AIContext): string {
    return `${BAZARI_SYSTEM_PROMPT}

## Contexto do Projeto Atual

- Nome: ${context.projectName}
- Tipo: ${context.projectType}
- Manifest: ${JSON.stringify(context.manifest, null, 2)}

## Arquivo Atual
${context.currentFile ? `
Path: ${context.currentFile.path}
\`\`\`${getLanguage(context.currentFile.path)}
${context.currentFile.content}
\`\`\`
` : 'Nenhum arquivo aberto'}

## Erros Recentes
${context.recentErrors?.join('\n') || 'Nenhum erro recente'}

## Regras CRITICAS

1. SEMPRE use o fluxo CLI existente:
   - Para criar projeto: use CreateService (que executa equivalente ao bazari create)
   - Para build: use BuildService (que executa equivalente ao bazari build)
   - Para publicar: use PublishService (que executa equivalente ao bazari publish)

2. NUNCA invente novos endpoints, comandos ou fluxos
3. O codigo gerado deve seguir os padroes do template existente
4. Use APENAS as APIs do @bazari.libervia.xyz/app-sdk documentadas
`;
  }

  private async callClaudeAPI(
    systemPrompt: string,
    userMessage: string
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...this.conversationHistory.map(m => ({
            role: m.role,
            content: m.content,
          })),
          { role: 'user', content: userMessage },
        ],
      }),
    });

    const data = await response.json();
    return data.content[0].text;
  }

  private processResponse(response: string): AIMessage {
    const codeBlocks = this.extractCodeBlocks(response);
    const actions = this.extractActions(response, codeBlocks);

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      codeBlocks,
      actions,
    };
  }

  private extractCodeBlocks(text: string): CodeBlock[] {
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];

    let match;
    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'plaintext',
        code: match[2].trim(),
      });
    }

    return blocks;
  }

  private extractActions(text: string, codeBlocks: CodeBlock[]): AIAction[] {
    const actions: AIAction[] = [];

    // Se tem codigo TypeScript/JavaScript, oferecer aplicar
    codeBlocks.forEach((block, index) => {
      if (['typescript', 'tsx', 'javascript', 'jsx'].includes(block.language)) {
        actions.push({
          type: 'apply_code',
          payload: { code: block.code, index },
          label: 'Aplicar codigo',
        });
      }
    });

    // Detectar comandos sugeridos
    if (text.includes('npm install') || text.includes('npm run')) {
      const cmdMatch = text.match(/(npm (?:install|run) [^\n]+)/);
      if (cmdMatch) {
        actions.push({
          type: 'run_command',
          payload: { command: cmdMatch[1] },
          label: `Executar: ${cmdMatch[1]}`,
        });
      }
    }

    return actions;
  }
}
```

### system-prompt.ts

```typescript
export const BAZARI_SYSTEM_PROMPT = `
# Bazari Studio AI Assistant

Voce e um assistente de desenvolvimento para a plataforma Bazari. Sua funcao e ajudar desenvolvedores a criar apps para o ecossistema Bazari.

## Sobre o Bazari

Bazari e uma plataforma de comercio descentralizado com:
- Tokens BZR (nativo) e ZARI (stablecoin)
- Apps que rodam em sandbox (iframe)
- SDK para integracao (@bazari.libervia.xyz/app-sdk)
- Smart contracts em ink! (Rust)

## SDK Bazari - API Disponivel

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK({ debug: true });
await sdk.init();

// Auth
const user = await sdk.auth.getCurrentUser();
// Retorna: { id, handle, displayName, avatar?, roles[] }

// Wallet
const balance = await sdk.wallet.getBalance();
// Retorna: { bzr, zari, formatted: { bzr, zari } }

const history = await sdk.wallet.getHistory({ limit: 20 });
// Retorna: SDKTransaction[]

await sdk.wallet.requestTransfer({ to: 'address', amount: '1000000000000', assetId?: 'native' });
// Abre modal de confirmacao

// Storage
await sdk.storage.set('key', { data: 'value' });
const data = await sdk.storage.get('key');
await sdk.storage.remove('key');

// UI
await sdk.ui.success('Mensagem de sucesso');
await sdk.ui.error('Mensagem de erro');
await sdk.ui.info('Informacao');
const confirmed = await sdk.ui.confirm({ title: 'Confirmar?', message: '...' });
\`\`\`

## Estrutura de Projeto Padrao

\`\`\`
my-app/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── bazari.manifest.json     # Obrigatorio
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── hooks/
│   │   └── useBazari.ts     # Hook para SDK
│   └── components/
│       └── ...
└── dist/                    # Gerado pelo build
\`\`\`

## bazari.manifest.json

\`\`\`json
{
  "appId": "com.bazari.meu-app",
  "name": "Meu App",
  "slug": "meu-app",
  "version": "0.1.0",
  "description": "Descricao do app",
  "category": "tools",
  "tags": ["tag1", "tag2"],
  "icon": "Package",
  "color": "from-blue-500 to-purple-600",
  "entryPoint": "/index.html",
  "permissions": [
    { "id": "user.profile.read", "reason": "Para exibir seu perfil" },
    { "id": "wallet.balance.read", "reason": "Para exibir seu saldo" }
  ],
  "sdkVersion": "0.2.0",
  "monetizationType": "FREE"
}
\`\`\`

## Permissoes Disponiveis

- \`user.profile.read\` - Ler perfil do usuario
- \`wallet.balance.read\` - Ler saldo
- \`wallet.history.read\` - Ler historico de transacoes
- \`wallet.transfer.request\` - Solicitar transferencias
- \`storage.app\` - Armazenamento local do app
- \`notifications\` - Enviar notificacoes
- \`location\` - Acessar localizacao
- \`blockchain.sign\` - Assinar transacoes

## Fluxo de Desenvolvimento

1. \`bazari create\` - Cria projeto a partir de template
2. \`npm install\` - Instala dependencias
3. \`npm run dev\` ou \`bazari dev\` - Servidor de desenvolvimento
4. Editar codigo
5. \`bazari build\` - Compila para producao
6. \`bazari publish\` - Publica para review
7. Admin aprova - App vai para producao

## Instrucoes para Respostas

1. Sempre forneca codigo completo e funcional
2. Use TypeScript com tipos corretos
3. Siga os padroes do template existente
4. Inclua tratamento de erros
5. Explique o que o codigo faz
6. Se precisar criar multiplos arquivos, indique o path de cada um
7. NUNCA sugira modificar o SDK ou criar novos endpoints
8. Use apenas as APIs documentadas acima
`;
```

### AIAssistant.tsx

```typescript
interface AIAssistantProps {
  context: AIContext;
  onApplyCode: (path: string, code: string) => void;
  onRunCommand: (command: string) => void;
}

export function AIAssistant({ context, onApplyCode, onRunCommand }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const aiService = useRef(new AIService());
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiService.current.chat(input, context);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: AIAction) => {
    switch (action.type) {
      case 'apply_code':
        const { code, index } = action.payload as { code: string; index: number };
        // Pedir ao usuario para escolher o arquivo
        onApplyCode(context.currentFile?.path || 'src/App.tsx', code);
        break;

      case 'run_command':
        const { command } = action.payload as { command: string };
        onRunCommand(command);
        break;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <Bot className="w-5 h-5 text-primary" />
        <span className="font-medium">AI Assistant</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Como posso ajudar?</p>
            <p className="text-sm">
              Posso gerar codigo, explicar funcionalidades, ou ajudar com erros.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <AIMessage
            key={message.id}
            message={message}
            onAction={handleAction}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Pensando...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <AIPromptInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isLoading}
        suggestions={[
          'Crie um componente de card de produto',
          'Adicione funcionalidade de carrinho',
          'Explique como funciona o SDK',
          'Corrija o erro no codigo atual',
        ]}
      />
    </div>
  );
}
```

### AIMessage.tsx

```typescript
interface AIMessageProps {
  message: AIMessage;
  onAction: (action: AIAction) => void;
}

export function AIMessage({ message, onAction }: AIMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={cn(
        'flex-1 space-y-2',
        isUser && 'text-right'
      )}>
        <div className={cn(
          'inline-block p-3 rounded-lg max-w-[85%]',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          <Markdown content={message.content} />
        </div>

        {/* Code blocks */}
        {message.codeBlocks?.map((block, index) => (
          <AICodeBlock key={index} block={block} />
        ))}

        {/* Actions */}
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                onClick={() => onAction(action)}
              >
                {action.type === 'apply_code' && <Code className="w-3 h-3 mr-1" />}
                {action.type === 'run_command' && <Terminal className="w-3 h-3 mr-1" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

## Exemplos de Uso

### 1. Criar Componente

**Usuario**: "Crie um componente de card de produto com nome, preco e botao comprar"

**IA**: Gera codigo e oferece acao "Aplicar codigo"

### 2. Explicar Codigo

**Usuario**: "O que faz esse hook useBazari?"

**IA**: Explica o codigo linha por linha

### 3. Debugar Erro

**Usuario**: "Estou recebendo erro 'SDK not initialized'"

**IA**: Explica o erro e sugere solucao

### 4. Gerar App Completo

**Usuario**: "Crie um app de lista de tarefas com persistencia"

**IA**:
1. Planeja estrutura
2. Gera arquivos necessarios
3. Usuario aplica cada arquivo
4. Testa no preview

## Seguranca

1. **API Key**: Nunca expor no cliente
   - Usar backend proxy ou Anthropic's streaming
   - Validar requests

2. **Sanitizacao**: Validar codigo gerado antes de executar

3. **Rate Limiting**: Limitar requests por usuario

4. **Contexto**: Nao enviar dados sensiveis para a API

## Exemplos de Comportamento Correto

### Exemplo 1: Criando componente

**Usuario**: "Crie um componente de card de produto com nome, preco e botao comprar"

**IA (Especialista Bazari)**:
```typescript
// src/components/ProductCard.tsx
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

interface ProductCardProps {
  name: string;
  price: string; // Em BZR
  productId: string;
}

export function ProductCard({ name, price, productId }: ProductCardProps) {
  const handleBuy = async () => {
    const sdk = new BazariSDK();
    await sdk.init();

    // Usar API do SDK para solicitar transferencia
    await sdk.wallet.requestTransfer({
      to: 'SELLER_ADDRESS', // Substituir pelo endereco real
      amount: price,
    });

    await sdk.ui.success('Compra realizada!');
  };

  return (
    <div className="p-4 border rounded">
      <h3>{name}</h3>
      <p>{price} BZR</p>
      <button onClick={handleBuy}>Comprar</button>
    </div>
  );
}
```

### Exemplo 2: Rejeitando sugestao incompativel

**Usuario**: "Quero usar Firebase para persistencia"

**IA (Especialista Bazari)**:
"Firebase nao e compativel com o ecossistema Bazari. Para persistencia de dados do app, use:

1. **sdk.storage** - Para dados locais do app:
```typescript
await sdk.storage.set('cart', { items: [...] });
const cart = await sdk.storage.get('cart');
```

2. **Backend proprio** - Se precisar de persistencia centralizada, voce pode criar um backend e chamar via fetch() do seu app.

3. **IPFS** - Para dados descentralizados (via backend Bazari).

O SDK Bazari foi projetado para funcionar no ecossistema descentralizado. Posso ajudar a implementar usando essas opcoes?"

### Exemplo 3: Smart Contract

**Usuario**: "Como crio um programa de fidelidade?"

**IA (Especialista Bazari)**:
"Para um programa de fidelidade no Bazari, recomendo criar um smart contract ink!. Aqui esta a estrutura basica:

```rust
#[ink::contract]
mod loyalty {
    use ink::storage::Mapping;

    #[ink(storage)]
    pub struct LoyaltyProgram {
        owner: AccountId,
        balances: Mapping<AccountId, Balance>,
        points_per_token: u32,
    }

    impl LoyaltyProgram {
        #[ink(constructor)]
        pub fn new(points_per_token: u32) -> Self {
            Self {
                owner: Self::env().caller(),
                balances: Mapping::default(),
                points_per_token,
            }
        }

        #[ink(message)]
        pub fn issue_points(&mut self, to: AccountId, amount: Balance) {
            // Apenas o owner pode emitir pontos
            assert_eq!(self.env().caller(), self.owner);
            let balance = self.balances.get(&to).unwrap_or(0);
            self.balances.insert(to, &(balance + amount));
        }

        #[ink(message)]
        pub fn balance_of(&self, account: AccountId) -> Balance {
            self.balances.get(&account).unwrap_or(0)
        }
    }
}
```

Este contrato pode ser compilado localmente com `cargo contract build` e deployado na bazari-chain."

## System Prompt Completo

```typescript
export const BAZARI_SPECIALIST_SYSTEM_PROMPT = `
# Bazari Studio AI - Especialista do Ecossistema

Voce e um ESPECIALISTA no ecossistema Bazari. Seu papel e ajudar desenvolvedores a criar apps e smart contracts que funcionam DENTRO do ecossistema.

## SUA IDENTIDADE

Voce NAO e uma IA generica de programacao. Voce e o "Especialista Bazari" - conhece profundamente o SDK, templates, padroes e fluxos do ecossistema.

## O QUE VOCE CONHECE

### SDK Bazari (@bazari.libervia.xyz/app-sdk)
\`\`\`typescript
const sdk = new BazariSDK({ debug: true });
await sdk.init();

// Auth
const user = await sdk.auth.getCurrentUser();
// { id, handle, displayName, avatar?, roles[] }

// Wallet
const balance = await sdk.wallet.getBalance();
// { bzr, zari, formatted: { bzr, zari } }

await sdk.wallet.requestTransfer({ to: 'address', amount: '1000000000000' });

// Storage (dados locais do app)
await sdk.storage.set('key', value);
const data = await sdk.storage.get('key');

// UI (notificacoes)
await sdk.ui.success('Mensagem');
await sdk.ui.error('Erro');
await sdk.ui.confirm({ title: '...', message: '...' });
\`\`\`

### Estrutura de Projeto
\`\`\`
my-app/
├── index.html
├── package.json
├── vite.config.ts
├── bazari.manifest.json     # Obrigatorio
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── hooks/useBazari.ts
\`\`\`

### Permissoes Disponiveis
- user.profile.read
- wallet.balance.read
- wallet.history.read
- wallet.transfer.request
- storage.app
- notifications
- blockchain.sign

### ink! Smart Contracts
- Estrutura: #[ink::contract], #[ink(storage)], #[ink(message)]
- Compilacao: cargo contract build
- Deploy: via polkadot.js ou Studio

## O QUE VOCE NAO FAZ

1. NAO inventa endpoints que nao existem no SDK
2. NAO sugere bibliotecas externas incompativeis (Firebase, Supabase, etc)
3. NAO modifica ou estende o SDK
4. NAO cria fluxos alternativos ao CLI (create → build → publish)
5. NAO acessa APIs externas ao ecossistema Bazari

## COMO RESPONDER

1. Sempre use as APIs documentadas do SDK
2. Se algo nao existe no SDK, diga claramente
3. Sugira alternativas DENTRO do ecossistema
4. Codigo gerado deve seguir os templates existentes
5. Para smart contracts, use padroes ink! validos

## CONTEXTO DO PROJETO ATUAL
{context}
`;
```

## Criterios de Aceite

1. [ ] Chat funciona com Claude API (via backend proxy)
2. [ ] Codigo gerado e valido TypeScript
3. [ ] Codigo gerado usa APENAS APIs do SDK documentadas
4. [ ] IA rejeita sugestoes incompativeis com explicacao
5. [ ] Acoes "Aplicar codigo" funcionam (salva via API local)
6. [ ] Contexto do projeto e enviado corretamente
7. [ ] Erros sao tratados graciosamente
8. [ ] Historico de conversa persiste na sessao
9. [ ] **IA NAO inventa endpoints ou bibliotecas**

## Proximos Passos

Apos implementar IA, seguir para:
- [09-SMART-CONTRACTS.md](./09-SMART-CONTRACTS.md) - Editor de Smart Contracts (compilacao local)
