import { AI_CONFIG } from '../config/env.js';

/**
 * Cliente para vLLM (Llama 3)
 * Formato OpenAI-compatible
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class VLLMClient {
  private baseUrl: string;
  private mockMode: boolean;

  constructor() {
    this.baseUrl = AI_CONFIG.endpoints.vllm;
    this.mockMode = AI_CONFIG.mockMode;
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // Tentar Groq API gratuita primeiro (se configurada)
    const groqApiKey = process.env.GROQ_API_KEY;

    if (groqApiKey) {
      try {
        console.log('[VLLMClient] Using Groq API (free)...');

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant', // Modelo grátis e rápido
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.max_tokens ?? 512,
          }),
        });

        if (response.ok) {
          const data = await response.json() as ChatCompletionResponse;
          console.log('[VLLMClient] ✅ Groq API success!');
          return data;
        }

        console.warn('[VLLMClient] Groq API failed:', response.status);
      } catch (error) {
        console.error('[VLLMClient] Groq API error:', error);
      }
    }

    // Tentar vLLM self-hosted se não for mock mode
    if (!this.mockMode) {
      try {
        console.log('[VLLMClient] Using vLLM self-hosted...');

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: request.model || AI_CONFIG.models.llm,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.max_tokens ?? 512,
            stream: false,
          }),
        });

        if (response.ok) {
          console.log('[VLLMClient] ✅ vLLM success!');
          return (await response.json()) as ChatCompletionResponse;
        }
      } catch (error) {
        console.error('[VLLMClient] vLLM error:', error);
      }
    }

    // Fallback para mock
    console.log('[VLLMClient] Using mock fallback...');
    return this.mockChatCompletion(request);
  }

  private mockChatCompletion(request: ChatCompletionRequest): ChatCompletionResponse {
    const userMessage = request.messages[request.messages.length - 1]?.content || '';

    // Mock inteligente: gera sugestões baseadas no contexto
    let mockResponse = '';

    // Detectar se é pedido de sugestões de resposta
    if (userMessage.toLowerCase().includes('sugira') && userMessage.toLowerCase().includes('respostas')) {
      // Extrair o histórico da conversa do prompt
      const historyMatch = userMessage.match(/Histórico da conversa:\n([\s\S]*?)\n\nSugira/);
      const conversationHistory = historyMatch ? historyMatch[1].split('\n').filter(l => l.trim()) : [];

      mockResponse = this.generateSmartSuggestions(conversationHistory);
    } else if (userMessage.toLowerCase().includes('translate')) {
      mockResponse = 'Translation mock: This is a translated message.';
    } else {
      mockResponse = 'Olá! Esta é uma resposta mock do assistente IA.';
    }

    return {
      id: `mock-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: AI_CONFIG.models.llm,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: mockResponse,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: userMessage.length / 4,
        completion_tokens: mockResponse.length / 4,
        total_tokens: (userMessage.length + mockResponse.length) / 4,
      },
    };
  }

  private generateSmartSuggestions(conversationHistory: string[]): string {
    // Analisar última mensagem para contexto
    const lastMessage = conversationHistory[conversationHistory.length - 1]?.toLowerCase() || '';

    const suggestions: string[] = [];

    // Sugestões baseadas em contexto
    if (lastMessage.includes('olá') || lastMessage.includes('oi') || lastMessage.includes('bom dia')) {
      suggestions.push('Oi! Como posso ajudar você hoje?');
      suggestions.push('Olá! Tudo bem? Em que posso ser útil?');
      suggestions.push('Oi! Seja bem-vindo(a)! Como vai?');
    } else if (lastMessage.includes('obrigad') || lastMessage.includes('valeu')) {
      suggestions.push('Por nada! Fico feliz em ajudar! 😊');
      suggestions.push('Disponha! Se precisar de mais algo, é só chamar.');
      suggestions.push('De nada! Foi um prazer ajudar você.');
    } else if (lastMessage.includes('?') || lastMessage.includes('como')) {
      suggestions.push('Ótima pergunta! Deixe-me verificar isso para você...');
      suggestions.push('Entendi sua dúvida. Vou te explicar melhor...');
      suggestions.push('Claro! Posso te ajudar com isso. Veja...');
    } else if (lastMessage.includes('não') || lastMessage.includes('problema')) {
      suggestions.push('Entendo. Vamos tentar outra abordagem?');
      suggestions.push('Sem problemas! Há algo mais que eu possa fazer?');
      suggestions.push('Tranquilo! Deixa eu ver como posso ajudar melhor.');
    } else if (lastMessage.includes('preço') || lastMessage.includes('quanto') || lastMessage.includes('valor')) {
      suggestions.push('O valor é bastante competitivo! Posso te passar os detalhes?');
      suggestions.push('Vou te enviar a tabela de preços completa!');
      suggestions.push('Temos ótimas condições de pagamento. Quer saber mais?');
    } else if (lastMessage.includes('produto') || lastMessage.includes('item') || lastMessage.includes('comprar')) {
      suggestions.push('Temos esse produto disponível! Te interessa conhecer mais?');
      suggestions.push('Excelente escolha! Posso te mostrar as opções disponíveis?');
      suggestions.push('Este produto é muito procurado! Quer que eu te envie fotos?');
    } else {
      // Sugestões genéricas amigáveis
      suggestions.push('Entendi! Como posso te ajudar com isso?');
      suggestions.push('Bacana! Me conta mais sobre o que você precisa...');
      suggestions.push('Certo! Vou verificar isso para você.');
    }

    // Retornar 3 sugestões formatadas
    return suggestions.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n');
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (this.mockMode) {
      return texts.map(() => Array(384).fill(0).map(() => Math.random() * 2 - 1));
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_CONFIG.models.embed,
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embed error: ${response.status}`);
      }

      const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
      return data.data.map((item) => item.embedding);
    } catch (error) {
      console.error('Embed error, using mock:', error);
      return texts.map(() => Array(384).fill(0).map(() => Math.random() * 2 - 1));
    }
  }
}

export const vllmClient = new VLLMClient();
