import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Separator } from '@components/ui/separator';
import { cn } from '@lib/utils';
import { ArrowLeft, Plus, Trash2, UserPlus, Users2, X } from 'lucide-react';
import type { useCreateTeamLogic } from '../useCreateTeamLogic';

const fieldClass =
  'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type CreateTeamViewProps = {
  model: ReturnType<typeof useCreateTeamLogic>;
};

export const CreateTeamView: React.FC<CreateTeamViewProps> = ({ model }) => {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => model.navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Users2 className="h-5 w-5 text-primary" />
            Create New Team
          </h1>
          <p className="text-sm text-muted-foreground">Group agents into a reusable team</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
              <CardDescription>Name and purpose of this team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {model.availableTeamTemplates.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="team-template">Reusable Team Template</Label>
                  <select
                    id="team-template"
                    className={fieldClass}
                    value={model.templateTeamId}
                    onChange={(event) => model.applyTemplate(event.target.value)}
                  >
                    <option value="">Start from scratch</option>
                    {model.availableTeamTemplates.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="team-id">Team ID *</Label>
                <Input
                  id="team-id"
                  placeholder="e.g. frontend-quality"
                  value={model.teamId}
                  onChange={(event) => model.setTeamId(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="team-name">Team Name *</Label>
                <Input
                  id="team-name"
                  placeholder="e.g. Frontend Quality Team"
                  value={model.name}
                  onChange={(event) => model.setName(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="team-description">Description</Label>
                <textarea
                  id="team-description"
                  rows={3}
                  placeholder="What is this team responsible for?"
                  value={model.description}
                  onChange={(event) => model.setDescription(event.target.value)}
                  className={cn(fieldClass, 'resize-none py-2')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="team-tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="team-tags"
                    placeholder="e.g. frontend, quality…"
                    value={model.tagInput}
                    onChange={(event) => model.setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        model.addTag();
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={model.addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {model.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {model.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1.5 pl-2">
                        {tag}
                        <button
                          type="button"
                          onClick={() => model.removeTag(tag)}
                          className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Team Members
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => model.navigate('/create-agent')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Agent
                </Button>
              </div>
              <CardDescription>Select agents to include in this team</CardDescription>
            </CardHeader>
            <CardContent>
              {model.availableAgents.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {model.availableAgents.map((agent) => {
                    const active = model.selectedAgents.includes(agent.id);
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => model.toggleAgent(agent.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent',
                          active ? 'border-primary bg-primary/5' : 'border-border bg-transparent',
                        )}
                      >
                        <Users2
                          className={cn(
                            'h-4 w-4 shrink-0',
                            active ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
                        <div>
                          <p className="text-sm font-medium leading-none">{agent.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{agent.id}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No agents available in catalog yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
              <CardDescription>Team configuration overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{model.name || 'Unnamed Team'}</span>
                </div>
                {model.description && (
                  <p className="text-xs text-muted-foreground">{model.description}</p>
                )}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{model.selectedAgents.length} agents</span>
                </div>
              </div>

              {model.selectedAgents.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Members ({model.selectedAgents.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {model.selectedAgents.map((id) => {
                        const agent = model.availableAgents.find((item) => item.id === id);
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

          {model.createError && <p className="text-sm text-destructive">{model.createError}</p>}

          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={!model.canCreate} onClick={model.handleCreate}>
              <Users2 className="mr-2 h-4 w-4" />
              Create Team
            </Button>
            <Button variant="outline" className="w-full" onClick={() => model.navigate(-1)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
