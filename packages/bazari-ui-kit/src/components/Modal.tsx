import React, { useEffect } from 'react';
import { colors } from '../tokens/colors';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { maxWidth: '400px' },
  md: { maxWidth: '500px' },
  lg: { maxWidth: '700px' },
  xl: { maxWidth: '900px' },
  full: { maxWidth: '95vw', maxHeight: '95vh' },
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className = '',
}) => {
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`bzr-modal-overlay ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className="bzr-modal"
        style={{
          background: colors.background,
          borderRadius: '16px',
          width: '100%',
          ...sizeStyles[size],
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div
            style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            {title && (
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  margin: 0,
                  color: colors.foreground,
                }}
              >
                {title}
              </h2>
            )}
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
        )}

        {/* Content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
