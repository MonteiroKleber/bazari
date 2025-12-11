import React from 'react';
import { colors } from '../tokens/colors';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, className = '', style, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`bzr-input-wrapper ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '6px',
              color: colors.foreground,
            }}
          >
            {label}
          </label>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: `1px solid ${error ? colors.error[500] : colors.border}`,
            borderRadius: '8px',
            background: colors.background,
            overflow: 'hidden',
          }}
        >
          {leftAddon && (
            <div style={{ padding: '0 12px', color: colors.mutedForeground }}>
              {leftAddon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            {...props}
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: '14px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: colors.foreground,
              ...style,
            }}
          />

          {rightAddon && (
            <div style={{ padding: '0 12px', color: colors.mutedForeground }}>
              {rightAddon}
            </div>
          )}
        </div>

        {(error || hint) && (
          <p
            style={{
              fontSize: '12px',
              marginTop: '4px',
              color: error ? colors.error[500] : colors.mutedForeground,
            }}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
