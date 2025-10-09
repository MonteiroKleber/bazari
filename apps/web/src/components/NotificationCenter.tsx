import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { apiHelpers } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Badge } from './ui/badge';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res: any = await apiHelpers.getNotifications({ limit: 10 });
      setNotifications(res.items || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await apiHelpers.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={markAllRead}
            >
              Marcar tudo como lido
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            notifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationItem({ notification }: { notification: any }) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: ptBR
  });

  let message = '';
  let link = '';

  switch (notification.type) {
    case 'FOLLOW':
      message = `começou a seguir você`;
      link = `/u/${notification.actor?.handle}`;
      break;
    case 'LIKE':
      message = `curtiu seu post`;
      link = `/u/${notification.actor?.handle}`; // TODO: link direto pro post
      break;
    case 'COMMENT':
      message = `comentou no seu post`;
      link = `/u/${notification.actor?.handle}`;
      break;
    case 'BADGE':
      message = `Você conquistou um novo badge!`;
      link = `/app/profile/edit`;
      break;
    default:
      message = 'Nova notificação';
  }

  return (
    <DropdownMenuItem asChild>
      <Link
        to={link}
        className={`flex gap-3 p-3 cursor-pointer ${!notification.read ? 'bg-accent' : ''}`}
      >
        {notification.actor?.avatarUrl ? (
          <img
            src={notification.actor.avatarUrl}
            alt={notification.actor.displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            {notification.type === 'BADGE' ? '🏆' : '🔔'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm">
            {notification.actor && (
              <span className="font-semibold">{notification.actor.displayName}</span>
            )}{' '}
            {message}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {timeAgo}
          </div>
        </div>
      </Link>
    </DropdownMenuItem>
  );
}
