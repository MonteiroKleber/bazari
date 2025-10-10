import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  badge?: number;
}

export function MobileBottomNav() {
  const location = useLocation();
  const [notificationCount, setNotificationCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Fetch notification count
  useEffect(() => {
    // TODO: Implement actual notification count fetch
    // For now, using mock data
    setNotificationCount(0);
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

  const navItems: NavItem[] = [
    {
      icon: Home,
      label: 'Home',
      path: '/app/dashboard',
    },
    {
      icon: Search,
      label: 'Discover',
      path: '/search',
    },
    {
      icon: PlusSquare,
      label: 'Create',
      path: '/app/new',
    },
    {
      icon: Bell,
      label: 'Notifications',
      path: '/app/notifications',
      badge: notificationCount,
    },
    {
      icon: User,
      label: 'Profile',
      path: '/app/profile/edit',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/app/dashboard') {
      return location.pathname === '/app' || location.pathname === '/app/dashboard';
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
      <div className="grid grid-cols-5 h-16">
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
