import { motion } from 'framer-motion';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  FileText,
  Vote,
  CheckCircle,
  XCircle,
  Coins,
  Users,
  Lock,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GovernanceNotification, GovernanceNotificationType } from '../../types';

export interface NotificationItemProps {
  /**
   * Notification data
   */
  notification: GovernanceNotification;

  /**
   * Mark as read callback
   */
  onMarkAsRead: (id: string) => void;

  /**
   * Remove callback
   */
  onRemove: (id: string) => void;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Show remove button
   * @default true
   */
  showRemove?: boolean;

  /**
   * Compact mode (smaller padding)
   * @default false
   */
  compact?: boolean;
}

/**
 * Icon mapping for notification types
 */
const notificationIcons: Record<GovernanceNotificationType, React.ReactNode> = {
  PROPOSAL: <FileText className="h-5 w-5" />,
  VOTE: <Vote className="h-5 w-5" />,
  APPROVAL: <CheckCircle className="h-5 w-5" />,
  REJECTION: <XCircle className="h-5 w-5" />,
  EXECUTION: <CheckCircle className="h-5 w-5" />,
  COUNCIL: <Users className="h-5 w-5" />,
  TREASURY: <Coins className="h-5 w-5" />,
  MULTISIG: <Lock className="h-5 w-5" />,
};

/**
 * Color mapping for notification types
 */
const notificationColors: Record<GovernanceNotificationType, string> = {
  PROPOSAL: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  VOTE: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  APPROVAL: 'bg-green-500/10 text-green-600 dark:text-green-400',
  REJECTION: 'bg-red-500/10 text-red-600 dark:text-red-400',
  EXECUTION: 'bg-green-600/10 text-green-700 dark:text-green-500',
  COUNCIL: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  TREASURY: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  MULTISIG: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return timestamp;
  }
}

/**
 * FASE 8 - PROMPT 6: Notification Item Component
 *
 * Features:
 * - Type-based icons and colors
 * - Unread indicator
 * - Relative timestamps
 * - Clickable links to proposals
 * - Mark as read on click
 * - Remove button
 * - Compact mode for mobile
 *
 * @example
 * ```tsx
 * <NotificationItem
 *   notification={notification}
 *   onMarkAsRead={markAsRead}
 *   onRemove={remove}
 *   showRemove={true}
 *   compact={isMobile}
 * />
 * ```
 */
export function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
  onClick,
  showRemove = true,
  compact = false,
}: NotificationItemProps) {
  const handleClick = () => {
    // Mark as read on click
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }

    onClick?.();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(notification.id);
  };

  const content = (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'relative flex gap-3 rounded-lg border transition-colors',
        'hover:bg-accent/50',
        notification.read
          ? 'bg-background border-border'
          : 'bg-primary/5 border-primary/20',
        compact ? 'p-3' : 'p-4',
        'group'
      )}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          notificationColors[notification.type]
        )}
      >
        {notificationIcons[notification.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4
            className={cn(
              'font-semibold text-sm',
              notification.read ? 'text-foreground' : 'text-foreground'
            )}
          >
            {notification.title}
          </h4>

          {/* Timestamp */}
          <time className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatRelativeTime(notification.timestamp)}
          </time>
        </div>

        {/* Message */}
        {notification.message && (
          <p
            className={cn(
              'text-sm mb-2 line-clamp-2',
              notification.read ? 'text-muted-foreground' : 'text-foreground/90'
            )}
          >
            {notification.message}
          </p>
        )}

        {/* Metadata */}
        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {Object.entries(notification.metadata).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
              >
                <span className="font-medium capitalize">{key}:</span>
                <span>{String(value)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Link to proposal */}
        {notification.link && (
          <Link
            to={notification.link}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            Ver detalhes →
          </Link>
        )}
      </div>

      {/* Remove button */}
      {showRemove && (
        <button
          onClick={handleRemove}
          className={cn(
            'flex-shrink-0 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity',
            'hover:bg-destructive/10 text-muted-foreground hover:text-destructive',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label="Remover notificação"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );

  // Wrap in Link if has link
  if (notification.link) {
    return (
      <Link to={notification.link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
