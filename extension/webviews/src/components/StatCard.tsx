import React, { CSSProperties } from 'react';
import { theme } from '../theme';

interface StatCardProps {
  icon: string;
  title: string;
  value: string | number;
  label: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning';
  };
  style?: CSSProperties;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  label,
  badge,
  style
}) => {
  return (
    <div
      style={{
        background: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.border.primary}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xxl,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.lg,
        }}
      >
        <span style={{ fontSize: '20px' }}>{icon}</span>
        {badge && (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              background:
                badge.variant === 'success'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(245, 158, 11, 0.2)',
              color:
                badge.variant === 'success'
                  ? theme.colors.status.success
                  : theme.colors.status.warning,
            }}
          >
            {badge.text}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: theme.colors.text.secondary,
          textTransform: 'uppercase',
          marginBottom: theme.spacing.sm,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '32px',
          fontWeight: 700,
          marginBottom: '4px',
          color: theme.colors.text.primary,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '13px', color: theme.colors.text.tertiary }}>
        {label}
      </div>
    </div>
  );
};
