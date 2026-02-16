import React, { CSSProperties } from 'react';
import { theme } from '../theme';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium';
  style?: CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  style
}) => {
  const getVariantStyle = (): CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: theme.colors.accent.blue,
          color: '#fff',
        };
      case 'secondary':
        return {
          background: '#1e293b',
          color: theme.colors.text.primary,
        };
      case 'danger':
        return {
          background: theme.colors.status.error,
          color: '#fff',
        };
    }
  };

  const getSizeStyle = (): CSSProperties => {
    switch (size) {
      case 'small':
        return {
          padding: '6px 10px',
          fontSize: '12px',
        };
      case 'medium':
        return {
          padding: '8px 16px',
          fontSize: '13px',
        };
    }
  };

  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        borderRadius: theme.borderRadius.sm,
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'all 0.2s',
        ...getVariantStyle(),
        ...getSizeStyle(),
        ...style,
      }}
    >
      {children}
    </button>
  );
};
