import { Button } from '@components/ui/button';
import { Card, CardContent } from '@components/ui/card';
import { Plus, ShieldHalf } from 'lucide-react';
import { useTeamManagerLogic } from '@/pages/team-manager/useTeamManagerLogic';

type AgentsListCardProps = {
  hasActiveTeam: boolean;
  activeTeamId: string | null;
  createTeamEnabled: boolean;
  createTeamReason?: string;
  onCreateTeam: () => void;
  onManageTeams: () => void;
};

export const AgentsListCard: React.FC<AgentsListCardProps> = ({
  hasActiveTeam,
  activeTeamId,
  createTeamEnabled,
  createTeamReason,
  onCreateTeam,
  onManageTeams,
}) => {
  const disabledTooltip = (reason?: string) => reason || undefined;
  const teams = useTeamManagerLogic();

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <ShieldHalf className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">
          {hasActiveTeam
            ? `Current active team: ${activeTeamId}`
            : 'No active team. Create a new one or select an existing one.'}
        </h3>
        <p className="mb-4 text-center text-sm text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Select a team to enable the team agents view.
          </p>
        </p>
        <div className="flex gap-4">
          <Button
            variant="vscode"
            onClick={onCreateTeam}
            disabled={!createTeamEnabled}
            title={disabledTooltip(createTeamReason)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Team
          </Button>
          {teams.teams.length > 0 && (
            <Button
              variant="vscode"
              onClick={onManageTeams}
              disabled={!createTeamEnabled}
              title={disabledTooltip(createTeamReason)}
            >
              <ShieldHalf className="mr-2 h-4 w-4" />
              Manage Teams
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
