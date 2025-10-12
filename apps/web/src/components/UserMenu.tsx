// apps/web/src/components/UserMenu.tsx

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { apiHelpers } from '@/lib/api';
import {
  User,
  Edit,
  Store,
  BarChart3,
  Settings,
  Moon,
  LogOut,
  Bookmark
} from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { ReputationBadge } from './profile/ReputationBadge';

export function UserMenu() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res: any = await apiHelpers.getMeProfile();
        if (active) {
          setProfile(res.profile);
        }
      } catch (error) {
        // Handle error
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleLogout = () => {
    // TODO: implement logout
    localStorage.removeItem('accessToken');
    navigate('/');
  };

  const toggleTheme = () => {
    // Cycle through themes: bazari -> night -> sandstone -> emerald -> royal -> cyber -> bazari
    const themes = ['bazari', 'night', 'sandstone', 'emerald', 'royal', 'cyber'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </Button>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile.displayName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              @{profile.handle}
            </p>
            {profile.reputationScore !== undefined && (
              <div className="pt-2">
                <ReputationBadge
                  score={profile.reputationScore}
                  tier={profile.reputationTier || 'bronze'}
                  size="sm"
                />
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to={`/u/${profile.handle}`} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/app/profile/edit" className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            Editar Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/app/bookmarks" className="cursor-pointer">
            <Bookmark className="mr-2 h-4 w-4" />
            Posts Salvos
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/app/sellers" className="cursor-pointer">
            <Store className="mr-2 h-4 w-4" />
            Minhas Lojas
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/app/stats" className="cursor-pointer">
            <BarChart3 className="mr-2 h-4 w-4" />
            Estatísticas
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={toggleTheme}>
          <Moon className="mr-2 h-4 w-4" />
          Tema: {theme === 'night' ? 'Escuro' : theme === 'sandstone' ? 'Claro' : theme.charAt(0).toUpperCase() + theme.slice(1)}
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/app/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
