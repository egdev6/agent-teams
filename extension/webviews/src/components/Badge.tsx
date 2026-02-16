import React, { CSSProperties } from 'react';
import { theme } from '../theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'worker' | 'router' | 'orchestrator';
  style?: CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'success', style }) => {
  const getVariantStyle = (): CSSProperties => {
    switch (variant) {
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.2)',
          color: theme.colors.status.success,
        };
      case 'warning':
        return {
          background: 'rgba(245, 158, 11, 0.2)',
          color: theme.colors.status.warning,
        };
      case 'error':
        return {
          background: 'rgba(239, 68, 68, 0.2)',
          color: theme.colors.status.error,
        };
      case 'worker':
        return {
          background: 'rgba(37, 99, 235, 0.2)',
          color: theme.colors.role.worker,
        };
      case 'router':
        return {
          background: 'rgba(139, 92, 246, 0.2)',
          color: theme.colors.role.router,
        };
      case 'orchestrator':
        return {
          background: 'rgba(16, 185, 129, 0.2)',
          color: theme.colors.role.orchestrator,
        };
    }
  };

  return (
    <span
      style={{
        padding: '4px 12px',
        borderRadius: '14px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        ...getVariantStyle(),
        ...style,
      }}
    >
      {children}
    </span>
  );
};
