import { Button } from '@components/ui/button';
import { FileUp, Save } from 'lucide-react';

type ContextPacksActionsProps = {
  isSaving: boolean;
  isImporting: boolean;
  onImportMd: () => void;
  onSave: () => void;
};

export const ContextPacksActions: React.FC<ContextPacksActionsProps> = ({
  isSaving,
  isImporting,
  onImportMd,
  onSave,
}) => {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button onClick={onImportMd} disabled={isImporting} variant='outline'>
        <FileUp className='mr-2 h-4 w-4' />
        {isImporting ? 'Importing...' : 'Import Markdown'}
      </Button>
      <Button onClick={onSave} disabled={isSaving} variant='outline'>
        <Save className='mr-2 h-4 w-4' />
        {isSaving ? 'Saving...' : 'Save Selection'}
      </Button>
    </div>
  );
};
