import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { GovernanceNotification } from '../types';

export interface UseGovernanceNotificationsOptions {
  /**
   * WebSocket URL
   * @default ws://localhost:3000/governance/events
   */
  wsUrl?: string;

  /**
   * Auto-connect on mount
   * @default true
   */
  autoConnect?: boolean;

  /**
   * Show toast notifications
   * @default true
   */
  showToasts?: boolean;

  /**
   * Play sound on notification
   * @default false
   */
  playSound?: boolean;

  /**
   * Max notifications to store
   * @default 100
   */
  maxNotifications?: number;

  /**
   * Auto-reconnect on disconnect
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Reconnect delay in milliseconds
   * @default 3000
   */
  reconnectDelay?: number;

  /**
   * Max reconnect attempts (0 = infinite)
   * @default 0
   */
  maxReconnectAttempts?: number;
}

export interface UseGovernanceNotificationsReturn {
  /**
   * List of notifications
   */
  notifications: GovernanceNotification[];

  /**
   * Number of unread notifications
   */
  unreadCount: number;

  /**
   * WebSocket connection status
   */
  status: 'connecting' | 'connected' | 'disconnected' | 'error';

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Mark notification as read
   */
  markAsRead: (notificationId: string) => void;

  /**
   * Mark all notifications as read
   */
  markAllAsRead: () => void;

  /**
   * Clear all notifications
   */
  clearAll: () => void;

  /**
   * Remove a specific notification
   */
  remove: (notificationId: string) => void;

  /**
   * Manually connect to WebSocket
   */
  connect: () => void;

  /**
   * Manually disconnect from WebSocket
   */
  disconnect: () => void;
}

/**
 * FASE 8 - PROMPT 6: Hook for real-time governance notifications
 *
 * Features:
 * - WebSocket connection to governance events
 * - Auto-reconnect with exponential backoff
 * - Toast notifications
 * - Sound notifications (optional)
 * - Mark as read/unread
 * - Notification history management
 *
 * @example
 * ```tsx
 * const {
 *   notifications,
 *   unreadCount,
 *   status,
 *   markAsRead,
 *   markAllAsRead,
 * } = useGovernanceNotifications({
 *   showToasts: true,
 *   playSound: false,
 *   autoReconnect: true,
 * });
 *
 * return (
 *   <NotificationBell
 *     count={unreadCount}
 *     onClick={() => showPanel()}
 *   />
 * );
 * ```
 */
// Get WebSocket URL from environment
const getDefaultWsUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  // Convert http/https to ws/wss
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  const wsHost = apiUrl.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${wsHost}/governance/events`;
};

export function useGovernanceNotifications({
  wsUrl = getDefaultWsUrl(),
  autoConnect = true,
  showToasts = true,
  playSound = false,
  maxNotifications = 100,
  autoReconnect = true,
  reconnectDelay = 3000,
  maxReconnectAttempts = 0,
}: UseGovernanceNotificationsOptions = {}): UseGovernanceNotificationsReturn {
  const [notifications, setNotifications] = useState<GovernanceNotification[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  /**
   * Calculate unread count
   */
  const unreadCount = notifications.filter(n => !n.read).length;

  /**
   * Play notification sound
   */
  const playNotificationSound = useCallback(() => {
    if (!playSound) return;

    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.warn('Failed to play notification sound:', err);
      });
    } catch (err) {
      console.warn('Audio not supported:', err);
    }
  }, [playSound]);

  /**
   * Show toast notification
   */
  const showToast = useCallback((notification: GovernanceNotification) => {
    if (!showToasts) return;

    const typeConfig = {
      PROPOSAL: { icon: '📝', variant: 'default' as const },
      VOTE: { icon: '🗳️', variant: 'default' as const },
      APPROVAL: { icon: '✅', variant: 'success' as const },
      REJECTION: { icon: '❌', variant: 'error' as const },
      EXECUTION: { icon: '⚡', variant: 'success' as const },
      COUNCIL: { icon: '👥', variant: 'default' as const },
      TREASURY: { icon: '💰', variant: 'default' as const },
      MULTISIG: { icon: '🔐', variant: 'default' as const },
    };

    const config = typeConfig[notification.type] || { icon: '🔔', variant: 'default' as const };

    toast[config.variant === 'error' ? 'error' : config.variant === 'success' ? 'success' : 'info'](
      notification.title,
      {
        description: notification.message,
        duration: 5000,
      }
    );
  }, [showToasts]);

  /**
   * Handle new notification
   */
  const handleNewNotification = useCallback((notification: GovernanceNotification) => {
    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      // Limit max notifications
      return newNotifications.slice(0, maxNotifications);
    });

    // Show toast
    showToast(notification);

    // Play sound
    playNotificationSound();
  }, [maxNotifications, showToast, playNotificationSound]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Remove a specific notification
   */
  const remove = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    );
  }, []);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    // Clear existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      setStatus('connecting');
      setError(null);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Governance notifications WebSocket connected');
        setStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle notification event
          if (data.type === 'notification') {
            const notification: GovernanceNotification = {
              id: data.id || `notification-${Date.now()}`,
              type: data.notificationType || 'PROPOSAL',
              title: data.title || 'Nova Notificação',
              message: data.message || '',
              timestamp: data.timestamp || new Date().toISOString(),
              read: false,
              proposalId: data.proposalId,
              link: data.link,
              metadata: data.metadata,
            };

            handleNewNotification(notification);
          }

          // Handle other message types (ping, etc.)
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ Governance notifications WebSocket error:', event);
        setStatus('error');
        setError('Erro na conexão WebSocket');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setStatus('disconnected');
        wsRef.current = null;

        // Auto-reconnect
        if (autoReconnect) {
          const shouldReconnect =
            maxReconnectAttempts === 0 ||
            reconnectAttemptsRef.current < maxReconnectAttempts;

          if (shouldReconnect) {
            reconnectAttemptsRef.current++;

            // Exponential backoff: 3s, 6s, 12s, 24s, 48s (max)
            const delay = Math.min(
              reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1),
              48000
            );

            console.log(
              `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.log('Max reconnect attempts reached');
            setError('Não foi possível reconectar');
          }
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Falha ao conectar');
    }
  }, [wsUrl, autoReconnect, reconnectDelay, maxReconnectAttempts, handleNewNotification]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, wsUrl]); // Reconnect if wsUrl changes

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('governance-notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.slice(0, maxNotifications));
      }
    } catch (err) {
      console.warn('Failed to load notifications from localStorage:', err);
    }
  }, [maxNotifications]);

  // Save notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('governance-notifications', JSON.stringify(notifications));
    } catch (err) {
      console.warn('Failed to save notifications to localStorage:', err);
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    status,
    error,
    markAsRead,
    markAllAsRead,
    clearAll,
    remove,
    connect,
    disconnect,
  };
}
