import { useState, useCallback } from 'react';
import {
  FolderTree,
  Search,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileCode,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { SidebarTab, Project } from '../../types/studio.types';
import type { AIContext } from '../../types/ai.types';
import { AIAssistant } from '../ai';
import { buildAIContext } from '../../hooks/useAI';
import { FileExplorer } from '../files';
import { localServer } from '../../services/localServer.client';
import { useEditorStore } from '../../stores/editor.store';

interface SidebarProps {
  width: number;
  collapsed: boolean;
  onToggle: () => void;
  onWidthChange?: (width: number) => void;
  project?: Project | null;
  currentFile?: { path: string; content: string };
  onApplyCode?: (path: string, code: string) => void;
  onFileSelect?: (filePath: string) => void;
  selectedFile?: string;
}

const TABS: { id: SidebarTab; icon: React.ElementType; label: string }[] = [
  { id: 'files', icon: FolderTree, label: 'Arquivos' },
  { id: 'search', icon: Search, label: 'Buscar' },
  { id: 'ai', icon: Bot, label: 'IA' },
  { id: 'settings', icon: Settings, label: 'Configuracoes' },
];

export function Sidebar({
  width,
  collapsed,
  onToggle,
  project,
  currentFile,
  onApplyCode,
  onFileSelect,
  selectedFile,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files');

  // Build AI context from project
  const aiContext: AIContext | null = project
    ? buildAIContext(
        project.name,
        project.path,
        project.type,
        [],
        currentFile,
        {
          name: project.name,
          slug: project.id,
          version: project.version,
          description: project.description,
          category: project.category,
        }
      )
    : null;

  return (
    <div
      className={cn(
        'flex h-full bg-muted/30 border-r border-border transition-all duration-200',
        collapsed ? 'w-12' : ''
      )}
      style={{ width: collapsed ? undefined : width }}
    >
      {/* Tab icons */}
      <div className="flex flex-col items-center py-2 w-12 border-r border-border bg-muted/50">
        {TABS.map(({ id, icon: Icon, label }) => (
          <Button
            key={id}
            variant="ghost"
            size="icon"
            className={cn(
              'w-10 h-10 mb-1',
              activeTab === id && !collapsed && 'bg-accent'
            )}
            onClick={() => {
              if (collapsed) {
                onToggle();
              }
              setActiveTab(id);
            }}
            title={label}
          >
            <Icon className="h-5 w-5" />
          </Button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10"
          onClick={onToggle}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Tab content */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          <SidebarContent
            tab={activeTab}
            aiContext={aiContext}
            onApplyCode={onApplyCode}
            projectPath={project?.path}
            onFileSelect={onFileSelect}
            selectedFile={selectedFile}
          />
        </div>
      )}
    </div>
  );
}

interface SidebarContentProps {
  tab: SidebarTab;
  aiContext: AIContext | null;
  onApplyCode?: (path: string, code: string) => void;
  projectPath?: string;
  onFileSelect?: (filePath: string) => void;
  selectedFile?: string;
}

function SidebarContent({
  tab,
  aiContext,
  onApplyCode,
  projectPath,
  onFileSelect,
  selectedFile,
}: SidebarContentProps) {
  switch (tab) {
    case 'files':
      return (
        <FilesTab
          projectPath={projectPath}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
        />
      );
    case 'search':
      return <SearchTab projectPath={projectPath} onFileSelect={onFileSelect} />;
    case 'ai':
      return <AITab aiContext={aiContext} onApplyCode={onApplyCode} />;
    case 'settings':
      return <SettingsTab />;
    default:
      return null;
  }
}

interface FilesTabProps {
  projectPath?: string;
  onFileSelect?: (filePath: string) => void;
  selectedFile?: string;
}

function FilesTab({ projectPath, onFileSelect, selectedFile }: FilesTabProps) {
  if (!projectPath || !onFileSelect) {
    return (
      <div className="p-3">
        <h3 className="text-sm font-medium mb-2">Arquivos</h3>
        <p className="text-xs text-muted-foreground">
          Abra um projeto para ver os arquivos.
        </p>
      </div>
    );
  }

  return (
    <FileExplorer
      projectPath={projectPath}
      onFileSelect={onFileSelect}
      selectedFile={selectedFile}
    />
  );
}

interface SearchResult {
  path: string;
  line: number;
  content: string;
  match: string;
}

interface SearchTabProps {
  projectPath?: string;
  onFileSelect?: (filePath: string) => void;
}

function SearchTab({ projectPath, onFileSelect }: SearchTabProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !projectPath) return;

    setLoading(true);
    setSearched(true);

    try {
      // Search through files using listDirectory recursively
      const allResults: SearchResult[] = [];

      const searchDirectory = async (dirPath: string) => {
        try {
          const files = await localServer.listDirectory(dirPath);

          for (const file of files) {
            // Skip hidden, node_modules, dist
            if (file.name.startsWith('.') || file.name === 'node_modules' || file.name === 'dist') {
              continue;
            }

            if (file.isDirectory) {
              await searchDirectory(file.path);
            } else {
              // Only search text files
              const ext = file.name.split('.').pop()?.toLowerCase();
              const textExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'md', 'css', 'html', 'rs', 'txt', 'toml', 'yaml', 'yml'];
              if (!ext || !textExts.includes(ext)) continue;

              try {
                const content = await localServer.readFile(file.path);
                const lines = content.split('\n');
                const lowerQuery = query.toLowerCase();

                lines.forEach((line, index) => {
                  if (line.toLowerCase().includes(lowerQuery)) {
                    allResults.push({
                      path: file.path,
                      line: index + 1,
                      content: line.trim(),
                      match: query,
                    });
                  }
                });
              } catch {
                // Skip files that can't be read
              }
            }
          }
        } catch {
          // Skip directories that can't be listed
        }
      };

      await searchDirectory(projectPath);
      setResults(allResults.slice(0, 100)); // Limit to 100 results
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, projectPath]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onFileSelect?.(result.path);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar nos arquivos..."
            className="pl-8 pr-8"
            disabled={!projectPath}
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || !projectPath || loading}
          size="sm"
          className="w-full mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {!projectPath && (
          <div className="p-3 text-xs text-muted-foreground text-center">
            Abra um projeto para buscar.
          </div>
        )}

        {projectPath && !searched && (
          <div className="p-3 text-xs text-muted-foreground text-center">
            Digite um termo e pressione Enter para buscar.
          </div>
        )}

        {searched && results.length === 0 && !loading && (
          <div className="p-3 text-xs text-muted-foreground text-center">
            Nenhum resultado encontrado para "{query}".
          </div>
        )}

        {results.length > 0 && (
          <div className="divide-y divide-border">
            {results.map((result, index) => (
              <div
                key={`${result.path}-${result.line}-${index}`}
                className="p-2 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <FileCode className="h-3 w-3" />
                  <span className="truncate">
                    {result.path.split('/').slice(-2).join('/')}
                  </span>
                  <span className="text-primary">:{result.line}</span>
                </div>
                <p className="text-xs truncate font-mono">
                  {result.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AITabProps {
  aiContext: AIContext | null;
  onApplyCode?: (path: string, code: string) => void;
}

function AITab({ aiContext, onApplyCode }: AITabProps) {
  if (!aiContext) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Bot className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-sm font-medium mb-2">AI Assistant</h3>
        <p className="text-xs text-muted-foreground">
          Abra um projeto para usar o assistente de IA.
        </p>
      </div>
    );
  }

  const handleApplyCode = (path: string, code: string) => {
    onApplyCode?.(path, code);
  };

  return (
    <AIAssistant
      context={aiContext}
      onApplyCode={handleApplyCode}
      className="h-full"
    />
  );
}

function SettingsTab() {
  const preferences = useEditorStore((state) => state.preferences);
  const updatePreference = useEditorStore((state) => state.updatePreference);

  return (
    <div className="p-3 space-y-6 overflow-auto h-full">
      <div>
        <h3 className="text-sm font-medium mb-4">Configuracoes do Editor</h3>

        {/* Theme */}
        <div className="space-y-2 mb-4">
          <Label className="text-xs">Tema</Label>
          <Select
            value={preferences.theme}
            onValueChange={(value) =>
              updatePreference('theme', value as 'bazari-dark' | 'bazari-light' | 'vs-dark' | 'vs')
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bazari-dark">Bazari Dark</SelectItem>
              <SelectItem value="bazari-light">Bazari Light</SelectItem>
              <SelectItem value="vs-dark">VS Code Dark</SelectItem>
              <SelectItem value="vs">VS Code Light</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Font Size */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Tamanho da Fonte</Label>
            <span className="text-xs text-muted-foreground">{preferences.fontSize}px</span>
          </div>
          <Slider
            value={[preferences.fontSize]}
            onValueChange={([value]) => updatePreference('fontSize', value)}
            min={10}
            max={24}
            step={1}
            className="w-full"
          />
        </div>

        {/* Tab Size */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Tamanho do Tab</Label>
            <span className="text-xs text-muted-foreground">{preferences.tabSize}</span>
          </div>
          <Slider
            value={[preferences.tabSize]}
            onValueChange={([value]) => updatePreference('tabSize', value)}
            min={2}
            max={8}
            step={1}
            className="w-full"
          />
        </div>

        {/* Word Wrap */}
        <div className="flex items-center justify-between mb-4">
          <Label className="text-xs">Quebra de Linha</Label>
          <Switch
            checked={preferences.wordWrap === 'on'}
            onCheckedChange={(checked) => updatePreference('wordWrap', checked ? 'on' : 'off')}
          />
        </div>

        {/* Line Numbers */}
        <div className="flex items-center justify-between mb-4">
          <Label className="text-xs">Numeros de Linha</Label>
          <Switch
            checked={preferences.lineNumbers === 'on'}
            onCheckedChange={(checked) => updatePreference('lineNumbers', checked ? 'on' : 'off')}
          />
        </div>

        {/* Minimap */}
        <div className="flex items-center justify-between mb-4">
          <Label className="text-xs">Minimapa</Label>
          <Switch
            checked={preferences.minimap}
            onCheckedChange={(checked) => updatePreference('minimap', checked)}
          />
        </div>

        {/* Auto Save */}
        <div className="flex items-center justify-between mb-4">
          <Label className="text-xs">Salvar Automaticamente</Label>
          <Switch
            checked={preferences.autoSave}
            onCheckedChange={(checked) => updatePreference('autoSave', checked)}
          />
        </div>

        {/* Auto Save Delay */}
        {preferences.autoSave && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Delay do Auto-Save</Label>
              <span className="text-xs text-muted-foreground">
                {preferences.autoSaveDelay / 1000}s
              </span>
            </div>
            <Slider
              value={[preferences.autoSaveDelay]}
              onValueChange={([value]) => updatePreference('autoSaveDelay', value)}
              min={1000}
              max={10000}
              step={500}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
