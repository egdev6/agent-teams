import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';

type SyncErrorDialogProps = {
  syncError: string | null;
  onClose: () => void;
};

export const SyncErrorDialog: React.FC<SyncErrorDialogProps> = ({ syncError, onClose }) => {
  return (
    <Dialog open={Boolean(syncError)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Agents failed</DialogTitle>
          <DialogDescription>
            Se detectó un error crítico durante la sincronización.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm rounded-md border p-3 bg-muted/30 whitespace-pre-wrap">
          {syncError}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
