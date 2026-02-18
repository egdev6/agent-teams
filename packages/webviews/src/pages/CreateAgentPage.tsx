/**
 * CreateAgentPage
 * Mockup for creating a new agent with all relevant fields and a live preview.
 */
import { AgentCard } from '@components/shared/AgentCard';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Separator } from '@components/ui/separator';
import { cn } from '@lib/utils';
import { vscode } from '@lib/vscode';
import {
  ArrowLeft,
  Bot,
  ExternalLink,
  Package,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AGENT_ROLES = [
  'code-reviewer',
  'architect',
  'debugger',
  'documenter',
  'tester',
  'refactor',
  'security',
  'custom',
] as const;

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

// Shared input/textarea/select style consistent with shadcn Input
const fieldClass =
  'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const CreateAgentPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('');
  const [description, setDescription] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedKits, setSelectedKits] = useState<string[]>([]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => setSkills((prev) => prev.filter((s) => s !== skill));

  const toggleKit = (id: string) =>
    setSelectedKits((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));

  const handleCreate = () => {
    vscode.postMessage({
      type: 'createAgent',
      name,
      role,
      description,
      skills,
      kits: selectedKits,
    } as any);
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
            <Bot className="h-5 w-5 text-primary" />
            Create New Agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure your agent's identity, skills, and kit bundles
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agent-role">Role</Label>
                <select
                  id="agent-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={cn(fieldClass, 'h-9')}
                >
                  <option value="">Select a role…</option>
                  {AGENT_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={cn(fieldClass, 'py-2 resize-none')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Skills
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>Custom instructions or capabilities added to this agent</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => navigate('/skills-browser')}
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
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={addSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1.5 pl-2">
                      <Tag className="h-3 w-3" />
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {skills.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No skills added yet. Press Enter or click + to add one.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Kit selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Kit Bundles
              </CardTitle>
              <CardDescription>
                Select pre-built kits to extend this agent's capabilities
              </CardDescription>
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

        {/* RIGHT: Preview + actions */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>How this agent will appear in your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AgentCard
                id="preview"
                name={name || 'Unnamed Agent'}
                role={role || undefined}
                description={description || undefined}
                status="inactive"
              />

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

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={!isValid} onClick={handleCreate}>
              <Bot className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAgentPage;
