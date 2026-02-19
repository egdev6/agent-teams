/**
 * Route definitions for Agent Teams webviews
 * Using Memory Router for VSCode webview compatibility
 */
import { RootLayout } from '@components/layout/RootLayout';
import CreateAgentPage from '@pages/CreateAgentPage';
import CreateTeamPage from '@pages/CreateTeamPage';
import DashboardPage from '@pages/DashboardPage';
import EditAgentPage from '@pages/EditAgentPage';
import EditTeamPage from '@pages/EditTeamPage';
import KitBrowserPage from '@pages/KitBrowserPage';
import ProfileEditorPage from '@pages/ProfileEditorPage';
import SkillsBrowserPage from '@pages/SkillsBrowserPage';
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
      {
        path: 'create-agent',
        element: <CreateAgentPage />,
      },
      {
        path: 'skills-browser',
        element: <SkillsBrowserPage />,
      },
      {
        path: 'edit-agent/:agentId',
        element: <EditAgentPage />,
      },
      {
        path: 'create-team',
        element: <CreateTeamPage />,
      },
      {
        path: 'edit-team/:teamId',
        element: <EditTeamPage />,
      },
    ],
  },
];
