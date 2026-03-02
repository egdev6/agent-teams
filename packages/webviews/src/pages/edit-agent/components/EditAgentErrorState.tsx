import { Button } from '@components/ui/button';
import { ArrowLeft } from 'lucide-react';

type EditAgentErrorStateProps = {
  loadError: string;
  onBack: () => void;
};

export const EditAgentErrorState: React.FC<EditAgentErrorStateProps> = ({ loadError, onBack }) => {
  return (
    <div className='mx-auto max-w-4xl space-y-4'>
      <Button variant='ghost' size='sm' onClick={onBack}>
        <ArrowLeft className='h-4 w-4' />
      </Button>
      <p className='rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive'>{loadError}</p>
    </div>
  );
};
