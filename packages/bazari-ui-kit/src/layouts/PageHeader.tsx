import React from 'react';
import { colors } from '../tokens/colors';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  backButton?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  actions,
  backButton,
}) => {
  return (
    <div
      className="bzr-page-header"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {backButton}

        {icon && (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: colors.muted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        )}

        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              margin: 0,
              color: colors.foreground,
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              style={{
                fontSize: '14px',
                color: colors.mutedForeground,
                margin: '4px 0 0',
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
    </div>
  );
};
