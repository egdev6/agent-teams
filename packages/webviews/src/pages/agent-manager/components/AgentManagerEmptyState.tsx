import { Button } from '@components/ui/button';
import { Card, CardContent } from '@components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';

type AgentManagerEmptyStateProps = {
  icon: LucideIcon;
  onCreateAgent: () => void;
};

export const AgentManagerEmptyState: React.FC<AgentManagerEmptyStateProps> = ({
  icon: Icon,
  onCreateAgent,
}) => {
  return (
    <Card>
      <CardContent className='flex flex-col items-center justify-center py-12'>
        <Icon className='mb-4 h-12 w-12 text-muted-foreground' />
        <h3 className='mb-2 text-lg font-semibold'>No agents yet</h3>
        <p className='mb-4 text-center text-sm text-muted-foreground'>
          Create your first agent to start building your team workflows
        </p>
        <Button onClick={onCreateAgent}>
          <Plus className='mr-2 h-4 w-4' />
          Create Agent
        </Button>
      </CardContent>
    </Card>
  );
};
