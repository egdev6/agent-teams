import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Checkbox } from '@components/ui/checkbox';
import { Label } from '@components/ui/label';
import type { SyncTarget } from '../types';

const SYNC_TARGETS: Array<{
  id: SyncTarget;
  label: string;
  hint: string;
}> = [
  {
    id: 'claude_code',
    label: 'Claude Code',
    hint: 'Sync AGENTS.md for Claude Code workflows.',
  },
  {
    id: 'codex',
    label: 'Codex',
    hint: 'Sync AGENTS.md for Codex workflows.',
  },
  {
    id: 'github_copilot',
    label: 'GitHub Copilot',
    hint: 'Sync .github/agents/* files for Copilot.',
  },
];

type SyncTargetsCardProps = {
  selectedTargets: SyncTarget[];
  onToggleTarget: (target: SyncTarget) => void;
};

export const SyncTargetsCard: React.FC<SyncTargetsCardProps> = ({
  selectedTargets,
  onToggleTarget,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Targets</CardTitle>
        <CardDescription>
          Choose where generated agent outputs should be synchronized.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {SYNC_TARGETS.map((target) => (
          <div key={target.id} className="flex items-start gap-3">
            <Checkbox
              id={target.id}
              className="mt-1"
              checked={selectedTargets.includes(target.id)}
              onCheckedChange={() => onToggleTarget(target.id)}
            />
            <Label htmlFor={target.id} className="cursor-pointer">
              <span className="block text-sm font-medium">{target.label}</span>
              <span className="text-xs text-muted-foreground">{target.hint}</span>
            </Label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
