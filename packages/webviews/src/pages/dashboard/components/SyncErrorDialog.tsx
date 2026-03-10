import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { AlertCircle } from 'lucide-react';

type SyncErrorDialogProps = {
  syncError: string | null;
  onClose: () => void;
};

export const SyncErrorDialog: React.FC<SyncErrorDialogProps> = ({ syncError, onClose }) => {
  return (
    <Dialog open={Boolean(syncError)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader className='text-left'>
          <DialogTitle className='flex items-center gap-2 text-destructive'>
            <AlertCircle className='h-5 w-5 shrink-0' />
            Sync Agents failed
          </DialogTitle>
          <DialogDescription>
            Se detectó un error crítico durante la sincronización.
          </DialogDescription>
        </DialogHeader>
        <div className='rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap font-mono break-all'>
          {syncError}
        </div>
        <DialogFooter>
          <Button variant='destructive' onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
