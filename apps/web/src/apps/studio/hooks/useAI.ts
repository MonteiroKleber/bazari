/**
 * useAI Hook - AI integration for Bazari Studio
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { AIService } from '../services/ai.service';
import type {
  AIMessage,
  AIContext,
  AIAction,
  AIState,
  AppManifest,
} from '../types/ai.types';

interface UseAIOptions {
  apiKey?: string;
  useProxy?: boolean;
  proxyUrl?: string;
}

interface UseAIReturn {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => void;
  executeAction: (action: AIAction) => void;
  setApiKey: (key: string) => void;
  updateContext: (context: Partial<AIContext>) => void;
}

/**
 * Build AI context from project state
 */
export function buildAIContext(
  projectName: string,
  projectPath: string,
  projectType: string = 'app',
  openFiles: string[] = [],
  currentFile?: { path: string; content: string },
  manifest?: AppManifest,
  recentErrors?: string[]
): AIContext {
  return {
    projectName,
    projectPath,
    projectType,
    openFiles,
    currentFile,
    manifest,
    recentErrors,
  };
}

/**
 * useAI - Hook for AI assistant functionality
 */
export function useAI(
  initialContext: AIContext,
  options: UseAIOptions = {}
): UseAIReturn {
  const [state, setState] = useState<AIState>({
    messages: [],
    isLoading: false,
    error: null,
    context: initialContext,
  });

  const aiServiceRef = useRef<AIService>(
    new AIService({
      apiKey: options.apiKey,
      useProxy: options.useProxy ?? true,
      proxyUrl: options.proxyUrl,
    })
  );

  const contextRef = useRef<AIContext>(initialContext);

  /**
   * Send message to AI
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const response = await aiServiceRef.current.chat(message, contextRef.current);

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, response],
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    aiServiceRef.current.clearHistory();
    setState((prev) => ({
      ...prev,
      messages: [],
      error: null,
    }));
  }, []);

  /**
   * Execute an action from AI response
   */
  const executeAction = useCallback((_action: AIAction) => {
    // Placeholder - actual execution is handled by the component
  }, []);

  /**
   * Set API key for direct calls
   */
  const setApiKey = useCallback((key: string) => {
    aiServiceRef.current.setApiKey(key);
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Update context
   */
  const updateContext = useCallback((newContext: Partial<AIContext>) => {
    contextRef.current = { ...contextRef.current, ...newContext };
    setState((prev) => ({
      ...prev,
      context: contextRef.current,
    }));
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    clearHistory,
    executeAction,
    setApiKey,
    updateContext,
  };
}

/**
 * useAIContext - Build context from studio state
 */
export function useAIContext(
  project: {
    name: string;
    path: string;
    type?: string;
  } | null,
  openFiles: string[] = [],
  currentFile?: { path: string; content: string },
  manifest?: AppManifest,
  recentErrors?: string[]
): AIContext | null {
  return useMemo(() => {
    if (!project) return null;

    return buildAIContext(
      project.name,
      project.path,
      project.type || 'app',
      openFiles,
      currentFile,
      manifest,
      recentErrors
    );
  }, [project, openFiles, currentFile, manifest, recentErrors]);
}

export default useAI;
