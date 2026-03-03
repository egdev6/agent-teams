import { Button } from '@components/ui/button';
import { Card, CardContent } from '@components/ui/card';
import { Bot, Plus } from 'lucide-react';

type TeamEmptyStateProps = {
  onCreateTeam: () => void;
};

export const TeamEmptyState: React.FC<TeamEmptyStateProps> = ({ onCreateTeam }) => {
  return (
    <Card>
      <CardContent className='flex flex-col items-center justify-center py-12'>
        <Bot className='mb-4 h-12 w-12 text-muted-foreground' />
        <h3 className='mb-2 text-lg font-semibold'>No teams yet</h3>
        <p className='mb-4 text-center text-sm text-muted-foreground'>
          Create your first team to organize your agents
        </p>
        <Button onClick={onCreateTeam}>
          <Plus className='mr-2 h-4 w-4' />
          Create Team
        </Button>
      </CardContent>
    </Card>
  );
};
