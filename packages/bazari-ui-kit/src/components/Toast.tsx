import React from 'react';
import { colors } from '../tokens/colors';

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
  info: {
    bg: colors.primary[50],
    border: colors.primary[200],
    icon: 'i',
  },
  success: {
    bg: colors.success[50],
    border: colors.success[200],
    icon: '\u2713',
  },
  warning: {
    bg: colors.warning[50],
    border: colors.warning[200],
    icon: '!',
  },
  error: {
    bg: colors.error[50],
    border: colors.error[200],
    icon: '\u2715',
  },
};

const typeIconColors: Record<string, string> = {
  info: colors.primary[600],
  success: colors.success[600],
  warning: colors.warning[600],
  error: colors.error[600],
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  action,
  className = '',
}) => {
  const styles = typeStyles[type];

  return (
    <div
      className={`bzr-toast ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        minWidth: '300px',
        maxWidth: '500px',
      }}
      role="alert"
    >
      {/* Icon */}
      <span
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: typeIconColors[type],
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          flexShrink: 0,
        }}
      >
        {styles.icon}
      </span>

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: '14px',
          color: colors.foreground,
        }}
      >
        {message}
      </span>

      {/* Action */}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            background: 'none',
            border: 'none',
            color: typeIconColors[type],
            fontWeight: 500,
            fontSize: '14px',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {action.label}
        </button>
      )}

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: colors.gray[400],
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Toast container for positioning
export const ToastContainer: React.FC<{
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  children: React.ReactNode;
}> = ({ position = 'top-right', children }) => {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: '16px', right: '16px' },
    'top-left': { top: '16px', left: '16px' },
    'bottom-right': { bottom: '16px', right: '16px' },
    'bottom-left': { bottom: '16px', left: '16px' },
    'top-center': { top: '16px', left: '50%', transform: 'translateX(-50%)' },
    'bottom-center': { bottom: '16px', left: '50%', transform: 'translateX(-50%)' },
  };

  return (
    <div
      className="bzr-toast-container"
      style={{
        position: 'fixed',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...positionStyles[position],
      }}
    >
      {children}
    </div>
  );
};
