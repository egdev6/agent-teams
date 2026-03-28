import { Settings, Wand2 } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';

type ConfigureProjectCardProps = {
  onEditProfile: () => void;
  onOpenAISetup: () => void;
};

export const ConfigureProjectCard = ({
  onEditProfile,
  onOpenAISetup,
}: ConfigureProjectCardProps) => {
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
        <p className='mb-6 text-center text-xs text-muted-foreground'>
          💡 Recommended: let AI auto-detect your stack, paths, commands, and generate context
          packs.
        </p>
        <div className='flex items-center flex-col sm:flex-row gap-4'>
          <Button variant='vscode' onClick={onOpenAISetup}>
            <Wand2 className='mr-2 h-4 w-4' />
            Auto-configure with AI
          </Button>
          OR
          <Button variant='vscode' onClick={onEditProfile}>
            <Settings className='mr-2 h-4 w-4' />
            Configure manually
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
