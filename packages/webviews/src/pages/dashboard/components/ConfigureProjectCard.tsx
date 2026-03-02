import { Settings } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';

export const ConfigureProjectCard = ({ onEditProfile }: { onEditProfile: () => void }) => {
  return (
    <Card>
      <CardContent className='flex flex-col items-center justify-center py-12'>
        <Settings className='mb-4 h-12 w-12 text-muted-foreground' />
        <h3 className='mb-2 text-lg font-semibold'>Configure Your Project</h3>
        <p className='mb-4 text-center text-sm text-muted-foreground'>
          For starting to use the dashboard, you need to configure your profile with your project
          specifications. This will unlock all dashboard features and allow you to manage your
          agents and teams efficiently.
        </p>
        <Button variant='vscode' onClick={onEditProfile}>
          <Settings className='mr-2 h-4 w-4' />
          Configure Profile
        </Button>
      </CardContent>
    </Card>
  );
};
