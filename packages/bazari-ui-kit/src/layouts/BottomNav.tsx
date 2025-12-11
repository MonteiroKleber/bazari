import React from 'react';
import { colors } from '../tokens/colors';

export interface BottomNavItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number | string;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ items, className = '' }) => {
  return (
    <nav
      className={`bzr-bottom-nav ${className}`}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.background,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
        zIndex: 100,
      }}
    >
      {items.map((item, index) => (
        <BottomNavButton key={index} {...item} />
      ))}
    </nav>
  );
};

const BottomNavButton: React.FC<BottomNavItem> = ({
  icon,
  label,
  href,
  onClick,
  active,
  badge,
}) => {
  const content = (
    <>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            color: active ? colors.primary[600] : colors.gray[500],
            display: 'block',
          }}
        >
          {icon}
        </span>
        {badge !== undefined && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-8px',
              background: colors.error[500],
              color: 'white',
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '9999px',
              minWidth: '18px',
              textAlign: 'center',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: active ? colors.primary[600] : colors.gray[500],
          marginTop: '4px',
        }}
      >
        {label}
      </span>
    </>
  );

  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    minWidth: '64px',
  };

  if (href) {
    return (
      <a href={href} style={style} className="bzr-bottom-nav-item">
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} style={style} className="bzr-bottom-nav-item">
      {content}
    </button>
  );
};
