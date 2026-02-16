import React, { CSSProperties } from 'react';
import { theme } from '../theme';

interface NavItem {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  style?: CSSProperties;
}

export const Sidebar: React.FC<SidebarProps> = ({ sections, style }) => {
  return (
    <div
      style={{
        width: '200px',
        background: theme.colors.background.sidebar,
        borderRight: `1px solid ${theme.colors.border.primary}`,
        padding: '20px 0',
        ...style,
      }}
    >
      <div
        style={{
          padding: '0 20px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '16px',
          fontWeight: 600,
        }}
      >
        🚀 Agent Team
      </div>

      {sections.map((section, i) => (
        <div key={i} style={{ marginTop: '20px' }}>
          <div
            style={{
              padding: '0 20px',
              fontSize: '11px',
              fontWeight: 600,
              color: theme.colors.text.tertiary,
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            {section.title}
          </div>
          {section.items.map((item, j) => (
            <div
              key={j}
              onClick={item.onClick}
              style={{
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: item.onClick ? 'pointer' : 'default',
                color: item.active ? '#fff' : theme.colors.text.secondary,
                fontSize: '13px',
                background: item.active ? '#1e40af' : 'transparent',
              }}
            >
              {item.icon} {item.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
