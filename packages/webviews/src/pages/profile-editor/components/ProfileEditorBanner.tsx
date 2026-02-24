import { Card, CardContent } from '@components/ui/card';
import { AlertCircle } from 'lucide-react';

export const ProfileEditorBanner: React.FC = () => {
  return (
    <Card className="border-yellow-500/50 bg-yellow-500/10">
      <CardContent className="flex items-start gap-3 pt-6">
        <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-500" />
        <div className="flex-1">
          <h3 className="mb-1 text-sm font-semibold">Profile Editor</h3>
          <p className="text-sm text-muted-foreground">
            Configure your project profile to enable automatic agent detection and context packs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
