import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { BookOpenText } from 'lucide-react';

type ContextPacksSelectionCardProps = {
  availablePacks: string[];
  selectedPacks: string[];
  onTogglePack: (packId: string) => void;
  onManagePacks: () => void;
};

export const ContextPacksSelectionCard: React.FC<ContextPacksSelectionCardProps> = ({
  availablePacks,
  selectedPacks,
  onTogglePack,
  onManagePacks,
}) => {
  const allPacks = Array.from(new Set([...availablePacks, ...selectedPacks])).sort();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <CardTitle>Context Packs Selection</CardTitle>
            <CardDescription>
              Select which context packs are active for this project.
            </CardDescription>
          </div>
          <Button variant="vscode" size="sm" onClick={onManagePacks}>
            <BookOpenText className="mr-2 h-4 w-4" />
            Manage Packs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {allPacks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No context packs found. Use Manage Packs to create your first one.
          </p>
        ) : (
          <div className="space-y-2">
            {allPacks.map((pack) => (
              <label key={pack} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedPacks.includes(pack)}
                  onChange={() => onTogglePack(pack)}
                />
                <span>{pack}</span>
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
