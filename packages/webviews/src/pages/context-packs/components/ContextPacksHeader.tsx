import { Button } from '@components/ui/button';
import { CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { RefreshCw } from 'lucide-react';

type ContextPacksHeaderProps = {
  onRefresh: () => void;
  agentsMdBudget: number;
};

export const ContextPacksHeader: React.FC<ContextPacksHeaderProps> = ({
  onRefresh,
  agentsMdBudget,
}) => {
  return (
    <CardHeader>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <CardTitle>Project Context Packs</CardTitle>
          <CardDescription>
            Select active context packs for this project and create new markdown packs.
          </CardDescription>
          <p className='mt-2 text-xs text-muted-foreground'>
            AGENTS.md behavior: essential packs are always inlined, standard packs are inlined up to
            the budget ({agentsMdBudget} chars), and reference packs are listed under Referenced
            Context Packs.
          </p>
        </div>
        <Button variant='outline' size='sm' onClick={onRefresh}>
          <RefreshCw className='mr-2 h-4 w-4' />
          Refresh
        </Button>
      </div>
    </CardHeader>
  );
};
