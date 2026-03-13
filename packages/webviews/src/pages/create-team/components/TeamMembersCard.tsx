import { TeamMembersRoleCard } from '@components/shared/TeamMembersRoleCard';
import type { CatalogEntitySummary } from '../../../models';

type TeamMembersCardProps = {
  availableAgents: CatalogEntitySummary[];
  selectedAgents: string[];
  onToggleAgent: (agentId: string) => void;
  onCreateAgent: () => void;
};

export const TeamMembersCard: React.FC<TeamMembersCardProps> = ({
  availableAgents,
  selectedAgents,
  onToggleAgent,
  onCreateAgent,
}) => {
  return (
    <TeamMembersRoleCard
      availableAgents={availableAgents}
      selectedAgents={selectedAgents}
      onToggleAgent={onToggleAgent}
      onCreateAgent={onCreateAgent}
      createAgentButtonVariant='vscode'
    />
  );
};
