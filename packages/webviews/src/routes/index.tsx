/**
 * Route definitions for Agent Teams webviews
 * Using Memory Router for VSCode webview compatibility
 */
import { RootLayout } from '@components/layout/RootLayout';
import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const AgentManagerPage = lazy(() => import('@pages/agent-manager/AgentManagerPage'));
const ContextPacksPage = lazy(() => import('@pages/context-packs/ContextPacksPage'));
const CreateAgentPage = lazy(() => import('@pages/create-agent/CreateAgentPage'));
const CreateTeamPage = lazy(() => import('@pages/create-team/CreateTeamPage'));
const EditAgentPage = lazy(() => import('@pages/edit-agent/EditAgentPage'));
const EditTeamPage = lazy(() => import('@pages/edit-team/EditTeamPage'));
const ImportExportPage = lazy(() => import('@pages/import-export/ImportExportPage'));
const ProfileEditorPage = lazy(() => import('@pages/profile-editor/ProfileEditorPage'));
const SkillsBrowserPage = lazy(() => import('@pages/skills-browser/SkillsBrowserPage'));
const TeamManagerPage = lazy(() => import('@pages/team-manager/TeamManagerPage'));

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
        path: 'agents',
        element: <AgentManagerPage />,
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
      {
        path: 'import-export',
        element: <ImportExportPage />,
      },
    ],
  },
];
