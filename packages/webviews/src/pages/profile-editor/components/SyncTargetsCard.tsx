import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
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
          <label key={target.id} className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={selectedTargets.includes(target.id)}
              onChange={() => onToggleTarget(target.id)}
            />
            <span>
              <span className="block text-sm font-medium">{target.label}</span>
              <span className="text-xs text-muted-foreground">{target.hint}</span>
            </span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
};
