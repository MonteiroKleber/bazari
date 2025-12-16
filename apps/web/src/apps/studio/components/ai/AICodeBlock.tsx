/**
 * AICodeBlock - Code block with syntax highlighting and actions
 */

import React, { useState } from 'react';
import { Check, Copy, Play, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CodeBlock } from '../../types/ai.types';

interface AICodeBlockProps {
  block: CodeBlock;
  onApply?: (code: string, filename?: string) => void;
  onCopy?: (code: string) => void;
}

// Simple syntax highlighting keywords
const KEYWORDS = {
  typescript: [
    'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return',
    'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'extends',
    'implements', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this',
    'true', 'false', 'null', 'undefined', 'typeof', 'instanceof',
  ],
  tsx: [
    'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return',
    'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'extends',
    'implements', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this',
    'true', 'false', 'null', 'undefined', 'typeof', 'instanceof',
  ],
  javascript: [
    'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return',
    'if', 'else', 'for', 'while', 'class', 'extends', 'async', 'await',
    'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined',
  ],
  jsx: [
    'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return',
    'if', 'else', 'for', 'while', 'class', 'extends', 'async', 'await',
    'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined',
  ],
  json: [],
  css: ['@import', '@media', '@keyframes', '@font-face'],
  html: [],
};

const languageLabels: Record<string, string> = {
  typescript: 'TypeScript',
  tsx: 'TSX',
  javascript: 'JavaScript',
  jsx: 'JSX',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  plaintext: 'Text',
};

export const AICodeBlock: React.FC<AICodeBlockProps> = ({
  block,
  onApply,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      onCopy?.(block.code);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleApply = () => {
    onApply?.(block.code, block.filename);
  };

  const canApply = ['typescript', 'tsx', 'javascript', 'jsx'].includes(block.language);
  const label = languageLabels[block.language] || block.language;

  // Simple syntax highlighting
  const highlightCode = (code: string, lang: string): React.ReactNode[] => {
    const keywords = KEYWORDS[lang as keyof typeof KEYWORDS] || [];
    const lines = code.split('\n');

    return lines.map((line, lineIndex) => {
      // Handle comments
      if (line.trim().startsWith('//')) {
        return (
          <div key={lineIndex} className="text-muted-foreground/60">
            {line}
          </div>
        );
      }

      // Handle strings
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let keyIndex = 0;

      // Simple string highlighting
      const stringRegex = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
      let lastIndex = 0;
      let match;

      while ((match = stringRegex.exec(line)) !== null) {
        // Add text before string
        if (match.index > lastIndex) {
          const beforeText = line.slice(lastIndex, match.index);
          parts.push(highlightKeywords(beforeText, keywords, keyIndex++));
        }
        // Add string
        parts.push(
          <span key={`str-${keyIndex++}`} className="text-green-400">
            {match[0]}
          </span>
        );
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(highlightKeywords(line.slice(lastIndex), keywords, keyIndex));
      }

      return <div key={lineIndex}>{parts.length > 0 ? parts : line}</div>;
    });
  };

  const highlightKeywords = (
    text: string,
    keywords: string[],
    startKey: number
  ): React.ReactNode => {
    if (keywords.length === 0) return text;

    const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = startKey;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <span key={`kw-${keyIndex++}`} className="text-purple-400 font-medium">
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  return (
    <div className="rounded-lg border border-border bg-[#1e1e1e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {block.filename || label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
          {canApply && onApply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-primary hover:text-primary"
              onClick={handleApply}
            >
              <Play className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs">Apply</span>
            </Button>
          )}
        </div>
      </div>

      {/* Code */}
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono leading-relaxed text-gray-300">
          <code>{highlightCode(block.code, block.language)}</code>
        </pre>
      </div>
    </div>
  );
};

export default AICodeBlock;
