import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationItem } from './NotificationItem';
import type { GovernanceNotification, GovernanceNotificationType } from '../../types';

export interface NotificationPanelProps {
  /**
   * List of notifications
   */
  notifications: GovernanceNotification[];

  /**
   * Number of unread notifications
   */
  unreadCount: number;

  /**
   * Mark as read callback
   */
  onMarkAsRead: (id: string) => void;

  /**
   * Mark all as read callback
   */
  onMarkAllAsRead: () => void;

  /**
   * Remove notification callback
   */
  onRemove: (id: string) => void;

  /**
   * Clear all callback
   */
  onClearAll: () => void;

  /**
   * Close panel callback
   */
  onClose: () => void;

  /**
   * Panel open state
   */
  isOpen: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show as modal (center screen) or dropdown (top-right)
   * @default 'dropdown'
   */
  variant?: 'dropdown' | 'modal';
}

type TabType = 'all' | 'unread';

const notificationTypeLabels: Record<GovernanceNotificationType, string> = {
  PROPOSAL: 'Propostas',
  VOTE: 'Votos',
  APPROVAL: 'Aprovações',
  REJECTION: 'Rejeições',
  EXECUTION: 'Execuções',
  COUNCIL: 'Conselho',
  TREASURY: 'Tesouro',
  MULTISIG: 'Multi-sig',
};

/**
 * FASE 8 - PROMPT 6: Notification Panel Component
 *
 * Features:
 * - Tabs: All / Unread
 * - Filter by notification type
 * - Mark all as read
 * - Clear all notifications
 * - Empty state
 * - Scrollable list with animations
 * - Dropdown or modal variants
 *
 * @example
 * ```tsx
 * const {
 *   notifications,
 *   unreadCount,
 *   markAsRead,
 *   markAllAsRead,
 *   remove,
 *   clearAll,
 * } = useGovernanceNotifications();
 *
 * <NotificationPanel
 *   notifications={notifications}
 *   unreadCount={unreadCount}
 *   onMarkAsRead={markAsRead}
 *   onMarkAllAsRead={markAllAsRead}
 *   onRemove={remove}
 *   onClearAll={clearAll}
 *   onClose={() => setOpen(false)}
 *   isOpen={isOpen}
 *   variant="dropdown"
 * />
 * ```
 */
export function NotificationPanel({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onRemove,
  onClearAll,
  onClose,
  isOpen,
  className,
  variant = 'dropdown',
}: NotificationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [typeFilter, setTypeFilter] = useState<GovernanceNotificationType | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread' && n.read) return false;
    if (typeFilter && n.type !== typeFilter) return false;
    return true;
  });

  // Get unique notification types
  const notificationTypes = Array.from(new Set(notifications.map(n => n.type)));

  const isEmpty = filteredNotifications.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for modal variant */}
          {variant === 'modal' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={onClose}
            />
          )}

          {/* Panel */}
          <motion.div
            initial={
              variant === 'dropdown'
                ? { opacity: 0, y: -10, scale: 0.95 }
                : { opacity: 0, scale: 0.95 }
            }
            animate={
              variant === 'dropdown'
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 1, scale: 1 }
            }
            exit={
              variant === 'dropdown'
                ? { opacity: 0, y: -10, scale: 0.95 }
                : { opacity: 0, scale: 0.95 }
            }
            transition={{ type: 'spring', duration: 0.3 }}
            className={cn(
              'bg-card border border-border rounded-lg shadow-lg overflow-hidden',
              variant === 'dropdown' &&
                'fixed top-16 right-4 w-[400px] max-w-[calc(100vw-2rem)] z-50',
              variant === 'modal' &&
                'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[calc(100vw-2rem)] z-50',
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-lg">
                Notificações
                {unreadCount > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'})
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-1">
                {/* Mark all as read */}
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Marcar todas como lidas"
                    type="button"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}

                {/* Toggle filters */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'p-2 rounded-md hover:bg-accent transition-colors',
                    showFilters
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Filtros"
                  type="button"
                >
                  <Filter className="h-4 w-4" />
                </button>

                {/* Clear all */}
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Limpar todas"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Fechar"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border bg-muted/20">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-medium transition-colors relative',
                  activeTab === 'all'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                type="button"
              >
                Todas
                {activeTab === 'all' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-medium transition-colors relative',
                  activeTab === 'unread'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                type="button"
              >
                Não lidas
                {unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                    {unreadCount}
                  </span>
                )}
                {activeTab === 'unread' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-border overflow-hidden"
                >
                  <div className="p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Filtrar por tipo
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setTypeFilter(null)}
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-medium transition-colors',
                          typeFilter === null
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                        type="button"
                      >
                        Todos
                      </button>
                      {notificationTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => setTypeFilter(type)}
                          className={cn(
                            'px-2 py-1 rounded-md text-xs font-medium transition-colors',
                            typeFilter === type
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}
                          type="button"
                        >
                          {notificationTypeLabels[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto">
              {isEmpty ? (
                <div className="py-12 px-4 text-center">
                  <div className="text-muted-foreground mb-2">
                    {activeTab === 'unread'
                      ? '🎉 Nenhuma notificação não lida'
                      : '📭 Nenhuma notificação'}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'unread'
                      ? 'Você está em dia!'
                      : 'Quando houver novidades, elas aparecerão aqui.'}
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredNotifications.map(notification => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={onMarkAsRead}
                        onRemove={onRemove}
                        onClick={onClose}
                        showRemove={true}
                        compact={variant === 'dropdown'}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
