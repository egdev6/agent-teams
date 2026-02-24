import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { BookOpenText, Database, RefreshCw, Settings, Users2 } from 'lucide-react';

type ActionConfig = {
  enabled: boolean;
  reason?: string;
  onClick: () => void;
};

type QuickActionsCardProps = {
  onEditProfile: () => void;
  manageTeams: ActionConfig;
  globalCatalogBindings: ActionConfig;
  contextPacks: ActionConfig;
  syncAgents: ActionConfig;
};

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onEditProfile,
  manageTeams,
  globalCatalogBindings,
  contextPacks,
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
        <div title={disabledTooltip(globalCatalogBindings.reason)}>
          <Button
            variant="outline"
            className="justify-start w-full"
            disabled={!globalCatalogBindings.enabled}
            onClick={globalCatalogBindings.onClick}
          >
            <Database className="mr-2 h-4 w-4" />
            Reuse Global Catalog
          </Button>
        </div>
        <div title={disabledTooltip(contextPacks.reason)}>
          <Button
            variant="outline"
            className="justify-start w-full"
            disabled={!contextPacks.enabled}
            onClick={contextPacks.onClick}
          >
            <BookOpenText className="mr-2 h-4 w-4" />
            Context Packs
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
