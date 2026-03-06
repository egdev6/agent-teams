import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

type EngramBannerProps = {
  engramInstalled: boolean;
  engramConfigured: boolean;
  onSetup: () => void;
};

export const EngramBanner: React.FC<EngramBannerProps> = ({
  engramInstalled,
  engramConfigured,
  onSetup,
}) => {
  const title = !engramInstalled ? 'Engram not detected' : 'Workspace not configured for Engram';
  const description = !engramInstalled
    ? 'Install Engram to give your agents persistent memory across sessions.'
    : 'Run setup to create .vscode/mcp.json and update .gitignore for Engram.';
  const label = !engramInstalled || !engramConfigured ? 'Setup Engram' : 'Configure';

  return (
    <div className='flex items-center gap-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3'>
      <Database className='h-5 w-5 shrink-0 text-amber-500' />
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-medium'>{title}</p>
        <p className='text-xs text-muted-foreground'>{description}</p>
      </div>
      <Button size='sm' variant='outline' onClick={onSetup} className='shrink-0'>
        {label}
      </Button>
    </div>
  );
};
