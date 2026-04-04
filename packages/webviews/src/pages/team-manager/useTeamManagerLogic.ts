import { vscode } from '@lib/vscode';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext';
import type { TeamItem, TeamManagerHostMessage } from '../../models';

export const useTeamManagerLogic = () => {
  const navigate = useNavigate();
  const { stats, optimisticActiveTeamId, setOptimisticActiveTeamId } = useDashboard();

  console.log('[TeamManager] Current state:', {
    optimisticActiveTeamId,
    statsActiveTeamId: stats.activeTeamId,
    finalActiveTeamId: optimisticActiveTeamId ?? stats.activeTeamId,
  });

  useEffect(() => {
    const onMessage = (event: MessageEvent<TeamManagerHostMessage>) => {
      const message = event.data;

      // Stats updates are handled by DashboardContext
      // Only handle team-specific messages here if needed
      if (message.type === 'teamActivationStarted') {
        // Backend confirmed the activation started - optimistic state already set
        // This message is mainly for logging/debugging
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const teamsById = new Map(
    stats.teams.map((team) => [
      team.id,
      {
        description: team.description,
        enabledAgentsCount: team.enabledAgentsCount,
        enablesAllAgents: team.enablesAllAgents,
        unsynced: team.unsynced,
      },
    ]),
  );

  const teams: TeamItem[] = stats.globalCatalog.teams.map((team) => {
    const localDetails = teamsById.get(team.id);
    return {
      id: team.id,
      name: team.name,
      description: localDetails?.description,
      enabledAgentsCount: localDetails?.enabledAgentsCount,
      enablesAllAgents: localDetails?.enablesAllAgents,
      localOnly: team.localOnly,
      unsynced: localDetails?.unsynced,
    };
  });

  return {
    navigate,
    teams,
    activeTeamId: optimisticActiveTeamId ?? stats.activeTeamId,
    activateTeam: (teamId: string) => {
      console.log('[TeamManager] activateTeam called with:', teamId, 'at', performance.now());
      setOptimisticActiveTeamId(teamId);
      console.log('[TeamManager] optimisticActiveTeamId set to:', teamId);
      // Store optimistic team in sessionStorage so Dashboard can use it
      sessionStorage.setItem('optimisticActiveTeamId', teamId);
      vscode.postMessage({ type: 'setActiveTeam', teamId });
      console.log('[TeamManager] postMessage sent');
    },
  };
};
