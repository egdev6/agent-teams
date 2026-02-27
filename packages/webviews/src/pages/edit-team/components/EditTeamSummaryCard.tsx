import { Badge } from '@components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Separator } from '@components/ui/separator';
import { ShieldHalf } from 'lucide-react';
import type { CatalogEntitySummary } from '../../../types';

type EditTeamSummaryCardProps = {
  name: string;
  description: string;
  selectedAgents: string[];
  availableAgents: CatalogEntitySummary[];
};

export const EditTeamSummaryCard: React.FC<EditTeamSummaryCardProps> = ({
  name,
  description,
  selectedAgents,
  availableAgents,
}) => {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-base">Summary</CardTitle>
        <CardDescription>Team configuration overview</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center gap-2">
            <ShieldHalf className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{name || 'Unnamed Team'}</span>
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{selectedAgents.length} agents</span>
          </div>
        </div>

        {selectedAgents.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Members ({selectedAgents.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedAgents.map((id) => {
                  const agent = availableAgents.find((item) => item.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {agent?.name || id}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
