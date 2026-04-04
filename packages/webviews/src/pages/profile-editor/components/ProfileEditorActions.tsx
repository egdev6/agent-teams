import { Button } from '@components/ui/button';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

type ProfileEditorActionsProps = {
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export const ProfileEditorActions: React.FC<ProfileEditorActionsProps> = ({
  isSaving,
  onCancel,
  onSave,
}) => {
  return (
    <div className='flex items-center justify-end gap-4 pt-4'>
      <Button variant='outline' onClick={onCancel} disabled={isSaving}>
        <ArrowLeft className='mr-2 h-4 w-4' />
        Cancel
      </Button>
      <Button onClick={onSave} disabled={isSaving} variant='default'>
        {isSaving ? (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        ) : (
          <Save className='mr-2 h-4 w-4' />
        )}
        {isSaving ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  );
};
