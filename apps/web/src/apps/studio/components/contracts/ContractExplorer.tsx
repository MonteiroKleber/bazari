/**
 * ContractExplorer - File tree explorer for Rust contract files
 */

import React from 'react';
import { FileCode, FileJson, FileText, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContractFile } from '../../types/contract.types';

interface ContractExplorerProps {
  files: ContractFile[];
  activeFile: string;
  onSelect: (path: string) => void;
  className?: string;
}

// Get icon for file type
function getFileIcon(path: string): React.ElementType {
  if (path.endsWith('.rs')) return FileCode;
  if (path.endsWith('.toml')) return FileText;
  if (path.endsWith('.json')) return FileJson;
  return FileText;
}

// Get file color
function getFileColor(path: string): string {
  if (path.endsWith('.rs')) return 'text-orange-400';
  if (path.endsWith('.toml')) return 'text-blue-400';
  if (path.endsWith('.json')) return 'text-yellow-400';
  return 'text-muted-foreground';
}

interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileTreeNode[];
}

// Build tree structure from flat file list
function buildFileTree(files: ContractFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  files.forEach((file) => {
    const parts = file.path.split('/');
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const existingNode = currentLevel.find((n) => n.name === part);

      if (existingNode) {
        currentLevel = existingNode.children;
      } else {
        const newNode: FileTreeNode = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          isDirectory: !isFile,
          children: [],
        };
        currentLevel.push(newNode);
        currentLevel = newNode.children;
      }
    });
  });

  // Sort: directories first, then files alphabetically
  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortNodes(n.children));
  };

  sortNodes(root);
  return root;
}

interface TreeNodeProps {
  node: FileTreeNode;
  activeFile: string;
  onSelect: (path: string) => void;
  depth: number;
}

function TreeNode({ node, activeFile, onSelect, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = React.useState(true);
  const Icon = node.isDirectory
    ? expanded
      ? FolderOpen
      : Folder
    : getFileIcon(node.name);

  const isActive = !node.isDirectory && node.path === activeFile;
  const fileColor = node.isDirectory ? 'text-blue-400' : getFileColor(node.name);

  return (
    <div>
      <button
        className={cn(
          'flex items-center gap-1.5 w-full px-2 py-1 text-left text-sm hover:bg-accent/50 rounded transition-colors',
          isActive && 'bg-accent text-accent-foreground'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (node.isDirectory) {
            setExpanded(!expanded);
          } else {
            onSelect(node.path);
          }
        }}
      >
        <Icon className={cn('h-4 w-4 flex-shrink-0', fileColor)} />
        <span className="truncate">{node.name}</span>
        {node.isDirectory && node.children.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {node.children.length}
          </span>
        )}
      </button>

      {node.isDirectory && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              activeFile={activeFile}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ContractExplorer({
  files,
  activeFile,
  onSelect,
  className,
}: ContractExplorerProps) {
  const tree = React.useMemo(() => buildFileTree(files), [files]);

  if (files.length === 0) {
    return (
      <div className={cn('p-4 text-sm text-muted-foreground', className)}>
        No files in project
      </div>
    );
  }

  return (
    <div className={cn('py-2', className)}>
      <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Files
      </div>
      <div className="mt-1">
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            activeFile={activeFile}
            onSelect={onSelect}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

export default ContractExplorer;
