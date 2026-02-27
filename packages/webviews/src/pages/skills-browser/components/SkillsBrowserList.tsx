import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent } from '@components/ui/card';
import { cn } from '@lib/utils';
import { CheckCircle2, Download, Layers, Tag } from 'lucide-react';
import type { BrowserSkill } from '@/types';

const categoryColors: Record<string, string> = {
  TypeScript: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Testing: 'bg-green-500/10 text-green-500 border-green-500/20',
  Documentation: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Security: 'bg-red-500/10 text-red-500 border-red-500/20',
  Style: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  default: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

type SkillsBrowserListProps = {
  skills: BrowserSkill[];
  installedIds: Set<string>;
  onToggleInstall: (skillId: string) => void;
};

export const SkillsBrowserList: React.FC<SkillsBrowserListProps> = ({
  skills,
  installedIds,
  onToggleInstall,
}) => {
  return (
    <div className="space-y-3">
      {skills.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">No skills found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search or category filter
            </p>
          </CardContent>
        </Card>
      )}

      {skills.map((skill) => {
        const isInstalled = installedIds.has(skill.id);
        return (
          <Card
            key={skill.id}
            className={cn('transition-all', isInstalled && 'border-primary/40 bg-primary/2')}
          >
            <CardContent className="flex items-start gap-4 pt-4">
              <div
                className={cn(
                  'mt-0.5 shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium',
                  skill.category
                    ? categoryColors[skill.category] || categoryColors.default
                    : categoryColors.default,
                )}
              >
                {skill.category || 'General'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{skill.name}</span>
                  {skill.version && (
                    <span className="text-xs text-muted-foreground">v{skill.version}</span>
                  )}
                  {isInstalled && (
                    <Badge variant="default" className="gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      Installed
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{skill.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {skill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                size="sm"
                variant={isInstalled ? 'secondary' : 'outline'}
                className="shrink-0"
                onClick={() => onToggleInstall(skill.id)}
              >
                {isInstalled ? (
                  'Remove'
                ) : (
                  <>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Install
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
