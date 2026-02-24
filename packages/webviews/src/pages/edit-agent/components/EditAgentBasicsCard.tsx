import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';

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

type EditAgentBasicsCardProps = {
  name: string;
  role: string;
  description: string;
  setName: (value: string) => void;
  setRole: (value: string) => void;
  setDescription: (value: string) => void;
};

export const EditAgentBasicsCard: React.FC<EditAgentBasicsCardProps> = ({
  name,
  role,
  description,
  setName,
  setRole,
  setDescription,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Basic Information</CardTitle>
        <CardDescription>Name and role define how this agent shows up in teams</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="agent-name">Agent Name *</Label>
          <Input
            id="agent-name"
            placeholder="e.g. Code Reviewer Bot"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agent-role">Role</Label>
          <select
            id="agent-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className={cn(fieldClass, 'h-9')}
          >
            <option value="">Select a role…</option>
            {AGENT_ROLES.map((item) => (
              <option key={item.value} value={item.value} title={item.description}>
                {item.label}
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
            onChange={(event) => setDescription(event.target.value)}
            className={cn(fieldClass, 'resize-none py-2')}
          />
        </div>
      </CardContent>
    </Card>
  );
};
