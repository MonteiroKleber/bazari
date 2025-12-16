import { ReactNode } from 'react';

/**
 * Layout imersivo para telas de chat no mobile.
 *
 * No mobile: esconde AppHeader, Footer e MobileBottomNav
 * No desktop: comportamento normal com todos os elementos visíveis
 *
 * Isso dá +128px de espaço vertical para mensagens no mobile,
 * criando uma experiência similar ao WhatsApp/Telegram.
 */
interface ChatLayoutProps {
  children: ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <>
      {/* Container imersivo no mobile, normal no desktop */}
      <div className="fixed inset-0 z-50 bg-background md:relative md:z-auto md:min-h-screen">
        {children}
      </div>
    </>
  );
}
