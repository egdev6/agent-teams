/**
 * Route definitions for Agent Teams webviews
 * Using Memory Router for VSCode webview compatibility
 */
import { RootLayout } from '@components/layout/RootLayout';
import ContextPacksPage from '@pages/context-packs/ContextPacksPage';
import CreateAgentPage from '@pages/create-agent/CreateAgentPage';
import CreateTeamPage from '@pages/create-team/CreateTeamPage';
import EditAgentPage from '@pages/edit-agent/EditAgentPage';
import EditTeamPage from '@pages/edit-team/EditTeamPage';
import ProfileEditorPage from '@pages/profile-editor/ProfileEditorPage';
import SkillsBrowserPage from '@pages/skills-browser/SkillsBrowserPage';
import TeamManagerPage from '@pages/team-manager/TeamManagerPage';
import type { RouteObject } from 'react-router-dom';
import DashboardPage from '@/pages/dashboard/DashboardPage';

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
        path: 'context-packs',
        element: <ContextPacksPage />,
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
