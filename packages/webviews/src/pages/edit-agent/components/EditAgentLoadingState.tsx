import { Loader2 } from 'lucide-react';

export const EditAgentLoadingState: React.FC = () => {
  return (
    <div className="flex h-64 items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Loading agent…</span>
    </div>
  );
};
