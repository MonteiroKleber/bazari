/**
 * AIAssistant - Main AI chat panel for Bazari Studio
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Trash2, Settings, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIMessage } from './AIMessage';
import { AIPromptInput } from './AIPromptInput';
import { AIService } from '../../services/ai.service';
import type { AIMessage as AIMessageType, AIContext, AIAction } from '../../types/ai.types';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  context: AIContext;
  onApplyCode: (path: string, code: string) => void;
  onRunCommand?: (command: string) => void;
  className?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  context,
  onApplyCode,
  onRunCommand,
  className,
}) => {
  const [messages, setMessages] = useState<AIMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const aiServiceRef = useRef(new AIService());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: AIMessageType = {
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hello! I'm your AI assistant for **${context.projectName}**.

I can help you with:
- Creating React components
- Using the Bazari SDK
- Fixing bugs and errors
- Explaining code
- Adding features

What would you like to do?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    setError(null);

    // Add user message
    const userMessage: AIMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiServiceRef.current.chat(input, context);
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);

      // Add error message to chat
      const errorMsg: AIMessageType = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ **Error**: ${errorMessage}\n\nPlease check your API configuration or try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: AIAction) => {
    switch (action.type) {
      case 'apply_code':
        if (action.payload.code) {
          const path = action.payload.path || context.currentFile?.path || 'src/App.tsx';
          onApplyCode(path, action.payload.code);
        }
        break;
      case 'run_command':
        if (action.payload.command && onRunCommand) {
          onRunCommand(action.payload.command);
        }
        break;
      case 'create_file':
        if (action.payload.path) {
          onApplyCode(action.payload.path, '');
        }
        break;
    }
  };

  const handleApplyCode = (code: string, filename?: string) => {
    const path = filename || context.currentFile?.path || 'src/App.tsx';
    onApplyCode(path, code);
  };

  const handleClearChat = () => {
    aiServiceRef.current.clearHistory();
    setMessages([]);
    setError(null);
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      aiServiceRef.current.setApiKey(apiKey.trim());
      setShowSettings(false);
      setError(null);
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Assistant</h3>
            <span className="text-xs text-muted-foreground">
              {context.projectName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleClearChat}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="p-4 border-b border-border bg-muted/30">
          <h4 className="text-sm font-medium mb-2">API Configuration</h4>
          <p className="text-xs text-muted-foreground mb-3">
            For development: Enter your Anthropic API key.
            In production, use the backend proxy.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className={cn(
                'flex-1 px-3 py-2 text-sm rounded-md border border-border',
                'bg-background focus:outline-none focus:ring-2 focus:ring-primary/20'
              )}
            />
            <Button onClick={handleSaveApiKey} size="sm">
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && !showSettings && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
            <button
              onClick={() => setShowSettings(true)}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Configure API
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => (
          <AIMessage
            key={message.id}
            message={message}
            onAction={handleAction}
            onApplyCode={handleApplyCode}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Thinking</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
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
};

export default AIAssistant;
