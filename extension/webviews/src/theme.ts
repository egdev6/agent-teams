export const theme = {
  colors: {
    background: {
      primary: '#0a0e27',
      secondary: '#0f1535',
      sidebar: '#070b1f',
    },
    border: {
      primary: '#1a1f3a',
      focus: '#2563eb',
    },
    text: {
      primary: '#e4e4e7',
      secondary: '#9ca3af',
      tertiary: '#6b7280',
    },
    accent: {
      blue: '#2563eb',
      blueLight: '#60a5fa',
      blueHover: '#1d4ed8',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    role: {
      worker: '#60a5fa',
      router: '#a78bfa',
      orchestrator: '#34d399',
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
  },
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '12px',
    full: '50%',
  }
};

export type Theme = typeof theme;
