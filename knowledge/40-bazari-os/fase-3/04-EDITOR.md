# 04 - Editor de Codigo (Monaco Editor)

## Objetivo

Integrar o Monaco Editor (mesmo editor usado no VS Code) para:
- Editar arquivos com syntax highlighting
- Suporte a TypeScript/JavaScript/CSS/HTML/Rust
- Autocomplete e IntelliSense
- Sistema de abas para multiplos arquivos
- Salvamento via API local (CLI Server)

## Pre-requisito

- PROMPT-01 (Estrutura Base)
- PROMPT-02 (CLI Server) - Editor conecta via API local

## Instalacao

```bash
pnpm add @monaco-editor/react monaco-editor
```

## Arquivos a Criar

```
apps/web/src/apps/studio/
├── components/
│   └── editor/
│       ├── CodeEditor.tsx         // Wrapper do Monaco
│       ├── EditorTabs.tsx         // Sistema de abas
│       ├── EditorStatusBar.tsx    // Barra de status do editor
│       └── editorThemes.ts        // Temas customizados
├── stores/
│   └── editor.store.ts            // Estado do editor
└── utils/
    └── languageDetection.ts       // Detectar linguagem por extensao
```

## Especificacao dos Componentes

### 1. CodeEditor.tsx

```typescript
import Editor, { Monaco } from '@monaco-editor/react';
import { useCallback, useRef } from 'react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  /** Conteudo do arquivo */
  value: string;
  /** Linguagem (typescript, javascript, css, html, json) */
  language: string;
  /** Path do arquivo (para tab title) */
  path: string;
  /** Callback quando conteudo muda */
  onChange: (value: string) => void;
  /** Callback quando cursor move */
  onCursorChange?: (position: CursorPosition) => void;
  /** Tema (bazari-dark, bazari-light) */
  theme?: string;
  /** Somente leitura */
  readOnly?: boolean;
}

interface CursorPosition {
  line: number;
  column: number;
}

export function CodeEditor({
  value,
  language,
  path,
  onChange,
  onCursorChange,
  theme = 'bazari-dark',
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;

      // Registrar temas customizados
      registerCustomThemes(monaco);

      // Configurar TypeScript
      configureTypeScript(monaco);

      // Listener de cursor
      if (onCursorChange) {
        editor.onDidChangeCursorPosition((e) => {
          onCursorChange({
            line: e.position.lineNumber,
            column: e.position.column,
          });
        });
      }

      // Foco automatico
      editor.focus();
    },
    [onCursorChange]
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      onChange(value || '');
    },
    [onChange]
  );

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      theme={theme}
      path={path}
      onChange={handleChange}
      onMount={handleEditorDidMount}
      options={{
        readOnly,
        minimap: { enabled: true },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        bracketPairColorization: { enabled: true },
        formatOnPaste: true,
        formatOnType: true,
      }}
      loading={<EditorLoading />}
    />
  );
}

function EditorLoading() {
  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-muted-foreground">Carregando editor...</div>
    </div>
  );
}
```

### 2. EditorTabs.tsx

```typescript
interface EditorTabsProps {
  /** Lista de arquivos abertos */
  files: OpenFile[];
  /** ID do arquivo ativo */
  activeFileId: string | null;
  /** Callback ao selecionar aba */
  onSelect: (path: string) => void;
  /** Callback ao fechar aba */
  onClose: (path: string) => void;
}

interface OpenFile {
  path: string;
  name: string;
  isDirty: boolean;  // Modificado mas nao salvo
  language: string;
}

export function EditorTabs({
  files,
  activeFileId,
  onSelect,
  onClose,
}: EditorTabsProps) {
  return (
    <div className="flex items-center h-9 bg-muted/30 border-b overflow-x-auto">
      {files.map((file) => (
        <Tab
          key={file.path}
          file={file}
          isActive={file.path === activeFileId}
          onSelect={() => onSelect(file.path)}
          onClose={() => onClose(file.path)}
        />
      ))}
    </div>
  );
}

function Tab({
  file,
  isActive,
  onSelect,
  onClose,
}: {
  file: OpenFile;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const Icon = getFileIcon(file.language);

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 border-r cursor-pointer group',
        isActive ? 'bg-background' : 'hover:bg-muted/50'
      )}
      onClick={onSelect}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm truncate max-w-32">
        {file.name}
      </span>
      {file.isDirty && (
        <span className="w-2 h-2 rounded-full bg-blue-500" />
      )}
      <button
        className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
```

### 3. EditorStatusBar.tsx

```typescript
interface EditorStatusBarProps {
  cursor?: CursorPosition;
  language?: string;
  encoding?: string;
  isDirty?: boolean;
}

export function EditorStatusBar({
  cursor,
  language,
  encoding = 'UTF-8',
  isDirty,
}: EditorStatusBarProps) {
  return (
    <div className="flex items-center justify-between h-6 px-3 bg-muted/30 border-t text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        {isDirty && <span className="text-blue-500">Modificado</span>}
      </div>

      <div className="flex items-center gap-4">
        {cursor && (
          <span>Ln {cursor.line}, Col {cursor.column}</span>
        )}
        {language && (
          <span className="capitalize">{language}</span>
        )}
        <span>{encoding}</span>
      </div>
    </div>
  );
}
```

### 4. editorThemes.ts

```typescript
import type { Monaco } from '@monaco-editor/react';

export function registerCustomThemes(monaco: Monaco) {
  // Tema escuro customizado para Bazari
  monaco.editor.defineTheme('bazari-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
    ],
    colors: {
      'editor.background': '#0D0D0D',
      'editor.foreground': '#D4D4D4',
      'editor.lineHighlightBackground': '#1A1A1A',
      'editor.selectionBackground': '#264F78',
      'editorCursor.foreground': '#A855F7',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
    },
  });

  // Tema claro
  monaco.editor.defineTheme('bazari-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#FFFFFF',
      'editorCursor.foreground': '#7C3AED',
    },
  });
}
```

### 5. editor.store.ts

```typescript
import { create } from 'zustand';

interface EditorState {
  // Arquivos abertos
  openFiles: Map<string, OpenFileState>;

  // Arquivo ativo
  activeFilePath: string | null;

  // Cursor
  cursorPosition: CursorPosition | null;

  // Actions
  openFile: (path: string, content: string, language: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileSaved: (path: string) => void;
  setCursorPosition: (position: CursorPosition) => void;
}

interface OpenFileState {
  path: string;
  name: string;
  content: string;
  originalContent: string;  // Para detectar mudancas
  language: string;
  isDirty: boolean;
}

interface CursorPosition {
  line: number;
  column: number;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: new Map(),
  activeFilePath: null,
  cursorPosition: null,

  openFile: (path, content, language) => {
    const name = path.split('/').pop() || path;

    set((state) => {
      const newFiles = new Map(state.openFiles);
      if (!newFiles.has(path)) {
        newFiles.set(path, {
          path,
          name,
          content,
          originalContent: content,
          language,
          isDirty: false,
        });
      }
      return {
        openFiles: newFiles,
        activeFilePath: path,
      };
    });
  },

  closeFile: (path) => {
    set((state) => {
      const newFiles = new Map(state.openFiles);
      newFiles.delete(path);

      // Se fechou o arquivo ativo, ativar outro
      let newActive = state.activeFilePath;
      if (state.activeFilePath === path) {
        const paths = Array.from(newFiles.keys());
        newActive = paths[0] || null;
      }

      return {
        openFiles: newFiles,
        activeFilePath: newActive,
      };
    });
  },

  setActiveFile: (path) => {
    set({ activeFilePath: path });
  },

  updateFileContent: (path, content) => {
    set((state) => {
      const newFiles = new Map(state.openFiles);
      const file = newFiles.get(path);
      if (file) {
        newFiles.set(path, {
          ...file,
          content,
          isDirty: content !== file.originalContent,
        });
      }
      return { openFiles: newFiles };
    });
  },

  markFileSaved: (path) => {
    set((state) => {
      const newFiles = new Map(state.openFiles);
      const file = newFiles.get(path);
      if (file) {
        newFiles.set(path, {
          ...file,
          originalContent: file.content,
          isDirty: false,
        });
      }
      return { openFiles: newFiles };
    });
  },

  setCursorPosition: (position) => {
    set({ cursorPosition: position });
  },
}));
```

### 6. languageDetection.ts

```typescript
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Web
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',

  // Data
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',

  // Rust (para smart contracts)
  '.rs': 'rust',

  // Outros
  '.md': 'markdown',
  '.txt': 'plaintext',
  '.sh': 'shell',
  '.bash': 'shell',
};

export function detectLanguage(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf('.'));
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
}

export function getFileIcon(language: string): React.ComponentType {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return FileCode;
    case 'html':
      return FileCode2;
    case 'css':
    case 'scss':
      return Palette;
    case 'json':
      return Braces;
    case 'rust':
      return Cog;
    default:
      return File;
  }
}
```

## Configuracao TypeScript no Monaco

```typescript
function configureTypeScript(monaco: Monaco) {
  // Configurar compilador TypeScript
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
  });

  // Adicionar tipos do Bazari SDK
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    BAZARI_SDK_TYPES,
    'file:///node_modules/@bazari.libervia.xyz/app-sdk/index.d.ts'
  );

  // Adicionar tipos do React
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    REACT_TYPES,
    'file:///node_modules/@types/react/index.d.ts'
  );
}

// Tipos do SDK (simplificado)
const BAZARI_SDK_TYPES = `
declare module '@bazari.libervia.xyz/app-sdk' {
  export interface SDKUser {
    id: string;
    handle: string;
    displayName: string;
    avatar?: string;
    roles: string[];
  }

  export interface SDKBalance {
    bzr: string;
    zari: string;
    formatted: {
      bzr: string;
      zari: string;
    };
  }

  export class BazariSDK {
    constructor(options?: { debug?: boolean });
    init(): Promise<void>;
    isInBazari(): boolean;

    auth: {
      getCurrentUser(): Promise<SDKUser | null>;
    };

    wallet: {
      getBalance(): Promise<SDKBalance>;
    };

    ui: {
      success(message: string): Promise<void>;
      error(message: string): Promise<void>;
      info(message: string): Promise<void>;
    };
  }

  export type { SDKUser, SDKBalance };
}
`;
```

## Atalhos de Teclado

| Atalho | Acao |
|--------|------|
| Ctrl+S | Salvar arquivo |
| Ctrl+W | Fechar aba |
| Ctrl+Tab | Proxima aba |
| Ctrl+Shift+Tab | Aba anterior |
| Ctrl+P | Quick open (buscar arquivo) |
| Ctrl+Shift+P | Command palette |
| Ctrl+/ | Toggle comentario |
| Ctrl+D | Selecionar proxima ocorrencia |
| F2 | Renomear simbolo |

## Integracao com API Local

O editor deve ler e salvar arquivos via CLI Server:

```typescript
// hooks/useFileEditor.ts

import { useCallback, useEffect } from 'react';
import { useEditorStore } from '../stores/editor.store';
import { localServer } from '../services/local-server.client';
import { detectLanguage } from '../utils/languageDetection';
import { useDebouncedCallback } from 'use-debounce';

export function useFileEditor(projectId: string) {
  const {
    openFile,
    updateFileContent,
    markFileSaved,
    activeFilePath,
    openFiles,
  } = useEditorStore();

  // Abrir arquivo do servidor local
  const handleOpenFile = useCallback(async (path: string) => {
    const { content } = await localServer.get<{ content: string }>(
      `/api/projects/${projectId}/files/${encodeURIComponent(path)}`
    );

    const language = detectLanguage(path);
    openFile(path, content, language);
  }, [projectId, openFile]);

  // Salvar arquivo no servidor local (com debounce)
  const saveFile = useDebouncedCallback(async (path: string, content: string) => {
    await localServer.put(
      `/api/projects/${projectId}/files/${encodeURIComponent(path)}`,
      { content }
    );
    markFileSaved(path);
  }, 500);

  // Ao mudar conteudo, salvar automaticamente
  const handleContentChange = useCallback((path: string, content: string) => {
    updateFileContent(path, content);
    saveFile(path, content);
  }, [updateFileContent, saveFile]);

  // Salvar imediatamente (Ctrl+S)
  const handleSaveNow = useCallback(async () => {
    if (!activeFilePath) return;

    const file = openFiles.get(activeFilePath);
    if (!file?.isDirty) return;

    saveFile.flush();
    await localServer.put(
      `/api/projects/${projectId}/files/${encodeURIComponent(activeFilePath)}`,
      { content: file.content }
    );
    markFileSaved(activeFilePath);
  }, [activeFilePath, openFiles, projectId, markFileSaved, saveFile]);

  return {
    openFile: handleOpenFile,
    updateContent: handleContentChange,
    saveNow: handleSaveNow,
  };
}
```

## File Watcher Integration

O editor deve reagir a mudancas externas nos arquivos:

```typescript
// hooks/useFileWatcher.ts

import { useEffect } from 'react';
import { localServer } from '../services/local-server.client';
import { useEditorStore } from '../stores/editor.store';

export function useFileWatcher(projectId: string) {
  const { openFiles, updateFileContent } = useEditorStore();

  useEffect(() => {
    const ws = localServer.connectWatcher();

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'watch', projectId }));
    };

    ws.onmessage = async (event) => {
      const { type, path } = JSON.parse(event.data);

      if (type === 'change' && openFiles.has(path)) {
        // Arquivo aberto foi modificado externamente
        // Recarregar conteudo
        const { content } = await localServer.get<{ content: string }>(
          `/api/projects/${projectId}/files/${encodeURIComponent(path)}`
        );
        updateFileContent(path, content);
      }
    };

    return () => {
      ws.send(JSON.stringify({ type: 'unwatch' }));
      ws.close();
    };
  }, [projectId, openFiles, updateFileContent]);
}
```

## Criterios de Aceite

1. [ ] Monaco Editor renderiza corretamente
2. [ ] Syntax highlighting funciona para TS/JS/CSS/HTML/Rust
3. [ ] Sistema de abas permite multiplos arquivos
4. [ ] Indicador de arquivo modificado (dirty) funciona
5. [ ] Autocomplete basico funciona
6. [ ] Posicao do cursor aparece na status bar
7. [ ] Temas claro/escuro funcionam
8. [ ] Atalhos de teclado funcionam
9. [ ] **Salvar arquivo via API local funciona**
10. [ ] **Carregar arquivo via API local funciona**
11. [ ] **Auto-save com debounce funciona**

## Proximos Passos

Apos implementar o editor, seguir para:
- [05-PREVIEW.md](./05-PREVIEW.md) - Preview em tempo real (Vite local)
