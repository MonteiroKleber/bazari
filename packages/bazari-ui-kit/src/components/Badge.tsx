import React from 'react';
import { colors } from '../tokens/colors';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  style,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: '9999px',
    whiteSpace: 'nowrap',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '2px 8px', fontSize: '11px' },
    md: { padding: '4px 10px', fontSize: '12px' },
    lg: { padding: '6px 12px', fontSize: '14px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: colors.gray[100],
      color: colors.gray[700],
    },
    primary: {
      background: colors.primary[100],
      color: colors.primary[700],
    },
    success: {
      background: colors.success[100],
      color: colors.success[700],
    },
    warning: {
      background: colors.warning[100],
      color: colors.warning[700],
    },
    error: {
      background: colors.error[100],
      color: colors.error[700],
    },
    outline: {
      background: 'transparent',
      color: colors.gray[600],
      border: `1px solid ${colors.border}`,
    },
  };

  return (
    <span
      {...props}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      className={`bzr-badge bzr-badge-${variant} ${className}`}
    >
      {children}
    </span>
  );
};
