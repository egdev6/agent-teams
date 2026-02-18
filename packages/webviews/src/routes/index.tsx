/**
 * Route definitions for Agent Teams webviews
 * Using Memory Router for VSCode webview compatibility
 */

// Layouts
import { RootLayout } from '@components/layout/RootLayout';
// Pages (static imports for VSCode webview compatibility - no lazy loading)
import DashboardPage from '@pages/DashboardPage';
import KitBrowserPage from '@pages/KitBrowserPage';
import TeamManagerPage from '@pages/TeamManagerPage';
import type { RouteObject } from 'react-router-dom';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'profile-editor',
        element: <ProfileEditorPage />,
      },
      {
        path: 'kit-browser',
        element: <KitBrowserPage />,
      },
      {
        path: 'team-manager',
        element: <TeamManagerPage />,
      },
    ],
  },
];
