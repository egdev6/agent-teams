import { TeamMembersRoleCard } from '@components/shared/TeamMembersRoleCard';
import type { CatalogEntitySummary } from '../../../models';

type EditTeamMembersCardProps = {
  availableAgents: CatalogEntitySummary[];
  selectedAgents: string[];
  onToggleAgent: (agentId: string) => void;
  onCreateAgent: () => void;
};

export const EditTeamMembersCard: React.FC<EditTeamMembersCardProps> = ({
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
    />
  );
};
