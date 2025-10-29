import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationBellProps {
  /**
   * Number of unread notifications
   */
  count: number;

  /**
   * Click handler
   */
  onClick: () => void;

  /**
   * WebSocket connection status
   */
  status?: 'connecting' | 'connected' | 'disconnected' | 'error';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show pulse animation for new notifications
   * @default true
   */
  showPulse?: boolean;

  /**
   * Size variant
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  default: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const iconSizes = {
  sm: 'h-4 w-4',
  default: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const badgeSizes = {
  sm: 'text-[10px] min-w-[16px] h-4',
  default: 'text-xs min-w-[18px] h-[18px]',
  lg: 'text-sm min-w-[20px] h-5',
};

/**
 * FASE 8 - PROMPT 6: Notification Bell Component
 *
 * Features:
 * - Badge with notification count
 * - Connection status indicator
 * - Pulse animation for new notifications
 * - Accessible with keyboard navigation
 * - Responsive sizing
 *
 * @example
 * ```tsx
 * const { unreadCount, status } = useGovernanceNotifications();
 *
 * <NotificationBell
 *   count={unreadCount}
 *   status={status}
 *   onClick={() => setShowPanel(true)}
 *   showPulse={true}
 * />
 * ```
 */
export function NotificationBell({
  count,
  onClick,
  status,
  className,
  showPulse = true,
  size = 'default',
}: NotificationBellProps) {
  const hasNotifications = count > 0;

  // Status indicator color
  const statusColor = {
    connecting: 'bg-amber-500',
    connected: 'bg-green-500',
    disconnected: 'bg-muted-foreground',
    error: 'bg-red-500',
  }[status || 'disconnected'];

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative rounded-full flex items-center justify-center',
        'bg-card hover:bg-accent transition-colors',
        'border border-border',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        sizeClasses[size],
        className
      )}
      aria-label={`Notificações (${count} não lidas)`}
      type="button"
    >
      {/* Pulse animation for new notifications */}
      {showPulse && hasNotifications && (
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Bell icon */}
      <motion.div
        animate={
          hasNotifications
            ? {
                rotate: [0, -10, 10, -10, 10, 0],
              }
            : {}
        }
        transition={{
          duration: 0.5,
          repeat: hasNotifications ? Infinity : 0,
          repeatDelay: 3,
        }}
      >
        <Bell className={cn(iconSizes[size], 'text-foreground')} />
      </motion.div>

      {/* Notification badge */}
      <AnimatePresence>
        {hasNotifications && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 25,
            }}
            className={cn(
              'absolute -top-1 -right-1',
              'rounded-full',
              'bg-red-500 text-white',
              'font-bold',
              'flex items-center justify-center',
              'px-1',
              badgeSizes[size]
            )}
          >
            {count > 99 ? '99+' : count}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection status indicator */}
      {status && (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5',
            'w-3 h-3 rounded-full border-2 border-background',
            statusColor
          )}
          title={
            status === 'connecting'
              ? 'Conectando...'
              : status === 'connected'
                ? 'Conectado'
                : status === 'error'
                  ? 'Erro na conexão'
                  : 'Desconectado'
          }
        />
      )}
    </button>
  );
}
