import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Checkbox } from '@components/ui/checkbox';
import { Label } from '@components/ui/label';
import type { SyncTarget } from '../types';

const SYNC_TARGETS: Array<{
  id: SyncTarget;
  label: string;
  hint: string;
  gitignorePaths: string[];
}> = [
  {
    id: 'claude_code',
    label: 'Claude Code',
    hint: 'Sync AGENTS.md for Claude Code workflows.',
    gitignorePaths: ['.claude/', 'AGENTS.md'],
  },
  {
    id: 'codex',
    label: 'Codex',
    hint: 'Generates root AGENTS.md for Codex (included with Claude Code).',
    gitignorePaths: ['AGENTS.md'],
  },
  {
    id: 'github_copilot',
    label: 'GitHub Copilot',
    hint: 'Sync .github/agents/* files for Copilot.',
    gitignorePaths: [
      '.github/copilot-instructions.md',
      '.github/agents/',
      '.github/skills/',
      '.github/context/',
    ],
  },
];

type SyncTargetsCardProps = {
  selectedTargets: SyncTarget[];
  gitignoreTargets: SyncTarget[];
  onToggleTarget: (target: SyncTarget) => void;
  onToggleGitignoreTarget: (target: SyncTarget) => void;
  error?: string | null;
};

export const SyncTargetsCard: React.FC<SyncTargetsCardProps> = ({
  selectedTargets,
  gitignoreTargets,
  onToggleTarget,
  onToggleGitignoreTarget,
  error,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Targets</CardTitle>
        <CardDescription>
          Choose where generated agent outputs should be synchronized.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-3'>
        {error && <p className='text-sm text-destructive'>{error}</p>}
        {SYNC_TARGETS.map((target) => {
          const isSelected = selectedTargets.includes(target.id);
          const isGitignored = gitignoreTargets.includes(target.id);
          const gitignoreLabel = target.gitignorePaths.join(', ');
          return (
            <div key={target.id} className='space-y-1'>
              <div className='flex items-start gap-3'>
                <Checkbox
                  id={target.id}
                  className='mt-1'
                  checked={isSelected}
                  onCheckedChange={() => onToggleTarget(target.id)}
                />
                <Label htmlFor={target.id} className='cursor-pointer'>
                  <span className='block text-sm font-medium'>{target.label}</span>
                  <span className='text-xs text-muted-foreground'>{target.hint}</span>
                </Label>
              </div>
              {isSelected && (
                <div className='flex items-center gap-2 pl-7'>
                  <Checkbox
                    id={`${target.id}-gitignore`}
                    checked={isGitignored}
                    onCheckedChange={() => onToggleGitignoreTarget(target.id)}
                  />
                  <Label
                    htmlFor={`${target.id}-gitignore`}
                    className='cursor-pointer text-xs text-muted-foreground'
                  >
                    Add {gitignoreLabel} to .gitignore
                  </Label>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
