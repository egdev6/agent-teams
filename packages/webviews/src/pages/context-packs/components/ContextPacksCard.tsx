import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Plus, RefreshCw, Save } from 'lucide-react';
import type { useContextPacksLogic } from '../useContextPacksLogic';

type ContextPacksCardProps = {
  model: ReturnType<typeof useContextPacksLogic>;
};

export const ContextPacksCard: React.FC<ContextPacksCardProps> = ({ model }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Project Context Packs</CardTitle>
            <CardDescription>
              Select active context packs for this project and create new markdown packs.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={model.refresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {model.error && <p className="text-sm text-destructive">{model.error}</p>}
        {model.status && <p className="text-sm text-muted-foreground">{model.status}</p>}

        {model.allPacks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No context packs found. Create one to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {model.allPacks.map((pack) => (
              <label key={pack} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={model.selectedPacks.includes(pack)}
                  onChange={() => model.togglePack(pack)}
                />
                <span>{pack}</span>
              </label>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t pt-3">
          <div className="flex gap-2">
            <Input
              placeholder="new pack id (e.g. backend-architecture)"
              value={model.newPackName}
              onChange={(event) => model.setNewPackName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  model.createPack();
                }
              }}
            />
            <Button variant="outline" onClick={model.createPack}>
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={model.saveSelection} disabled={model.isSaving} variant="outline">
            <Save className="mr-2 h-4 w-4" />
            {model.isSaving ? 'Saving...' : 'Save Selection'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
