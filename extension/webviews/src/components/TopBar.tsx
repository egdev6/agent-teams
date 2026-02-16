import React, { CSSProperties } from 'react';
import { theme } from '../theme';
import { Button } from './Button';

interface StatusItem {
  label: string;
  value: string;
  status?: 'success' | 'warning' | 'error';
}

interface TopBarProps {
  statusItems: StatusItem[];
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  style?: CSSProperties;
}

export const TopBar: React.FC<TopBarProps> = ({ statusItems, actions, style }) => {
  return (
    <div
      style={{
        background: theme.colors.background.secondary,
        borderBottom: `1px solid ${theme.colors.border.primary}`,
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: '40px' }}>
        {statusItems.map((item, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: theme.colors.text.tertiary,
                textTransform: 'uppercase',
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: item.status
                  ? item.status === 'success'
                    ? theme.colors.status.success
                    : item.status === 'warning'
                    ? theme.colors.status.warning
                    : theme.colors.status.error
                  : theme.colors.text.primary,
              }}
            >
              {item.status && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: theme.borderRadius.full,
                    background:
                      item.status === 'success'
                        ? theme.colors.status.success
                        : item.status === 'warning'
                        ? theme.colors.status.warning
                        : theme.colors.status.error,
                  }}
                />
              )}
              {item.value}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {actions.map((action, i) => (
          <Button key={i} onClick={action.onClick} variant={action.variant || 'secondary'}>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
