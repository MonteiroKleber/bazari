import { Link, useLocation } from 'react-router-dom';
import { Store, Newspaper, PlusSquare, MessageSquare, User, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useDeliveryProfile } from '@/hooks/useDeliveryProfile';
import { apiHelpers } from '@/lib/api';

interface NavItem {
  icon: typeof Store;
  label: string;
  path: string;
  badge?: number;
}

export function MobileBottomNav() {
  const location = useLocation();
  const { profile: deliveryProfile } = useDeliveryProfile();
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [currentUserHandle, setCurrentUserHandle] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Fetch current user profile for handle
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res: any = await apiHelpers.getMeProfile();
        if (active && res?.profile?.handle) {
          setCurrentUserHandle(res.profile.handle);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    })();
    return () => { active = false; };
  }, []);

  // Fetch chat unread count
  useEffect(() => {
    // TODO: Implement actual chat unread count fetch from API
    // For now, using mock data
    setChatUnreadCount(0);
  }, []);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const baseNavItems: NavItem[] = [
    {
      icon: Store,
      label: 'Loja',
      path: '/search',
    },
    {
      icon: Newspaper,
      label: 'Feed',
      path: '/app/feed',
    },
    {
      icon: PlusSquare,
      label: 'Criar',
      path: '/app/new',
    },
    {
      icon: MessageSquare,
      label: 'Chat',
      path: '/app/chat',
      badge: chatUnreadCount,
    },
  ];

  // Add delivery tab if user has delivery profile, otherwise add profile
  const navItems: NavItem[] = deliveryProfile
    ? [
        ...baseNavItems,
        {
          icon: Truck,
          label: 'Entregas',
          path: '/app/delivery/dashboard',
          badge: deliveryProfile.activeDeliveries || 0,
        },
      ]
    : [
        ...baseNavItems,
        {
          icon: User,
          label: 'Perfil',
          path: currentUserHandle ? `/u/${currentUserHandle}` : '/app/profile/edit',
        },
      ];

  const isActive = (path: string) => {
    // Marketplace/Search
    if (path === '/search') {
      return location.pathname === '/search' || location.pathname === '/explore';
    }
    // Feed
    if (path === '/app/feed') {
      return location.pathname === '/app/feed';
    }
    // Chat
    if (path === '/app/chat') {
      return location.pathname.startsWith('/app/chat');
    }
    // Delivery
    if (path === '/app/delivery/dashboard') {
      return location.pathname.startsWith('/app/delivery');
    }
    // Profile - check if viewing own profile
    if (path.startsWith('/u/') && currentUserHandle) {
      return location.pathname === `/u/${currentUserHandle}`;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border md:hidden transition-transform duration-300',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className={cn('grid h-16', deliveryProfile ? 'grid-cols-5' : 'grid-cols-5')}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs relative transition-colors',
                active
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
