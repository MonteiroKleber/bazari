/**
 * AI Types for Bazari Studio
 */

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeBlocks?: CodeBlock[];
  actions?: AIAction[];
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export type AIActionType = 'create_file' | 'edit_file' | 'run_command' | 'apply_code';

export interface AIAction {
  type: AIActionType;
  payload: {
    code?: string;
    index?: number;
    command?: string;
    path?: string;
  };
  label: string;
}

export interface AIContext {
  projectName: string;
  projectType: string;
  projectPath: string;
  openFiles: string[];
  currentFile?: {
    path: string;
    content: string;
  };
  manifest?: AppManifest;
  recentErrors?: string[];
}

export interface AppManifest {
  appId?: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  category: string;
  permissions?: string[];
  sdkVersion?: string;
}

export interface AIServiceConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  useProxy?: boolean;
  proxyUrl?: string;
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
  context: AIContext;
}

export interface ChatResponse {
  success: boolean;
  message?: AIMessage;
  error?: string;
}

export interface AIState {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  context: AIContext | null;
}
