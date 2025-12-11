import React from 'react';
import { colors } from '../tokens/colors';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  variant = 'text',
  className = '',
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'block',
    background: `linear-gradient(90deg, ${colors.gray[200]} 25%, ${colors.gray[100]} 50%, ${colors.gray[200]} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'bzr-skeleton-shimmer 1.5s ease-in-out infinite',
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    text: { borderRadius: '4px' },
    circular: { borderRadius: '50%' },
    rectangular: { borderRadius: '0' },
    rounded: { borderRadius: '8px' },
  };

  return (
    <span
      className={`bzr-skeleton ${className}`}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
      }}
    />
  );
};

// Group for common skeleton patterns
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`bzr-skeleton-text ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        width={i === lines - 1 ? '60%' : '100%'}
        height="16px"
      />
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => (
  <Skeleton
    variant="circular"
    width={size}
    height={size}
    className={className}
  />
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`bzr-skeleton-card ${className}`}
    style={{
      padding: '16px',
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
    }}
  >
    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
      <SkeletonAvatar />
      <div style={{ flex: 1 }}>
        <Skeleton width="40%" height="16px" />
        <Skeleton width="20%" height="12px" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);
