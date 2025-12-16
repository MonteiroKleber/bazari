/**
 * ContractEditor - Main editor for ink! smart contracts
 * Includes file explorer and Rust syntax highlighting
 */

import React, { useState, useCallback } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContractExplorer } from './ContractExplorer';
import type { ContractFile, ContractProject } from '../../types/contract.types';

interface ContractEditorProps {
  project: ContractProject;
  onSave: (files: ContractFile[]) => void;
  onFileChange?: (file: ContractFile) => void;
  className?: string;
}

// Rust syntax highlighting keywords
const RUST_KEYWORDS = [
  'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn',
  'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in',
  'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return',
  'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type',
  'unsafe', 'use', 'where', 'while',
];

const RUST_TYPES = [
  'bool', 'char', 'str', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
  'i8', 'i16', 'i32', 'i64', 'i128', 'isize', 'f32', 'f64',
  'String', 'Vec', 'Option', 'Result', 'Box', 'Rc', 'Arc',
  'AccountId', 'Balance', 'Hash', 'Mapping',
];

const INK_MACROS = [
  'ink::contract', 'ink::storage', 'ink::event', 'ink::constructor',
  'ink::message', 'ink::test', 'ink::topic', 'cfg_attr', 'derive',
];

// Simple Rust syntax highlighter
function highlightRust(code: string): React.ReactNode[] {
  const lines = code.split('\n');

  return lines.map((line, lineIndex) => {
    // Handle comments
    if (line.trim().startsWith('//')) {
      return (
        <div key={lineIndex} className="text-green-500">
          {line}
        </div>
      );
    }

    // Handle doc comments
    if (line.trim().startsWith('///')) {
      return (
        <div key={lineIndex} className="text-green-400 italic">
          {line}
        </div>
      );
    }

    // Process line for highlighting
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyIndex = 0;

    // Handle strings
    const stringRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
    let lastIndex = 0;
    let match;

    while ((match = stringRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(highlightNonString(line.slice(lastIndex, match.index), keyIndex++));
      }
      parts.push(
        <span key={`str-${keyIndex++}`} className="text-amber-400">
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(highlightNonString(line.slice(lastIndex), keyIndex));
    }

    return <div key={lineIndex}>{parts.length > 0 ? parts : line || ' '}</div>;
  });
}

function highlightNonString(text: string, startKey: number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let keyIndex = startKey;

  // Build regex for all patterns
  const keywordPattern = RUST_KEYWORDS.join('|');
  const typePattern = RUST_TYPES.join('|');
  const macroPattern = INK_MACROS.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  const regex = new RegExp(
    `(#\\[(?:${macroPattern})[^\\]]*\\])|` + // Macros/attributes
    `\\b(${typePattern})\\b|` +              // Types
    `\\b(${keywordPattern})\\b|` +           // Keywords
    `(\\d+(?:\\.\\d+)?)|` +                  // Numbers
    `(&(?:mut\\s+)?)|` +                     // References
    `(->)`,                                  // Arrow
    'g'
  );

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add unmatched text before
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Determine what was matched
    if (match[1]) {
      // Macro/attribute
      parts.push(
        <span key={`macro-${keyIndex++}`} className="text-yellow-300">
          {match[0]}
        </span>
      );
    } else if (match[2]) {
      // Type
      parts.push(
        <span key={`type-${keyIndex++}`} className="text-cyan-400">
          {match[0]}
        </span>
      );
    } else if (match[3]) {
      // Keyword
      parts.push(
        <span key={`kw-${keyIndex++}`} className="text-purple-400 font-medium">
          {match[0]}
        </span>
      );
    } else if (match[4]) {
      // Number
      parts.push(
        <span key={`num-${keyIndex++}`} className="text-orange-400">
          {match[0]}
        </span>
      );
    } else if (match[5]) {
      // Reference
      parts.push(
        <span key={`ref-${keyIndex++}`} className="text-pink-400">
          {match[0]}
        </span>
      );
    } else if (match[6]) {
      // Arrow
      parts.push(
        <span key={`arrow-${keyIndex++}`} className="text-gray-400">
          {match[0]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

export function ContractEditor({
  project,
  onSave,
  onFileChange,
  className,
}: ContractEditorProps) {
  const [files, setFiles] = useState<ContractFile[]>(project.files);
  const [activeFilePath, setActiveFilePath] = useState(project.files[0]?.path || '');
  const [isDirty, setIsDirty] = useState(false);

  const activeFile = files.find((f) => f.path === activeFilePath);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      const newFiles = files.map((f) =>
        f.path === activeFilePath ? { ...f, content: newContent, isDirty: true } : f
      );
      setFiles(newFiles);
      setIsDirty(true);

      if (onFileChange && activeFile) {
        onFileChange({ ...activeFile, content: newContent, isDirty: true });
      }
    },
    [activeFilePath, files, activeFile, onFileChange]
  );

  const handleSave = useCallback(() => {
    const cleanFiles = files.map((f) => ({ ...f, isDirty: false }));
    setFiles(cleanFiles);
    setIsDirty(false);
    onSave(cleanFiles);
  }, [files, onSave]);

  const handleSelectFile = useCallback((path: string) => {
    setActiveFilePath(path);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Handle Tab key for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const content = activeFile?.content || '';
        const newContent = content.substring(0, start) + '    ' + content.substring(end);

        const newFiles = files.map((f) =>
          f.path === activeFilePath ? { ...f, content: newContent, isDirty: true } : f
        );
        setFiles(newFiles);
        setIsDirty(true);

        // Move cursor
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 4;
        }, 0);
      }
    },
    [activeFile, activeFilePath, files, handleSave]
  );

  return (
    <div className={cn('flex h-full bg-background', className)}>
      {/* File Explorer */}
      <div className="w-48 border-r border-border bg-muted/30 overflow-y-auto">
        <ContractExplorer
          files={files}
          activeFile={activeFilePath}
          onSelect={handleSelectFile}
        />
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{activeFile?.path || 'No file'}</span>
            {isDirty && (
              <span className="text-xs text-yellow-500">(unsaved)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles(project.files)}
              title="Revert changes"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty}
              title="Save (Ctrl+S)"
            >
              <Save className="h-4 w-4" />
              <span className="ml-1">Save</span>
            </Button>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 overflow-hidden relative">
          {activeFile ? (
            <div className="absolute inset-0 flex">
              {/* Line numbers */}
              <div className="w-12 bg-muted/40 border-r border-border text-right pr-2 py-4 text-xs text-muted-foreground font-mono select-none overflow-hidden">
                {activeFile.content.split('\n').map((_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Editor area with syntax highlighting preview */}
              <div className="flex-1 relative">
                {/* Syntax highlighted preview (behind textarea) */}
                <div className="absolute inset-0 p-4 font-mono text-sm leading-6 whitespace-pre overflow-auto pointer-events-none bg-[#1e1e1e] text-gray-300">
                  {highlightRust(activeFile.content)}
                </div>

                {/* Transparent textarea for editing */}
                <textarea
                  value={activeFile.content}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  className="absolute inset-0 w-full h-full p-4 font-mono text-sm leading-6 bg-transparent text-transparent caret-white resize-none outline-none"
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a file to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContractEditor;
