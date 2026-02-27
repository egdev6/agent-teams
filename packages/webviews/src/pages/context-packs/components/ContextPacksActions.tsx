import { Button } from '@components/ui/button';
import { Save } from 'lucide-react';

type ContextPacksActionsProps = {
  isSaving: boolean;
  onSave: () => void;
};

export const ContextPacksActions: React.FC<ContextPacksActionsProps> = ({ isSaving, onSave }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onSave} disabled={isSaving} variant="outline">
        <Save className="mr-2 h-4 w-4" />
        {isSaving ? 'Saving...' : 'Save Selection'}
      </Button>
    </div>
  );
};
