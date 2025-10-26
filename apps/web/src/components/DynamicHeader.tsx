import { useEffect, useState } from 'react';
import { Header } from './Header';
import { AppHeader } from './AppHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { isSessionActive } from '@/modules/auth/session';

/**
 * DynamicHeader - Header inteligente que exibe:
 * - AppHeader (interno) quando usuário está logado
 * - Header (externo) quando usuário NÃO está logado
 *
 * Usado em páginas públicas que devem se adaptar ao estado de autenticação,
 * como Marketplace (/search) e Lojas Públicas (/loja/:slug)
 */
export function DynamicHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState(isSessionActive());

  useEffect(() => {
    // Verifica autenticação na montagem do componente
    setIsAuthenticated(isSessionActive());

    // Listener para detectar mudanças de autenticação
    // Útil quando o usuário faz login/logout em outra aba
    const checkAuth = () => {
      setIsAuthenticated(isSessionActive());
    };

    // Event listener para mudanças no localStorage (login/logout em outras abas)
    window.addEventListener('storage', checkAuth);

    // Cleanup
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  return (
    <>
      {isAuthenticated ? <AppHeader /> : <Header />}
      {/* Mobile Bottom Nav aparece apenas quando usuário está logado */}
      {isAuthenticated && <MobileBottomNav />}
    </>
  );
}
