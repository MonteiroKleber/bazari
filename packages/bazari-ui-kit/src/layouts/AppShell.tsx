import React from 'react';
import { colors } from '../tokens/colors';

export interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebar?: React.ReactNode;
  padding?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  header,
  footer,
  sidebar,
  padding = true,
}) => {
  return (
    <div
      className="bzr-app-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.background,
      }}
    >
      {header && (
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: colors.background,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {header}
        </header>
      )}

      <div style={{ display: 'flex', flex: 1 }}>
        {sidebar && (
          <aside
            style={{
              width: 240,
              borderRight: `1px solid ${colors.border}`,
              background: colors.background,
            }}
          >
            {sidebar}
          </aside>
        )}

        <main
          style={{
            flex: 1,
            padding: padding ? '24px' : 0,
            maxWidth: '100%',
          }}
        >
          {children}
        </main>
      </div>

      {footer && (
        <footer
          style={{
            borderTop: `1px solid ${colors.border}`,
            background: colors.background,
          }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
};
