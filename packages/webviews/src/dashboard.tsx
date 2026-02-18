import React from 'react';
import ReactDOM from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { logBundleSize, reportWebVitals } from './lib/performance';
import { routes } from './routes';
import './styles/globals.css';

// Create Memory Router (required for VSCode webviews)
const router = createMemoryRouter(routes, {
  initialEntries: ['/'],
  initialIndex: 0,
});

const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

const rootElement = document.getElementById('root');
if (rootElement) {
  // Mount app
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  // Report performance metrics in development
  if (import.meta.env.MODE === 'development') {
    reportWebVitals();
    logBundleSize();
  }
}
