import { ReactNode } from 'react';
import { DeveloperSidebar } from '@/components/developer/DeveloperSidebar';
import { DeveloperBreadcrumb } from '@/components/developer/DeveloperBreadcrumb';
import { DeveloperMobileNav } from '@/components/developer/DeveloperMobileNav';

interface DeveloperLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function DeveloperLayout({
  children,
  title,
  description,
  actions,
}: DeveloperLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DeveloperSidebar />

      <main className="flex-1 p-6 pb-20 md:pb-6">
        <DeveloperBreadcrumb />

        {(title || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              {title && <h1 className="text-2xl font-bold">{title}</h1>}
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}

        {children}
      </main>

      <DeveloperMobileNav />
    </div>
  );
}
