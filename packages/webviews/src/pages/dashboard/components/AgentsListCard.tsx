import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { CheckCircle2, FolderOpen, Plus, Users2 } from 'lucide-react';

type AgentsListCardProps = {
  hasActiveTeam: boolean;
  activeTeamId: string | null;
  createTeamEnabled: boolean;
  createTeamReason?: string;
  selectTeamEnabled: boolean;
  selectTeamReason?: string;
  onCreateTeam: () => void;
  onSelectExisting: () => void;
};

export const AgentsListCard: React.FC<AgentsListCardProps> = ({
  hasActiveTeam,
  activeTeamId,
  createTeamEnabled,
  createTeamReason,
  selectTeamEnabled,
  selectTeamReason,
  onCreateTeam,
  onSelectExisting,
}) => {
  const disabledTooltip = (reason?: string) => reason || undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Team</CardTitle>
        <CardDescription>
          {hasActiveTeam
            ? `Current active team: ${activeTeamId}`
            : 'No active team. Create a new one or select an existing one.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border p-3">
          {hasActiveTeam ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
          ) : (
            <FolderOpen className="mt-0.5 h-5 w-5 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            Select a team to enable the team agents view.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={onCreateTeam}
            disabled={!createTeamEnabled}
            title={disabledTooltip(createTeamReason)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Team
          </Button>
          <Button
            variant="outline"
            onClick={onSelectExisting}
            disabled={!selectTeamEnabled}
            title={disabledTooltip(selectTeamReason)}
          >
            <Users2 className="mr-2 h-4 w-4" />
            Select Existing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
