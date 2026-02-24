import { Button } from '@components/ui/button';
import { Plus } from 'lucide-react';

type TeamManagerHeaderProps = {
  onCreateTeam: () => void;
};

export const TeamManagerHeader: React.FC<TeamManagerHeaderProps> = ({ onCreateTeam }) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Teams</h2>
        <p className="text-sm text-muted-foreground">
          Organize agents into teams for better workflow management
        </p>
      </div>
      <Button onClick={onCreateTeam}>
        <Plus className="mr-2 h-4 w-4" />
        Create Team
      </Button>
    </div>
  );
};
