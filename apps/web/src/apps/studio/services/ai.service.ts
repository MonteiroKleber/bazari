/**
 * AI Service for Bazari Studio
 * Handles communication with Claude API
 */

import type {
  AIMessage,
  AIContext,
  AIAction,
  CodeBlock,
  AIServiceConfig,
} from '../types/ai.types';
import { BAZARI_SYSTEM_PROMPT } from '../data/ai/system-prompt';

const DEFAULT_CONFIG: AIServiceConfig = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  useProxy: true,
  proxyUrl: '/api/ai/chat',
};

export class AIService {
  private conversationHistory: AIMessage[] = [];
  private config: AIServiceConfig;

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send a message to the AI and get a response
   */
  async chat(userMessage: string, context: AIContext): Promise<AIMessage> {
    const systemPrompt = this.buildSystemPrompt(context);

    // Add user message to history
    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    this.conversationHistory.push(userMsg);

    try {
      let responseText: string;

      if (this.config.useProxy && this.config.proxyUrl) {
        // Use backend proxy (recommended for production)
        responseText = await this.chatViaProxy(systemPrompt, userMessage);
      } else if (this.config.apiKey) {
        // Direct API call (development only)
        responseText = await this.chatDirect(systemPrompt, userMessage);
      } else {
        throw new Error('No API key or proxy configured');
      }

      const assistantMessage = this.processResponse(responseText);
      this.conversationHistory.push(assistantMessage);

      return assistantMessage;
    } catch (error) {
      // Remove user message from history on error
      this.conversationHistory.pop();
      throw error;
    }
  }

  /**
   * Chat via backend proxy (production)
   */
  private async chatViaProxy(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(this.config.proxyUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system: systemPrompt,
        messages: [
          ...this.conversationHistory.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: 'user', content: userMessage },
        ],
        model: this.config.model,
        maxTokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content || data.message || '';
  }

  /**
   * Direct API call (development only - DO NOT use in production)
   */
  private async chatDirect(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('API key required for direct calls');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: systemPrompt,
        messages: [
          ...this.conversationHistory.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  /**
   * Build system prompt with project context
   */
  private buildSystemPrompt(context: AIContext): string {
    let prompt = BAZARI_SYSTEM_PROMPT;

    prompt += `\n\n## Current Project Context\n`;
    prompt += `- Project Name: ${context.projectName}\n`;
    prompt += `- Project Type: ${context.projectType}\n`;
    prompt += `- Project Path: ${context.projectPath}\n`;

    if (context.manifest) {
      prompt += `- Manifest: ${JSON.stringify(context.manifest, null, 2)}\n`;
    }

    if (context.openFiles.length > 0) {
      prompt += `- Open Files: ${context.openFiles.join(', ')}\n`;
    }

    if (context.currentFile) {
      prompt += `\n## Current File\n`;
      prompt += `Path: ${context.currentFile.path}\n`;
      prompt += `\`\`\`\n${context.currentFile.content}\n\`\`\`\n`;
    }

    if (context.recentErrors && context.recentErrors.length > 0) {
      prompt += `\n## Recent Errors\n`;
      context.recentErrors.forEach((error) => {
        prompt += `- ${error}\n`;
      });
    }

    return prompt;
  }

  /**
   * Process AI response text into structured message
   */
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

  /**
   * Extract code blocks from response text
   */
  private extractCodeBlocks(text: string): CodeBlock[] {
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const code = match[2].trim();
      const language = match[1] || 'plaintext';

      // Try to extract filename from first line comment
      let filename: string | undefined;
      const firstLine = code.split('\n')[0];
      const filenameMatch = firstLine.match(/^\/\/\s*(.+\.(tsx?|jsx?|css|json|html))$/);
      if (filenameMatch) {
        filename = filenameMatch[1].trim();
      }

      blocks.push({
        language,
        code,
        filename,
      });
    }

    return blocks;
  }

  /**
   * Extract actionable items from response
   */
  private extractActions(text: string, codeBlocks: CodeBlock[]): AIAction[] {
    const actions: AIAction[] = [];

    // Offer to apply TypeScript/JavaScript code blocks
    codeBlocks.forEach((block, index) => {
      if (['typescript', 'tsx', 'javascript', 'jsx'].includes(block.language)) {
        actions.push({
          type: 'apply_code',
          payload: { code: block.code, index, path: block.filename },
          label: block.filename ? `Apply to ${block.filename}` : 'Apply Code',
        });
      }
    });

    // Check for file creation suggestions
    const createFileMatch = text.match(/create (?:a )?(?:new )?file[:\s]+[`"']?([^`"'\n]+)[`"']?/gi);
    if (createFileMatch) {
      createFileMatch.forEach((match) => {
        const pathMatch = match.match(/[`"']?([^`"'\s]+\.[a-z]+)[`"']?/i);
        if (pathMatch) {
          actions.push({
            type: 'create_file',
            payload: { path: pathMatch[1] },
            label: `Create ${pathMatch[1]}`,
          });
        }
      });
    }

    return actions;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Set API key (for development)
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.config.useProxy = false;
  }

  /**
   * Configure to use proxy
   */
  useProxy(proxyUrl: string = '/api/ai/chat'): void {
    this.config.proxyUrl = proxyUrl;
    this.config.useProxy = true;
  }
}

// Singleton instance
export const aiService = new AIService();

export default AIService;
