import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { BookOpenText, Bot, Layers, RefreshCw, Settings, ShieldHalf } from 'lucide-react';

type ActionConfig = {
  enabled: boolean;
  reason?: string;
  onClick: () => void;
};

type QuickActionsCardProps = {
  onEditProfile: () => void;
  manageTeams: ActionConfig;
  contextPacks: ActionConfig;
  manageAgents: ActionConfig;
  manageSkills: ActionConfig;
  syncAgents: ActionConfig;
  syncNeeded?: boolean;
};

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onEditProfile,
  manageTeams,
  contextPacks,
  manageAgents,
  manageSkills,
  syncAgents,
  syncNeeded,
}) => {
  const disabledTooltip = (reason?: string) => reason || undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className='grid gap-3 sm:grid-cols-3'>
        <Button variant='outline' className='justify-start' onClick={onEditProfile}>
          <Settings className='mr-2 h-4 w-4' />
          Edit Profile
        </Button>
        <div title={disabledTooltip(contextPacks.reason)}>
          <Button
            variant='outline'
            className='justify-start w-full'
            disabled={!contextPacks.enabled}
            onClick={contextPacks.onClick}
          >
            <BookOpenText className='mr-2 h-4 w-4' />
            Context Packs
          </Button>
        </div>
        <div title={disabledTooltip(manageTeams.reason)}>
          <Button
            variant='outline'
            className='justify-start w-full'
            disabled={!manageTeams.enabled}
            onClick={manageTeams.onClick}
          >
            <ShieldHalf className='mr-2 h-4 w-4' />
            Manage Teams
          </Button>
        </div>
        <div title={disabledTooltip(manageAgents.reason)}>
          <Button
            variant='outline'
            className='justify-start w-full'
            disabled={!manageAgents.enabled}
            onClick={manageAgents.onClick}
          >
            <Bot className='mr-2 h-4 w-4' />
            Manage Agents
          </Button>
        </div>
        <div title={disabledTooltip(manageSkills.reason)}>
          <Button
            variant='outline'
            className='justify-start w-full'
            disabled={!manageSkills.enabled}
            onClick={manageSkills.onClick}
          >
            <Layers className='mr-2 h-4 w-4' />
            Manage Skills
          </Button>
        </div>
        <div title={disabledTooltip(syncAgents.reason)}>
          <Button
            variant='outline'
            className='justify-start w-full relative'
            disabled={!syncAgents.enabled}
            onClick={syncAgents.onClick}
          >
            <RefreshCw className='mr-2 h-4 w-4' />
            Sync Agents
            {syncNeeded && (
              <span className='absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse' />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
