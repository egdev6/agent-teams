import { Checkbox } from '@components/ui/checkbox';
import { Label } from '@components/ui/label';
import { Separator } from '@components/ui/separator';
import { Switch } from '@components/ui/switch';
import type { SyncTarget } from '../types';

export const SYNC_TARGETS: Array<{
  id: SyncTarget;
  label: string;
  hint: string;
  gitignorePaths: string[];
  group: 'agents' | 'context';
}> = [
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
    group: 'agents',
  },
  {
    id: 'claude_code',
    label: 'Claude Code',
    hint: 'Sync CLAUDE.md for Claude Code workflows.',
    gitignorePaths: ['.claude/', 'CLAUDE.md'],
    group: 'agents',
  },
  {
    id: 'opencode',
    label: 'opencode',
    hint: 'Sync .opencode/agents/* files for opencode.',
    gitignorePaths: ['.opencode/'],
    group: 'agents',
  },
  {
    id: 'codex',
    label: 'Codex',
    hint: 'Generates root AGENTS.md for Codex (included with Claude Code).',
    gitignorePaths: ['AGENTS.md'],
    group: 'context',
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    hint: 'Generates root GEMINI.md for Gemini CLI.',
    gitignorePaths: ['GEMINI.md'],
    group: 'context',
  },
  {
    id: 'openai',
    label: 'OpenAI Agents SDK',
    hint: 'Generates root AGENTS.md for OpenAI Agents SDK.',
    gitignorePaths: ['AGENTS.md'],
    group: 'context',
  },
];

const GROUP_ORDER: Array<'agents' | 'context'> = ['agents', 'context'];

const GROUP_LABELS: Record<'agents' | 'context', string> = {
  agents: 'Agents available',
  context: 'Only context',
};

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
  const grouped = GROUP_ORDER.reduce<Record<'agents' | 'context', typeof SYNC_TARGETS>>(
    (acc, group) => {
      acc[group] = SYNC_TARGETS.filter((t) => t.group === group);
      return acc;
    },
    { agents: [], context: [] },
  );

  return (
    <div className='space-y-3'>
      {error && <p className='text-sm text-destructive'>{error}</p>}
      {GROUP_ORDER.map((groupKey, groupIndex) => (
        <div key={groupKey}>
          {groupIndex > 0 && <Separator className='my-3' />}
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2'>
            {GROUP_LABELS[groupKey]}
          </p>
          <div className='space-y-3'>
            {grouped[groupKey].map((target) => {
              const isSelected = selectedTargets.includes(target.id);
              const isGitignored = gitignoreTargets.includes(target.id);
              const gitignoreLabel = target.gitignorePaths.join(', ');
              return (
                <div key={target.id} className='space-y-1'>
                  <div className='flex items-center gap-3'>
                    <Switch
                      id={target.id}
                      checked={isSelected}
                      onCheckedChange={() => onToggleTarget(target.id)}
                    />
                    <Label htmlFor={target.id} className='cursor-pointer flex flex-col gap-0.5'>
                      <span className='text-sm font-medium'>{target.label}</span>
                      <span className='text-xs text-muted-foreground'>{target.hint}</span>
                    </Label>
                  </div>
                  {isSelected && (
                    <div className='flex items-center gap-2 pl-3'>
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
          </div>
        </div>
      ))}
    </div>
  );
};
