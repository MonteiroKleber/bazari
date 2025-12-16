/**
 * AIMessage - Individual message in the AI chat
 */

import React from 'react';
import { Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AICodeBlock } from './AICodeBlock';
import type { AIMessage as AIMessageType, AIAction } from '../../types/ai.types';
import { cn } from '@/lib/utils';

interface AIMessageProps {
  message: AIMessageType;
  onAction?: (action: AIAction) => void;
  onApplyCode?: (code: string, filename?: string) => void;
}

export const AIMessage: React.FC<AIMessageProps> = ({
  message,
  onAction,
  onApplyCode,
}) => {
  const isUser = message.role === 'user';

  // Parse content to separate text and code blocks
  const parseContent = (content: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    let index = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const text = content.slice(lastIndex, match.index);
        parts.push(
          <div key={`text-${index}`} className="prose prose-invert prose-sm max-w-none">
            {renderMarkdown(text)}
          </div>
        );
      }

      // Find corresponding code block from message
      const codeBlock = message.codeBlocks?.find(
        (block) => block.code.trim() === match[2].trim()
      ) || {
        language: match[1] || 'plaintext',
        code: match[2].trim(),
      };

      parts.push(
        <AICodeBlock
          key={`code-${index}`}
          block={codeBlock}
          onApply={onApplyCode}
        />
      );

      lastIndex = match.index + match[0].length;
      index++;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const text = content.slice(lastIndex);
      parts.push(
        <div key={`text-${index}`} className="prose prose-invert prose-sm max-w-none">
          {renderMarkdown(text)}
        </div>
      );
    }

    return parts;
  };

  // Simple markdown rendering
  const renderMarkdown = (text: string): React.ReactNode => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h4 key={i} className="text-base font-semibold mt-4 mb-2">
            {line.slice(4)}
          </h4>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h3 key={i} className="text-lg font-semibold mt-4 mb-2">
            {line.slice(3)}
          </h3>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h2 key={i} className="text-xl font-bold mt-4 mb-2">
            {line.slice(2)}
          </h2>
        );
      }
      // Lists
      else if (line.match(/^[\-\*]\s/)) {
        elements.push(
          <li key={i} className="ml-4 list-disc">
            {renderInlineMarkdown(line.slice(2))}
          </li>
        );
      } else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <li key={i} className="ml-4 list-decimal">
            {renderInlineMarkdown(line.replace(/^\d+\.\s/, ''))}
          </li>
        );
      }
      // Empty line
      else if (line.trim() === '') {
        elements.push(<br key={i} />);
      }
      // Regular paragraph
      else {
        elements.push(
          <p key={i} className="mb-2">
            {renderInlineMarkdown(line)}
          </p>
        );
      }
    });

    return <>{elements}</>;
  };

  // Inline markdown (bold, italic, code)
  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Handle inline code
    const parts: React.ReactNode[] = [];
    const codeRegex = /`([^`]+)`/g;
    let lastIndex = 0;
    let match;
    let index = 0;

    while ((match = codeRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderBoldItalic(text.slice(lastIndex, match.index), index));
      }
      parts.push(
        <code
          key={`code-${index}`}
          className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-sm text-primary"
        >
          {match[1]}
        </code>
      );
      lastIndex = match.index + match[0].length;
      index++;
    }

    if (lastIndex < text.length) {
      parts.push(renderBoldItalic(text.slice(lastIndex), index));
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  // Bold and italic
  const renderBoldItalic = (text: string, keyPrefix: number): React.ReactNode => {
    // Bold
    let result: React.ReactNode = text;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const boldParts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        boldParts.push(text.slice(lastIndex, match.index));
      }
      boldParts.push(
        <strong key={`bold-${keyPrefix}-${match.index}`}>{match[1]}</strong>
      );
      lastIndex = match.index + match[0].length;
    }

    if (boldParts.length > 0) {
      if (lastIndex < text.length) {
        boldParts.push(text.slice(lastIndex));
      }
      result = <>{boldParts}</>;
    }

    return result;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 max-w-[85%] space-y-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="space-y-3">{parseContent(message.content)}</div>
          )}
        </div>

        {/* Actions */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.actions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onAction?.(action)}
                className="h-7 text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
};

export default AIMessage;
