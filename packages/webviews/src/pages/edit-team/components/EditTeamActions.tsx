import { Button } from '@components/ui/button';
import { Separator } from '@components/ui/separator';
import { ArrowLeft, CheckCircle2, Loader2, Save, Trash2 } from 'lucide-react';

type EditTeamActionsProps = {
  saveError: string | null;
  canSave: boolean;
  isSaving: boolean;
  isActiveTeam: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSetActiveTeam: () => void;
};

export const EditTeamActions: React.FC<EditTeamActionsProps> = ({
  saveError,
  canSave,
  isSaving,
  isActiveTeam,
  onSave,
  onCancel,
  onDelete,
  onSetActiveTeam,
}) => {
  return (
    <>
      {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      <div className="flex flex-col gap-2">
        <Button className="w-full" disabled={!canSave || isSaving} onClick={onSave}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
        <Button variant="outline" className="w-full" onClick={onCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={onSetActiveTeam}
          disabled={isActiveTeam || isSaving}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {isActiveTeam ? 'Active Team' : 'Set as Active Team'}
        </Button>
        <Separator />
        <Button variant="destructive" className="w-full" onClick={onDelete} disabled={isSaving}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Team
        </Button>
      </div>
    </>
  );
};
