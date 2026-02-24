import { Button } from '@components/ui/button';
import { Save, X } from 'lucide-react';

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
    <div className="flex items-center justify-between pt-4">
      <Button variant="outline" onClick={onCancel} disabled={isSaving}>
        <X className="mr-2 h-4 w-4" />
        Cancel
      </Button>
      <Button onClick={onSave} disabled={isSaving} variant="default">
        <Save className="mr-2 h-4 w-4" />
        {isSaving ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  );
};
