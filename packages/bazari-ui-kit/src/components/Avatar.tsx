import React from 'react';
import { colors, gradients } from '../tokens/colors';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const fontSizeMap = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 24,
};

const statusColors = {
  online: colors.success[500],
  offline: colors.gray[400],
  away: colors.warning[500],
  busy: colors.error[500],
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  status,
  className = '',
}) => {
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];

  return (
    <div
      className={`bzr-avatar ${className}`}
      style={{
        position: 'relative',
        width: dimension,
        height: dimension,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: src ? 'transparent' : gradients.primary,
        color: 'white',
        fontSize,
        fontWeight: 500,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span>{name ? getInitials(name) : '?'}</span>
      )}

      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dimension * 0.25,
            height: dimension * 0.25,
            borderRadius: '50%',
            background: statusColors[status],
            border: '2px solid white',
          }}
        />
      )}
    </div>
  );
};
