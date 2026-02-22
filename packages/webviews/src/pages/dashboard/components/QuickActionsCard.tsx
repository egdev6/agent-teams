import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Package, Plus, RefreshCw, Settings, Sparkles, Users2 } from 'lucide-react';

type ActionConfig = {
  enabled: boolean;
  reason?: string;
  onClick: () => void;
};

type QuickActionsCardProps = {
  onEditProfile: () => void;
  manageTeams: ActionConfig;
  createAgent: ActionConfig;
  browseKits: ActionConfig;
  browseSkills: ActionConfig;
  syncAgents: ActionConfig;
};

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onEditProfile,
  manageTeams,
  createAgent,
  browseKits,
  browseSkills,
  syncAgents,
}) => {
  const disabledTooltip = (reason?: string) => reason || undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <Button variant="outline" className="justify-start" onClick={onEditProfile}>
          <Settings className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
        <div title={disabledTooltip(manageTeams.reason)}>
          <Button
            variant="outline"
            className="justify-start w-full"
            disabled={!manageTeams.enabled}
            onClick={manageTeams.onClick}
          >
            <Users2 className="mr-2 h-4 w-4" />
            Manage Teams
          </Button>
        </div>
        <div title={disabledTooltip(createAgent.reason)}>
          <Button
            variant="outline"
            className="justify-start w-full"
            disabled={!createAgent.enabled}
            onClick={createAgent.onClick}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </div>
        <div title={disabledTooltip(browseKits.reason)}>
          <Button
            variant="outline"
            className="justify-start w-full"
            disabled={!browseKits.enabled}
            onClick={browseKits.onClick}
          >
            <Package className="mr-2 h-4 w-4" />
            Browse Kits
          </Button>
        </div>
        <div title={disabledTooltip(browseSkills.reason)}>
          <Button
            variant="outline"
            className="justify-start w-full"
            disabled={!browseSkills.enabled}
            onClick={browseSkills.onClick}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Browse Skills
          </Button>
        </div>
        <div title={disabledTooltip(syncAgents.reason)}>
          <Button
            variant="outline"
            className="justify-start w-full"
            disabled={!syncAgents.enabled}
            onClick={syncAgents.onClick}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Agents
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
