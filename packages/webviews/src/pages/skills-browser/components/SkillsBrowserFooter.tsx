import { Button } from '@components/ui/button';
import { Separator } from '@components/ui/separator';
import { Sparkles } from 'lucide-react';

type SkillsBrowserFooterProps = {
  filteredCount: number;
  totalCount: number;
  onCreateAgent: () => void;
};

export const SkillsBrowserFooter: React.FC<SkillsBrowserFooterProps> = ({
  filteredCount,
  totalCount,
  onCreateAgent,
}) => {
  return (
    <>
      <Separator />
      <div className='flex items-center justify-between pb-4'>
        <p className='text-xs text-muted-foreground'>
          Showing {filteredCount} of {totalCount} skills
        </p>
        <Button variant='outline' size='sm' onClick={onCreateAgent}>
          <Sparkles className='mr-2 h-3.5 w-3.5' />
          Create Agent with these skills
        </Button>
      </div>
    </>
  );
};
