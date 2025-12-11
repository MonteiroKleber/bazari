import React from 'react';
import { gradients, colors } from '../tokens/colors';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'all 0.2s ease',
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'inherit',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '8px 12px', fontSize: '14px' },
    md: { padding: '10px 16px', fontSize: '14px' },
    lg: { padding: '12px 24px', fontSize: '16px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: gradients.primary,
      color: 'white',
    },
    secondary: {
      background: colors.gray[100],
      color: colors.gray[900],
    },
    outline: {
      background: 'transparent',
      color: colors.primary[600],
      border: `1px solid ${colors.primary[300]}`,
    },
    ghost: {
      background: 'transparent',
      color: colors.gray[700],
    },
    success: {
      background: gradients.success,
      color: 'white',
    },
    danger: {
      background: gradients.error,
      color: 'white',
    },
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      className={`bzr-button bzr-button-${variant} ${className}`}
    >
      {loading ? (
        <span className="bzr-spinner" />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
};
