import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Dashboard } from './views/Dashboard';
import { DashboardStats, MessageType } from './types';

// Get VS Code API
declare const acquireVsCodeApi: () => {
  postMessage: (message: MessageType) => void;
  setState: (state: any) => void;
  getState: () => any;
};

const vscode = acquireVsCodeApi();

const App: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>(() => {
    // Parse initial state from window
    const initialState = (window as any).__INITIAL_STATE__;
    return initialState || {
      hasProfile: false,
      totalAgents: 0,
      specCount: 0,
      validSpecs: 0,
      syncStatus: 'NOT_SYNCED',
      syncTime: 'Never',
      agents: [],
    };
  });

  const handleMessage = (message: MessageType) => {
    vscode.postMessage(message);
  };

  // Listen for updates from extension
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'updateStats') {
        setStats(message.stats);
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  return <Dashboard stats={stats} onMessage={handleMessage} />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
