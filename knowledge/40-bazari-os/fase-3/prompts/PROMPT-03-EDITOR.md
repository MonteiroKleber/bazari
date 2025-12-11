# PROMPT 03 - Editor de Codigo (Monaco Editor + API Local)

## Contexto

O Bazari Studio precisa de um editor de codigo profissional. Vamos integrar o Monaco Editor (mesmo do VS Code) conectado ao CLI Server local.

## Pre-requisito

PROMPT-01 e PROMPT-02 devem estar implementados (estrutura base e CLI Server).

## Especificacao

Leia a especificacao completa em:
- `knowledge/40-bazari-os/fase-3/04-EDITOR.md`

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDIO UI (Browser)                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Monaco Editor                         ││
│  │  - Syntax highlighting                                   ││
│  │  - Autocomplete (TypeScript)                            ││
│  │  │                                                       ││
│  │  │ onChange (debounced)                                  ││
│  │  ▼                                                       ││
│  │  useFileEditor hook                                      ││
│  │  │                                                       ││
│  │  │ PUT /files                                            ││
│  └──┼───────────────────────────────────────────────────────┘│
└─────┼────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│              CLI SERVER (localhost:4444)                     │
│  - Recebe arquivo                                           │
│  - Salva no disco local                                     │
│  - Vite detecta mudanca (HMR)                               │
└─────────────────────────────────────────────────────────────┘
```

## Tarefa

### 1. Instalar Dependencias

```bash
cd apps/web
pnpm add @monaco-editor/react monaco-editor
```

### 2. Criar Arquivos

```
apps/web/src/apps/studio/
├── components/
│   └── editor/
│       ├── CodeEditor.tsx         // Wrapper do Monaco
│       ├── EditorTabs.tsx         // Sistema de abas
│       ├── EditorStatusBar.tsx    // Linha, coluna, linguagem
│       └── editorThemes.ts        // Temas customizados
├── stores/
│   └── editor.store.ts            // Estado do editor (Zustand)
├── hooks/
│   └── useFileEditor.ts           // Hook para salvar via API local
└── utils/
    └── languageDetection.ts       // Detectar linguagem por extensao
```

### 3. useFileEditor.ts - Hook para API Local

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { localServer } from '../services/localServer.client';
import { debounce } from 'lodash-es';

interface UseFileEditorOptions {
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export function useFileEditor(filePath: string, options: UseFileEditorOptions = {}) {
  const { autoSave = true, autoSaveDelay = 500 } = options;

  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Carregar arquivo
  const loadFile = useCallback(async () => {
    try {
      const result = await localServer.readFile(filePath);
      setContent(result.content);
      setOriginalContent(result.content);
      setIsDirty(false);
      setError(null);
    } catch (err) {
      setError(err as Error);
    }
  }, [filePath]);

  // Salvar arquivo
  const saveFile = useCallback(async () => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      await localServer.writeFile(filePath, content);
      setOriginalContent(content);
      setIsDirty(false);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsSaving(false);
    }
  }, [filePath, content, isDirty]);

  // AutoSave debounced
  const debouncedSave = useRef(
    debounce(() => saveFile(), autoSaveDelay)
  ).current;

  // Handle content change
  const handleChange = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(newContent !== originalContent);

    if (autoSave) {
      debouncedSave();
    }
  }, [originalContent, autoSave, debouncedSave]);

  // Carregar ao montar
  useEffect(() => {
    if (filePath) {
      loadFile();
    }
  }, [filePath, loadFile]);

  return {
    content,
    isDirty,
    isSaving,
    error,
    handleChange,
    saveFile,
    reloadFile: loadFile,
  };
}
```

### 4. useFileWatcher.ts - Detectar Mudancas Externas

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { localServer } from '../services/localServer.client';

interface UseFileWatcherOptions {
  onFileChange?: (path: string) => void;
  onFileAdd?: (path: string) => void;
  onFileDelete?: (path: string) => void;
}

export function useFileWatcher(watchPath: string, options: UseFileWatcherOptions) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!watchPath) return;

    const ws = localServer.watchFiles(watchPath);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'change':
          options.onFileChange?.(data.path);
          break;
        case 'add':
          options.onFileAdd?.(data.path);
          break;
        case 'unlink':
          options.onFileDelete?.(data.path);
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, [watchPath, options]);

  return wsRef.current;
}
```

### 5. CodeEditor.tsx

```typescript
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useFileEditor } from '../hooks/useFileEditor';
import { registerCustomThemes } from './editorThemes';
import { detectLanguage } from '../utils/languageDetection';

interface CodeEditorProps {
  filePath: string;
  onCursorChange?: (position: { line: number; column: number }) => void;
  theme?: 'bazari-dark' | 'bazari-light';
  readOnly?: boolean;
}

export function CodeEditor({
  filePath,
  onCursorChange,
  theme = 'bazari-dark',
  readOnly = false,
}: CodeEditorProps) {
  const {
    content,
    isDirty,
    isSaving,
    error,
    handleChange,
    saveFile,
  } = useFileEditor(filePath);

  const language = detectLanguage(filePath);

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Registrar temas customizados
    registerCustomThemes(monaco);

    // Configurar TypeScript
    configureTypeScript(monaco);

    // Atalho Ctrl+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Erro ao carregar arquivo: {error.message}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Indicador de salvando */}
      {isSaving && (
        <div className="absolute top-2 right-2 z-10 text-xs text-muted-foreground">
          Salvando...
        </div>
      )}

      <Editor
        height="100%"
        language={language}
        value={content}
        theme={theme}
        path={filePath}
        onChange={(value) => handleChange(value || '')}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          tabSize: 2,
          insertSpaces: true,
          automaticLayout: true,
          readOnly,
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
        }}
        loading={
          <div className="flex items-center justify-center h-full">
            Carregando editor...
          </div>
        }
      />
    </div>
  );
}

function configureTypeScript(monaco: typeof import('monaco-editor')) {
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    strict: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  });

  // Adicionar tipos do SDK Bazari
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    BAZARI_SDK_TYPES,
    'file:///node_modules/@bazari.libervia.xyz/app-sdk/index.d.ts'
  );
}

// Tipos do SDK (simplificado)
const BAZARI_SDK_TYPES = `
declare module '@bazari.libervia.xyz/app-sdk' {
  export class BazariSDK {
    constructor(options?: { debug?: boolean });
    init(): Promise<void>;

    auth: {
      getCurrentUser(): Promise<{
        id: string;
        handle: string;
        displayName: string;
        avatar?: string;
        roles: string[];
      }>;
    };

    wallet: {
      getBalance(): Promise<{
        bzr: string;
        zari: string;
        formatted: { bzr: string; zari: string };
      }>;
      requestTransfer(params: {
        to: string;
        amount: string;
        assetId?: string;
      }): Promise<void>;
    };

    storage: {
      get<T>(key: string): Promise<T | null>;
      set<T>(key: string, value: T): Promise<void>;
      remove(key: string): Promise<void>;
    };

    ui: {
      success(message: string): Promise<void>;
      error(message: string): Promise<void>;
      info(message: string): Promise<void>;
      confirm(params: { title: string; message: string }): Promise<boolean>;
    };
  }
}
`;
```

### 6. EditorTabs.tsx

```typescript
interface OpenFile {
  path: string;
  name: string;
  isDirty: boolean;
}

interface EditorTabsProps {
  files: OpenFile[];
  activeFilePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export function EditorTabs({ files, activeFilePath, onSelect, onClose }: EditorTabsProps) {
  return (
    <div className="flex border-b bg-muted/50 overflow-x-auto">
      {files.map((file) => (
        <div
          key={file.path}
          className={cn(
            'flex items-center gap-2 px-3 py-2 border-r cursor-pointer',
            activeFilePath === file.path
              ? 'bg-background'
              : 'bg-muted/30 hover:bg-muted'
          )}
          onClick={() => onSelect(file.path)}
        >
          <FileIcon filename={file.name} />
          <span className="text-sm">{file.name}</span>
          {file.isDirty && <span className="w-2 h-2 rounded-full bg-blue-500" />}
          <button
            className="hover:bg-muted rounded p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onClose(file.path);
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 7. EditorStatusBar.tsx

```typescript
interface EditorStatusBarProps {
  cursorPosition: { line: number; column: number } | null;
  language: string;
  isDirty: boolean;
}

export function EditorStatusBar({ cursorPosition, language, isDirty }: EditorStatusBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1 text-xs text-muted-foreground border-t bg-muted/30">
      <div className="flex items-center gap-4">
        {cursorPosition && (
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
        )}
        <span>{language}</span>
      </div>
      <div className="flex items-center gap-4">
        <span>UTF-8</span>
        <span>{isDirty ? 'Modified' : 'Saved'}</span>
      </div>
    </div>
  );
}
```

### 8. editor.store.ts

```typescript
import { create } from 'zustand';

interface OpenFileState {
  path: string;
  name: string;
  isDirty: boolean;
}

interface EditorState {
  openFiles: OpenFileState[];
  activeFilePath: string | null;
  cursorPosition: { line: number; column: number } | null;

  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  setFileDirty: (path: string, isDirty: boolean) => void;
  setCursorPosition: (position: { line: number; column: number } | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: [],
  activeFilePath: null,
  cursorPosition: null,

  openFile: (path) => {
    const { openFiles } = get();
    const exists = openFiles.some((f) => f.path === path);

    if (!exists) {
      const name = path.split('/').pop() || path;
      set({
        openFiles: [...openFiles, { path, name, isDirty: false }],
        activeFilePath: path,
      });
    } else {
      set({ activeFilePath: path });
    }
  },

  closeFile: (path) => {
    const { openFiles, activeFilePath } = get();
    const newFiles = openFiles.filter((f) => f.path !== path);

    let newActivePath = activeFilePath;
    if (activeFilePath === path) {
      const index = openFiles.findIndex((f) => f.path === path);
      newActivePath = newFiles[Math.min(index, newFiles.length - 1)]?.path || null;
    }

    set({ openFiles: newFiles, activeFilePath: newActivePath });
  },

  setActiveFile: (path) => set({ activeFilePath: path }),

  setFileDirty: (path, isDirty) => {
    const { openFiles } = get();
    set({
      openFiles: openFiles.map((f) =>
        f.path === path ? { ...f, isDirty } : f
      ),
    });
  },

  setCursorPosition: (position) => set({ cursorPosition: position }),
}));
```

### 9. languageDetection.ts

```typescript
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.json': 'json',
  '.md': 'markdown',
  '.rs': 'rust',
  '.toml': 'toml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
};

export function detectLanguage(filename: string): string {
  const ext = '.' + filename.split('.').pop();
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
}
```

### 10. editorThemes.ts

```typescript
import type { Monaco } from '@monaco-editor/react';

export function registerCustomThemes(monaco: Monaco) {
  monaco.editor.defineTheme('bazari-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0D0D0D',
      'editor.foreground': '#E4E4E7',
      'editorCursor.foreground': '#A855F7',
      'editor.lineHighlightBackground': '#1A1A1A',
      'editorLineNumber.foreground': '#52525B',
      'editor.selectionBackground': '#A855F740',
    },
  });

  monaco.editor.defineTheme('bazari-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#FAFAFA',
      'editor.foreground': '#18181B',
      'editorCursor.foreground': '#A855F7',
      'editor.lineHighlightBackground': '#F4F4F5',
      'editorLineNumber.foreground': '#A1A1AA',
      'editor.selectionBackground': '#A855F740',
    },
  });
}
```

## Criterios de Aceite

1. [ ] Monaco Editor renderiza corretamente
2. [ ] Syntax highlighting funciona para TS/JS/CSS/HTML/JSON/Rust
3. [ ] Sistema de abas permite multiplos arquivos
4. [ ] Arquivo salva automaticamente via API local (debounced)
5. [ ] Indicador de arquivo modificado funciona
6. [ ] Posicao do cursor aparece na status bar
7. [ ] Temas claro/escuro funcionam
8. [ ] Autocomplete basico funciona para TypeScript
9. [ ] Atalho Ctrl+S salva imediatamente
10. [ ] Build do projeto nao quebra

## Nao Fazer Nesta Fase

- Preview em tempo real (fase 4)
- AI code completion (fase 7)
- Smart contracts editor (fase 8)

## Notas

- Monaco e grande (~2MB), `@monaco-editor/react` faz lazy loading
- AutoSave usa debounce de 500ms para nao sobrecarregar API
- File watcher permite detectar mudancas externas (outro editor)
