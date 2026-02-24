import { Button } from '@components/ui/button';
import { ArrowLeft, Users2 } from 'lucide-react';

type CreateTeamHeaderProps = {
  onBack: () => void;
};

export const CreateTeamHeader: React.FC<CreateTeamHeaderProps> = ({ onBack }) => {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Users2 className="h-5 w-5 text-primary" />
          Create New Team
        </h1>
        <p className="text-sm text-muted-foreground">Group agents into a reusable team</p>
      </div>
    </div>
  );
};
