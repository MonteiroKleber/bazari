import { useState, useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { ProfileHoverCard } from '@/components/social/ProfileHoverCard';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res: any = await apiHelpers.getNotifications({ limit: 50 });
      setNotifications(res.items || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await apiHelpers.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Error marking notifications read:', error);
      toast.error('Erro ao marcar notificações como lidas');
    }
  };

  const handleNotificationClick = (notification: any) => {
    let link = '';

    switch (notification.type) {
      case 'FOLLOW':
        link = `/u/${notification.actor?.handle}`;
        break;
      case 'LIKE':
      case 'COMMENT':
      case 'REPOST':
      case 'MENTION':
        link = `/post/${notification.targetId}`;
        break;
      case 'ACHIEVEMENT_UNLOCKED':
      case 'BADGE':
        link = `/app/profile/edit`;
        break;
      case 'GROUP_INVITE':
        // Handled separately with buttons
        return;
      default:
        return;
    }

    if (link) {
      navigate(link);
    }
  };

  const handleAcceptInvite = async (notificationId: string) => {
    try {
      await apiHelpers.acceptGroupInvite(notificationId);
      toast.success('Você entrou no grupo!');
      loadNotifications();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aceitar convite');
    }
  };

  const handleRejectInvite = async (notificationId: string) => {
    try {
      await apiHelpers.rejectGroupInvite(notificationId);
      toast.success('Convite rejeitado');
      loadNotifications();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao rejeitar convite');
    }
  };

  const getNotificationMessage = (notification: any) => {
    switch (notification.type) {
      case 'FOLLOW':
        return 'começou a seguir você';
      case 'LIKE':
        const reactionEmoji = notification.metadata?.reaction
          ? { love: '❤️', laugh: '😂', wow: '😮', sad: '😢', angry: '😠' }[notification.metadata.reaction] || ''
          : '';
        return notification.metadata?.commentId
          ? `curtiu seu comentário ${reactionEmoji}`.trim()
          : `reagiu ${reactionEmoji} ao seu post`.trim();
      case 'COMMENT':
        return 'comentou no seu post';
      case 'REPOST':
        return 'repostou seu post';
      case 'MENTION':
        return 'mencionou você em um post';
      case 'ACHIEVEMENT_UNLOCKED':
        return `Você desbloqueou a conquista "${notification.metadata?.achievementName}"!`;
      case 'BADGE':
        return 'Você conquistou um novo badge!';
      case 'GROUP_INVITE':
        return `convidou você para entrar no grupo "${notification.metadata?.groupName}"`;
      default:
        return 'Nova notificação';
    }
  };

  const getNotificationIcon = (notification: any) => {
    switch (notification.type) {
      case 'BADGE':
        return '🏆';
      case 'ACHIEVEMENT_UNLOCKED':
        return '🎉';
      case 'REPOST':
        return '🔁';
      case 'MENTION':
        return '💬';
      case 'GROUP_INVITE':
        return '👥';
      default:
        return '🔔';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Notificações</h1>
          </div>
          {notifications.some(n => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-xs"
            >
              Marcar tudo como lido
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="divide-y">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma notificação</h3>
            <p className="text-muted-foreground text-sm">
              Você está em dia! Não há notificações novas.
            </p>
          </div>
        ) : (
          // Notifications list
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex gap-3 p-4 transition-colors ${
                !notification.read ? 'bg-accent/50' : ''
              }`}
            >
              {notification.type === 'GROUP_INVITE' ? (
                // Group invite (no click, has buttons)
                <>
                  {notification.actor?.avatarUrl ? (
                    <img
                      src={notification.actor.avatarUrl}
                      alt={notification.actor.displayName}
                      className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xl">
                      {getNotificationIcon(notification)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      {notification.actor && (
                        <span className="font-semibold">
                          {notification.actor.displayName}
                        </span>
                      )}{' '}
                      {getNotificationMessage(notification)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </div>
                    {!notification.read && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptInvite(notification.id)}
                          className="h-8 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectInvite(notification.id)}
                          className="h-8 text-xs"
                        >
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Regular notification (clickable)
                <div
                  onClick={() => handleNotificationClick(notification)}
                  className="flex gap-3 flex-1 cursor-pointer"
                >
                  {notification.actor?.avatarUrl ? (
                    <img
                      src={notification.actor.avatarUrl}
                      alt={notification.actor.displayName}
                      className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xl">
                      {getNotificationIcon(notification)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      {notification.actor && (
                        <span className="font-semibold">
                          {notification.actor.displayName}
                        </span>
                      )}{' '}
                      {getNotificationMessage(notification)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </div>
                  </div>

                  {!notification.read && (
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-primary rounded-full" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
