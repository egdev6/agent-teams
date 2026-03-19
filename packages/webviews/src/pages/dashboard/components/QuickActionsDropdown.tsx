import { Button } from '@components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import {
  BookOpenText,
  Bot,
  HardDriveDownload,
  Layers,
  Menu,
  Settings,
  ShieldHalf,
} from 'lucide-react';

type ActionConfig = {
  enabled: boolean;
  reason?: string;
  onClick: () => void;
};

type QuickActionsDropdownProps = {
  onEditProfile: () => void;
  manageTeams: ActionConfig;
  contextPacks: ActionConfig;
  manageAgents: ActionConfig;
  manageSkills: ActionConfig;
  importExport: ActionConfig;
};

export const QuickActionsDropdown: React.FC<QuickActionsDropdownProps> = ({
  onEditProfile,
  manageTeams,
  contextPacks,
  manageAgents,
  manageSkills,
  importExport,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='xl'>
          <Menu />
          <span className='sr-only'>Quick actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onEditProfile}>
            <Settings className='h-4 w-4' />
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!contextPacks.enabled}
            onClick={contextPacks.onClick}
            title={contextPacks.reason}
          >
            <BookOpenText className='h-4 w-4' />
            Context Packs
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!importExport.enabled}
            onClick={importExport.onClick}
            title={importExport.reason}
          >
            <HardDriveDownload className='h-4 w-4' />
            Import / Export
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={!manageTeams.enabled}
            onClick={manageTeams.onClick}
            title={manageTeams.reason}
          >
            <ShieldHalf className='h-4 w-4' />
            Manage Teams
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!manageAgents.enabled}
            onClick={manageAgents.onClick}
            title={manageAgents.reason}
          >
            <Bot className='h-4 w-4' />
            Manage Agents
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!manageSkills.enabled}
            onClick={manageSkills.onClick}
            title={manageSkills.reason}
          >
            <Layers className='h-4 w-4' />
            Manage Skills
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
