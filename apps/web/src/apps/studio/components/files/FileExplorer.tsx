/**
 * FileExplorer - Tree view of project files with context menu
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  FileImage,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Plus,
  FolderPlus,
  Trash2,
  Pencil,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { localServer } from '../../services/localServer.client';

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: string;
}

interface FileExplorerProps {
  projectPath: string;
  onFileSelect: (filePath: string) => void;
  selectedFile?: string;
}

export function FileExplorer({
  projectPath,
  onFileSelect,
  selectedFile,
}: FileExplorerProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirContents, setDirContents] = useState<Map<string, FileInfo[]>>(
    new Map()
  );

  // Dialog states
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [targetPath, setTargetPath] = useState<string>(projectPath);
  const [targetFile, setTargetFile] = useState<FileInfo | null>(null);
  const [newName, setNewName] = useState('');

  const loadDirectory = useCallback(async (dirPath: string) => {
    try {
      const contents = await localServer.listDirectory(dirPath);
      const sorted = contents.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      return sorted;
    } catch {
      return [];
    }
  }, []);

  const loadRootFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rootFiles = await loadDirectory(projectPath);
      setFiles(rootFiles);
      const srcDir = rootFiles.find((f) => f.isDirectory && f.name === 'src');
      if (srcDir) {
        setExpandedDirs(new Set([srcDir.path]));
        const srcContents = await loadDirectory(srcDir.path);
        setDirContents(new Map([[srcDir.path, srcContents]]));
      }
    } catch {
      setError('Failed to load project files');
    } finally {
      setLoading(false);
    }
  }, [projectPath, loadDirectory]);

  useEffect(() => {
    loadRootFiles();
  }, [loadRootFiles]);

  const handleToggleDir = async (dirPath: string) => {
    const newExpanded = new Set(expandedDirs);

    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);
      if (!dirContents.has(dirPath)) {
        const contents = await loadDirectory(dirPath);
        setDirContents(new Map(dirContents).set(dirPath, contents));
      }
    }

    setExpandedDirs(newExpanded);
  };

  const handleFileClick = (file: FileInfo) => {
    if (file.isDirectory) {
      handleToggleDir(file.path);
    } else {
      onFileSelect(file.path);
    }
  };

  const handleRefresh = () => {
    setDirContents(new Map());
    setExpandedDirs(new Set());
    loadRootFiles();
  };

  const handleNewFile = async () => {
    if (!newName.trim()) return;

    const filePath = `${targetPath}/${newName.trim()}`;
    try {
      await localServer.writeFile(filePath, '');
      setShowNewFileDialog(false);
      setNewName('');
      handleRefresh();
      onFileSelect(filePath);
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  const handleNewFolder = async () => {
    if (!newName.trim()) return;

    const folderPath = `${targetPath}/${newName.trim()}`;
    try {
      await localServer.createDirectory(folderPath);
      setShowNewFolderDialog(false);
      setNewName('');
      handleRefresh();
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleRename = async () => {
    if (!targetFile || !newName.trim()) return;

    const parentPath = targetFile.path.substring(0, targetFile.path.lastIndexOf('/'));
    const newPath = `${parentPath}/${newName.trim()}`;
    try {
      await localServer.rename(targetFile.path, newPath);
      setShowRenameDialog(false);
      setNewName('');
      setTargetFile(null);
      handleRefresh();
    } catch (err) {
      console.error('Failed to rename:', err);
    }
  };

  const handleDelete = async () => {
    if (!targetFile) return;

    try {
      await localServer.delete(targetFile.path, targetFile.isDirectory);
      setShowDeleteDialog(false);
      setTargetFile(null);
      handleRefresh();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
  };

  const openNewFileDialog = (dirPath: string = projectPath) => {
    setTargetPath(dirPath);
    setNewName('');
    setShowNewFileDialog(true);
  };

  const openNewFolderDialog = (dirPath: string = projectPath) => {
    setTargetPath(dirPath);
    setNewName('');
    setShowNewFolderDialog(true);
  };

  const openRenameDialog = (file: FileInfo) => {
    setTargetFile(file);
    setNewName(file.name);
    setShowRenameDialog(true);
  };

  const openDeleteDialog = (file: FileInfo) => {
    setTargetFile(file);
    setShowDeleteDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-medium truncate">
          {projectPath.split('/').pop()}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRefresh}
            title="Atualizar"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => openNewFileDialog()}
            title="Novo arquivo"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => openNewFolderDialog()}
            title="Nova pasta"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-auto py-1">
        {files.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-2">
            Nenhum arquivo no projeto
          </p>
        ) : (
          <FileTree
            files={files}
            expandedDirs={expandedDirs}
            dirContents={dirContents}
            selectedFile={selectedFile}
            onFileClick={handleFileClick}
            onNewFile={openNewFileDialog}
            onNewFolder={openNewFolderDialog}
            onRename={openRenameDialog}
            onDelete={openDeleteDialog}
            onCopyPath={handleCopyPath}
            depth={0}
          />
        )}
      </div>

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Novo Arquivo</DialogTitle>
            <DialogDescription>
              Digite o nome do novo arquivo
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="nome-do-arquivo.ts"
            onKeyDown={(e) => e.key === 'Enter' && handleNewFile()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleNewFile} disabled={!newName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
            <DialogDescription>
              Digite o nome da nova pasta
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="nome-da-pasta"
            onKeyDown={(e) => e.key === 'Enter' && handleNewFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleNewFolder} disabled={!newName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Renomear</DialogTitle>
            <DialogDescription>
              Digite o novo nome
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              Renomear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{targetFile?.name}"?
              {targetFile?.isDirectory && ' Esta pasta e todo seu conteudo serao excluidos.'}
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FileTreeProps {
  files: FileInfo[];
  expandedDirs: Set<string>;
  dirContents: Map<string, FileInfo[]>;
  selectedFile?: string;
  onFileClick: (file: FileInfo) => void;
  onNewFile: (dirPath: string) => void;
  onNewFolder: (dirPath: string) => void;
  onRename: (file: FileInfo) => void;
  onDelete: (file: FileInfo) => void;
  onCopyPath: (path: string) => void;
  depth: number;
}

function FileTree({
  files,
  expandedDirs,
  dirContents,
  selectedFile,
  onFileClick,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onCopyPath,
  depth,
}: FileTreeProps) {
  return (
    <div>
      {files.map((file) => (
        <FileTreeItem
          key={file.path}
          file={file}
          expandedDirs={expandedDirs}
          dirContents={dirContents}
          selectedFile={selectedFile}
          onFileClick={onFileClick}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          onRename={onRename}
          onDelete={onDelete}
          onCopyPath={onCopyPath}
          depth={depth}
        />
      ))}
    </div>
  );
}

interface FileTreeItemProps {
  file: FileInfo;
  expandedDirs: Set<string>;
  dirContents: Map<string, FileInfo[]>;
  selectedFile?: string;
  onFileClick: (file: FileInfo) => void;
  onNewFile: (dirPath: string) => void;
  onNewFolder: (dirPath: string) => void;
  onRename: (file: FileInfo) => void;
  onDelete: (file: FileInfo) => void;
  onCopyPath: (path: string) => void;
  depth: number;
}

function FileTreeItem({
  file,
  expandedDirs,
  dirContents,
  selectedFile,
  onFileClick,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onCopyPath,
  depth,
}: FileTreeItemProps) {
  const isExpanded = expandedDirs.has(file.path);
  const isSelected = selectedFile === file.path;
  const children = dirContents.get(file.path) || [];

  // Skip hidden files/directories
  if (file.name.startsWith('.') && file.name !== '.env.example') {
    return null;
  }

  // Skip node_modules and dist
  if (file.name === 'node_modules' || file.name === 'dist') {
    return null;
  }

  const Icon = getFileIcon(file);
  const paddingLeft = depth * 12 + 8;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-accent/50 transition-colors text-sm',
              isSelected && 'bg-accent text-accent-foreground'
            )}
            style={{ paddingLeft }}
            onClick={() => onFileClick(file)}
          >
            {file.isDirectory ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="w-4" />
                <Icon className={cn('h-4 w-4 flex-shrink-0', getFileIconColor(file.name))} />
              </>
            )}
            <span className="truncate">{file.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {file.isDirectory && (
            <>
              <ContextMenuItem onClick={() => onNewFile(file.path)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo arquivo
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onNewFolder(file.path)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova pasta
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => onRename(file)}>
            <Pencil className="h-4 w-4 mr-2" />
            Renomear
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCopyPath(file.path)}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar caminho
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onDelete(file)} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Render children if expanded */}
      {file.isDirectory && isExpanded && children.length > 0 && (
        <FileTree
          files={children}
          expandedDirs={expandedDirs}
          dirContents={dirContents}
          selectedFile={selectedFile}
          onFileClick={onFileClick}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          onRename={onRename}
          onDelete={onDelete}
          onCopyPath={onCopyPath}
          depth={depth + 1}
        />
      )}
    </>
  );
}

function getFileIcon(file: FileInfo): React.ElementType {
  if (file.isDirectory) return Folder;

  const ext = file.name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'rs':
      return FileCode;
    case 'json':
      return FileJson;
    case 'md':
    case 'txt':
      return FileText;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'gif':
      return FileImage;
    default:
      return File;
  }
}

function getFileIconColor(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'text-blue-500';
    case 'js':
    case 'jsx':
      return 'text-yellow-500';
    case 'json':
      return 'text-green-500';
    case 'css':
    case 'scss':
      return 'text-pink-500';
    case 'html':
      return 'text-orange-500';
    case 'md':
      return 'text-gray-500';
    case 'rs':
      return 'text-orange-600';
    default:
      return 'text-muted-foreground';
  }
}

export default FileExplorer;
