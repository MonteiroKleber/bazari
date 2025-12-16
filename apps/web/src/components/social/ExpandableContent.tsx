import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ExpandableContentProps {
  content: string;
  maxLength?: number;
  className?: string;
}

// Regex patterns
const URL_REGEX = /(https?:\/\/[^\s<>\[\]{}|\\^]+)/gi;
const MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;
const HASHTAG_REGEX = /#([a-zA-Z0-9_]+)/g;

/**
 * Parse content and convert URLs, mentions, and hashtags to clickable links
 */
function parseContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;

  // Combined regex to match all patterns
  const combinedRegex = new RegExp(
    `(${URL_REGEX.source})|(${MENTION_REGEX.source})|(${HASHTAG_REGEX.source})`,
    'gi'
  );

  let match;
  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];

    if (fullMatch.startsWith('http://') || fullMatch.startsWith('https://')) {
      // URL - clean trailing punctuation
      const cleanUrl = fullMatch.replace(/[.,;:!?)\]]+$/, '');
      parts.push(
        <a
          key={`url-${keyIndex++}`}
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {cleanUrl}
        </a>
      );
      // Adjust lastIndex if we cleaned trailing chars
      lastIndex = match.index + cleanUrl.length;
    } else if (fullMatch.startsWith('@')) {
      // Mention
      const handle = fullMatch.slice(1);
      parts.push(
        <Link
          key={`mention-${keyIndex++}`}
          to={`/u/${handle}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </Link>
      );
      lastIndex = match.index + fullMatch.length;
    } else if (fullMatch.startsWith('#')) {
      // Hashtag
      const tag = fullMatch.slice(1);
      parts.push(
        <Link
          key={`hashtag-${keyIndex++}`}
          to={`/app/search?q=${encodeURIComponent(fullMatch)}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {fullMatch}
        </Link>
      );
      lastIndex = match.index + fullMatch.length;
    }
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function ExpandableContent({
  content,
  maxLength = 280,
  className,
}: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldTruncate = content.length > maxLength;
  const displayContent = isExpanded || !shouldTruncate
    ? content
    : content.slice(0, maxLength);

  const parsedContent = useMemo(() => parseContent(displayContent), [displayContent]);

  return (
    <div className={cn('whitespace-pre-wrap break-words', className)}>
      {parsedContent}
      {!isExpanded && shouldTruncate && (
        <span className="text-muted-foreground">...</span>
      )}
      {shouldTruncate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="ml-1 text-primary hover:underline text-sm font-medium"
        >
          {isExpanded ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  );
}
