import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Separator } from '@components/ui/separator';
import { cn } from '@lib/utils';
import { ArrowLeft, CheckCircle2, Download, Layers, Search, Sparkles, Tag } from 'lucide-react';
import type { useSkillsBrowserLogic } from '../useSkillsBrowserLogic';

const categoryColors = {
  TypeScript: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Testing: 'bg-green-500/10 text-green-500 border-green-500/20',
  Documentation: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Security: 'bg-red-500/10 text-red-500 border-red-500/20',
  Style: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

type SkillsBrowserViewProps = {
  model: ReturnType<typeof useSkillsBrowserLogic>;
};

export const SkillsBrowserView: React.FC<SkillsBrowserViewProps> = ({ model }) => {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => model.navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            Skills Browser
          </h1>
          <p className="text-sm text-muted-foreground">
            Install skills from the registry to enhance your agents
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {model.installedCount} installed
        </Badge>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search skills by name, description or tag…"
              className="pl-10"
              value={model.query}
              onChange={(event) => model.setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {model.skillCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => model.setActiveCategory(category)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  model.activeCategory === category
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-transparent text-muted-foreground hover:bg-accent',
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {(['TypeScript', 'Testing', 'Security'] as const).map((category) => {
          const count = model.skillsRegistry.filter((skill) => skill.category === category).length;
          const installed = model.skillsRegistry.filter(
            (skill) => skill.category === category && model.installedIds.has(skill.id),
          ).length;

          return (
            <button
              key={category}
              type="button"
              onClick={() => model.setActiveCategory(category)}
              className="rounded-md border border-border p-3 text-left transition-colors hover:bg-accent"
            >
              <p className="text-xs text-muted-foreground">{category}</p>
              <p className="text-lg font-bold">
                {installed}/{count}
              </p>
              <p className="text-xs text-muted-foreground">installed</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {model.filtered.length === 0 && (
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

        {model.filtered.map((skill) => {
          const isInstalled = model.installedIds.has(skill.id);
          return (
            <Card
              key={skill.id}
              className={cn('transition-all', isInstalled && 'border-primary/40 bg-primary/2')}
            >
              <CardContent className="flex items-start gap-4 pt-4">
                <div
                  className={cn(
                    'mt-0.5 shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium',
                    categoryColors[skill.category],
                  )}
                >
                  {skill.category}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{skill.name}</span>
                    <span className="text-xs text-muted-foreground">v{skill.version}</span>
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
                  onClick={() => model.handleInstall(skill.id)}
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

      <Separator />

      <div className="flex items-center justify-between pb-4">
        <p className="text-xs text-muted-foreground">
          Showing {model.filtered.length} of {model.skillsRegistry.length} skills
        </p>
        <Button variant="outline" size="sm" onClick={() => model.navigate('/create-agent')}>
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          Create Agent with these skills
        </Button>
      </div>
    </div>
  );
};
