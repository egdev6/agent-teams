import { AgentCard } from '@components/shared/AgentCard';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import {
  ArrowLeft,
  Bot,
  ExternalLink,
  Loader2,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type { useCreateAgentLogic } from '../useCreateAgentLogic';

const AGENT_ROLES = [
  { value: 'worker', label: 'Worker', description: 'Executes specific tasks within a team' },
  { value: 'router', label: 'Router', description: 'Routes requests to appropriate agents' },
  {
    value: 'orchestrator',
    label: 'Orchestrator',
    description: 'Coordinates and delegates across agents',
  },
] as const;

const fieldClass =
  'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type CreateAgentViewProps = {
  model: ReturnType<typeof useCreateAgentLogic>;
};

export const CreateAgentView: React.FC<CreateAgentViewProps> = ({ model }) => {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => model.navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Bot className="h-5 w-5 text-primary" />
            Create New Agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure your agent's identity and skills
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
              <CardDescription>
                Name and role define how this agent shows up in teams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="agent-name">Agent Name *</Label>
                <Input
                  id="agent-name"
                  placeholder="e.g. Code Reviewer Bot"
                  value={model.name}
                  onChange={(event) => model.setName(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-role">Role</Label>
                <select
                  id="agent-role"
                  value={model.role}
                  onChange={(event) => model.setRole(event.target.value)}
                  className={cn(fieldClass, 'h-9')}
                >
                  <option value="">Select a role…</option>
                  {AGENT_ROLES.map((r) => (
                    <option key={r.value} value={r.value} title={r.description}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-description">Description</Label>
                <textarea
                  id="agent-description"
                  rows={3}
                  placeholder="Describe what this agent does and its primary responsibilities…"
                  value={model.description}
                  onChange={(event) => model.setDescription(event.target.value)}
                  className={cn(fieldClass, 'resize-none py-2')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Skills
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>Custom instructions or capabilities added to this agent</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-xs"
                  onClick={() => model.navigate('/skills-browser')}
                >
                  <ExternalLink className="h-3 w-3" />
                  Browse registry
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. prefer-functional, strict-types…"
                  value={model.skillInput}
                  onChange={(event) => model.setSkillInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      model.addSkill();
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={model.addSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {model.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {model.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1.5 pl-2">
                      <Tag className="h-3 w-3" />
                      {skill}
                      <button
                        type="button"
                        onClick={() => model.removeSkill(skill)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {model.skills.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No skills added yet. Press Enter or click + to add one.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>How this agent will appear in your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AgentCard
                id="preview"
                name={model.name || 'Unnamed Agent'}
                role={model.role || undefined}
                description={model.description || undefined}
                status="inactive"
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {model.createError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {model.createError}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!model.isValid || model.isSaving}
              onClick={model.handleCreate}
            >
              {model.isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bot className="mr-2 h-4 w-4" />
              )}
              {model.isSaving ? 'Creating…' : 'Create Agent'}
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
