import { Card, CardContent } from '@components/ui/card';
import { SearchX } from 'lucide-react';

type RoleTabEmptyStateProps = {
  roleLabel: string;
  contextLabel: string;
};

export const RoleTabEmptyState: React.FC<RoleTabEmptyStateProps> = ({
  roleLabel,
  contextLabel,
}) => {
  const roleName = roleLabel.toLowerCase();

  return (
    <Card className='border-dashed'>
      <CardContent className='flex flex-col items-center justify-center py-10 text-center'>
        <SearchX className='mb-4 h-10 w-10 text-muted-foreground' />
        <h3 className='mb-2 text-base font-semibold'>No {roleName} agents assigned</h3>
        <p className='text-sm text-muted-foreground'>
          There are no {roleName} agents assigned in {contextLabel}.
        </p>
      </CardContent>
    </Card>
  );
};
