# PROMPT 07 - Integracao com IA (Claude API)

## Contexto

O Bazari Studio precisa de um assistente de IA para ajudar desenvolvedores a criar codigo.

**CRITICO**: A IA e apenas uma camada de automacao. Ela usa o fluxo CLI existente - nao inventa nada novo.

## Pre-requisito

PROMPT-01 a PROMPT-06 devem estar implementados.

## Especificacao

Leia a especificacao completa em:
- `knowledge/40-bazari-os/fase-3/08-AI-INTEGRATION.md`

## Tarefa

### 1. Criar Arquivos

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
│       └── system-prompt.ts    // System prompt com contexto
└── types/
    └── ai.types.ts             // Tipos
```

### 2. ai.types.ts

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
  projectType: string;
  openFiles: string[];
  currentFile?: { path: string; content: string };
  manifest: AppManifest;
  recentErrors?: string[];
}
```

### 3. ai.service.ts

```typescript
class AIService {
  private conversationHistory: AIMessage[] = [];

  async chat(userMessage: string, context: AIContext): Promise<AIMessage> {
    const systemPrompt = this.buildSystemPrompt(context);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...this.conversationHistory.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ],
      }),
    });

    const data = await response.json();
    return this.processResponse(data.content[0].text);
  }

  private buildSystemPrompt(context: AIContext): string {
    return `${BAZARI_SYSTEM_PROMPT}

## Contexto do Projeto Atual
- Nome: ${context.projectName}
- Manifest: ${JSON.stringify(context.manifest)}
${context.currentFile ? `
## Arquivo Atual
Path: ${context.currentFile.path}
\`\`\`
${context.currentFile.content}
\`\`\`
` : ''}

## Regras CRITICAS
1. Use APENAS as APIs do @bazari.libervia.xyz/app-sdk documentadas
2. Siga os padroes do template existente
3. NUNCA invente novos endpoints ou comandos
`;
  }

  private processResponse(text: string): AIMessage {
    const codeBlocks = this.extractCodeBlocks(text);
    const actions = this.extractActions(text, codeBlocks);

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: text,
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
      blocks.push({ language: match[1] || 'plaintext', code: match[2].trim() });
    }
    return blocks;
  }

  private extractActions(text: string, codeBlocks: CodeBlock[]): AIAction[] {
    const actions: AIAction[] = [];

    // Oferecer aplicar codigo TypeScript
    codeBlocks.forEach((block, index) => {
      if (['typescript', 'tsx', 'javascript', 'jsx'].includes(block.language)) {
        actions.push({
          type: 'apply_code',
          payload: { code: block.code, index },
          label: 'Aplicar codigo',
        });
      }
    });

    return actions;
  }
}
```

### 4. system-prompt.ts

```typescript
export const BAZARI_SYSTEM_PROMPT = `
# Bazari Studio AI Assistant

Voce e um assistente de desenvolvimento para a plataforma Bazari.

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

await sdk.wallet.requestTransfer({ to: 'address', amount: '1000000000000' });

// Storage
await sdk.storage.set('key', { data: 'value' });
const data = await sdk.storage.get('key');

// UI
await sdk.ui.success('Mensagem');
await sdk.ui.error('Erro');
const confirmed = await sdk.ui.confirm({ title: 'Confirmar?', message: '...' });
\`\`\`

## Estrutura de Projeto

\`\`\`
my-app/
├── index.html
├── package.json
├── vite.config.ts
├── bazari.manifest.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── hooks/useBazari.ts
\`\`\`

## Instrucoes

1. Forneca codigo completo e funcional
2. Use TypeScript com tipos corretos
3. Siga os padroes do template
4. Use apenas as APIs documentadas acima
5. NUNCA sugira modificar o SDK
`;
```

### 5. AIAssistant.tsx

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

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    // Adicionar mensagem do usuario
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
      // Mostrar erro
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: AIAction) => {
    switch (action.type) {
      case 'apply_code':
        onApplyCode(context.currentFile?.path || 'src/App.tsx', action.payload.code);
        break;
      case 'run_command':
        onRunCommand(action.payload.command);
        break;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <Bot className="w-5 h-5" />
        <span>AI Assistant</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <AIMessage key={msg.id} message={msg} onAction={handleAction} />
        ))}
        {isLoading && <div>Pensando...</div>}
      </div>

      {/* Input */}
      <AIPromptInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  );
}
```

### 6. AIMessage.tsx

```typescript
// Renderiza mensagem com:
// - Avatar (usuario ou bot)
// - Conteudo em Markdown
// - Blocos de codigo com syntax highlighting
// - Botoes de acao (Aplicar codigo, Executar comando)
```

### 7. AICodeBlock.tsx

```typescript
// Bloco de codigo com:
// - Syntax highlighting
// - Botao copiar
// - Botao aplicar
```

### 8. AIPromptInput.tsx

```typescript
// Input com:
// - Textarea autoexpandivel
// - Botao enviar
// - Sugestoes de prompts
```

### 9. Integrar na Sidebar

A tab "AI" da sidebar deve mostrar o AIAssistant.

### 10. Configuracao de API Key

A API key deve vir de:
1. Variavel de ambiente (desenvolvimento)
2. Backend proxy (producao) - para nao expor a key

Considerar criar endpoint no backend:
```
POST /api/ai/chat
Body: { messages, context }
```

## Criterios de Aceite

1. [ ] Chat funciona com Claude API
2. [ ] Contexto do projeto e enviado corretamente
3. [ ] Codigo gerado e valido TypeScript
4. [ ] Botao "Aplicar codigo" funciona
5. [ ] Historico de conversa persiste na sessao
6. [ ] Loading state funciona
7. [ ] Erros sao tratados graciosamente
8. [ ] Build do projeto nao quebra

## Seguranca

1. Nunca expor API key no cliente em producao
2. Usar backend proxy para chamadas
3. Validar codigo antes de aplicar
4. Rate limiting

## Exemplos de Uso

Usuario: "Crie um componente de card de produto"
IA: Gera codigo + botao "Aplicar"

Usuario: "O que faz esse hook?"
IA: Explica o codigo

Usuario: "Estou recebendo erro X"
IA: Explica e sugere solucao
