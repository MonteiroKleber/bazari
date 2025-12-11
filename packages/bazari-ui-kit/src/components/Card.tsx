import React from 'react';
import { colors } from '../tokens/colors';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'elevated' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  style,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    borderRadius: '12px',
    transition: 'all 0.2s ease',
  };

  const paddingStyles: Record<string, React.CSSProperties> = {
    none: { padding: 0 },
    sm: { padding: '12px' },
    md: { padding: '16px' },
    lg: { padding: '24px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: colors.background,
      border: `1px solid ${colors.border}`,
    },
    outline: {
      background: 'transparent',
      border: `1px solid ${colors.border}`,
    },
    elevated: {
      background: colors.background,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    },
    gradient: {
      background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
      border: 'none',
    },
  };

  return (
    <div
      {...props}
      data-hoverable={hoverable}
      style={{
        ...baseStyles,
        ...paddingStyles[padding],
        ...variantStyles[variant],
        ...(hoverable && { cursor: 'pointer' }),
        ...style,
      }}
      className={`bzr-card ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    {...props}
    className={`bzr-card-header ${className}`}
    style={{ marginBottom: '12px' }}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3
    {...props}
    className={`bzr-card-title ${className}`}
    style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p
    {...props}
    className={`bzr-card-description ${className}`}
    style={{ fontSize: '14px', color: colors.mutedForeground, margin: '4px 0 0' }}
  >
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div {...props} className={`bzr-card-content ${className}`}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    {...props}
    className={`bzr-card-footer ${className}`}
    style={{
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: `1px solid ${colors.border}`,
    }}
  >
    {children}
  </div>
);
