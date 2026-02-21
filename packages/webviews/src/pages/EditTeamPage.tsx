/**
 * EditTeamPage
 * Edit an existing team — pre-populates from teamId URL param.
 */
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Separator } from '@components/ui/separator';
import { cn } from '@lib/utils';
import { vscode } from '@lib/vscode';
import { ArrowLeft, Package, Plus, Save, Trash2, UserPlus, Users2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const AVAILABLE_AGENTS = [
  { id: 'code-reviewer', label: 'Code Reviewer', role: 'code-reviewer' },
  { id: 'architect', label: 'Architect', role: 'architect' },
  { id: 'debugger', label: 'Debugger', role: 'debugger' },
  { id: 'documenter', label: 'Documenter', role: 'documenter' },
  { id: 'tester', label: 'Tester', role: 'tester' },
  { id: 'security-audit', label: 'Security Auditor', role: 'security' },
];

const AVAILABLE_KITS = [
  {
    id: 'typescript-expert',
    label: 'TypeScript Expert',
    description: 'Advanced TS patterns & inference',
  },
  { id: 'code-review', label: 'Code Review', description: 'Best practices & quality gates' },
  { id: 'testing-suite', label: 'Testing Suite', description: 'Unit, integration & e2e helpers' },
  { id: 'docs-writer', label: 'Docs Writer', description: 'JSDoc, README & API docs' },
  { id: 'security-audit', label: 'Security Audit', description: 'Vulnerability detection & OWASP' },
  { id: 'performance', label: 'Performance', description: 'Profiling & optimization tips' },
];

const fieldClass =
  'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const EditTeamPage: React.FC = () => {
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();

  // Pre-populated mock values — replace with real data from VSCode state
  const [name, setName] = useState(teamId ?? '');
  const [description, setDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedKits, setSelectedKits] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const toggleAgent = (id: string) =>
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const toggleKit = (id: string) =>
    setSelectedKits((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) setTags((prev) => [...prev, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleSave = () => {
    vscode.postMessage({
      type: 'saveTeam',
      teamId,
      name,
      description,
      agents: selectedAgents,
      kits: selectedKits,
      tags,
    } as any);
  };

  const handleDelete = () => {
    vscode.postMessage({ type: 'deleteTeam', teamId } as any);
    navigate(-1);
  };

  const isValid = name.trim().length > 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            Edit Team
          </h1>
          <p className="text-sm text-muted-foreground">
            Update team members, kit bundles, and configuration
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: Form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
              <CardDescription>Name and purpose of this team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="team-name">Team Name *</Label>
                <Input
                  id="team-name"
                  placeholder="e.g. Frontend Quality Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="team-description">Description</Label>
                <textarea
                  id="team-description"
                  rows={3}
                  placeholder="What is this team responsible for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={cn(fieldClass, 'py-2 resize-none')}
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label htmlFor="team-tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="team-tags"
                    placeholder="e.g. frontend, quality…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1.5 pl-2">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
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

          {/* Agent selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Team Members
              </CardTitle>
              <CardDescription>Select agents to include in this team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {AVAILABLE_AGENTS.map((agent) => {
                  const active = selectedAgents.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => toggleAgent(agent.id)}
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
                        <p className="text-sm font-medium leading-none">{agent.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{agent.role}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Kit selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Shared Kit Bundles
              </CardTitle>
              <CardDescription>Kits applied to all agents in this team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {AVAILABLE_KITS.map((kit) => {
                  const active = selectedKits.includes(kit.id);
                  return (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => toggleKit(kit.id)}
                      className={cn(
                        'flex items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent',
                        active ? 'border-primary bg-primary/5' : 'border-border bg-transparent',
                      )}
                    >
                      <Package
                        className={cn(
                          'h-4 w-4 mt-0.5 shrink-0',
                          active ? 'text-primary' : 'text-muted-foreground',
                        )}
                      />
                      <div>
                        <p className="text-sm font-medium leading-none">{kit.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{kit.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Summary + actions */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
              <CardDescription>Team configuration overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">{name || 'Unnamed Team'}</span>
                </div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{selectedAgents.length} agents</span>
                  <span>•</span>
                  <span>{selectedKits.length} kits</span>
                </div>
              </div>

              {selectedAgents.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Members ({selectedAgents.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAgents.map((id) => {
                        const agent = AVAILABLE_AGENTS.find((a) => a.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {agent?.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {selectedKits.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Kits ({selectedKits.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedKits.map((id) => {
                        const kit = AVAILABLE_KITS.find((k) => k.id === id);
                        return (
                          <Badge key={id} variant="outline" className="text-xs">
                            {kit?.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={!isValid} onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Separator />
            <Button variant="destructive" className="w-full" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Team
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTeamPage;
