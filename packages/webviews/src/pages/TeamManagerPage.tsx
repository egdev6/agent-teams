import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
/**
 * Team Manager Page
 * Manage teams and their configurations
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Plus, Settings, Trash2, Users2 } from 'lucide-react';

const TeamManagerPage: React.FC = () => {
  // Mock teams data
  const teams = [
    {
      id: 'testing-team',
      name: 'Testing Team',
      description: 'Automated testing and validation',
      agents: 5,
      kits: ['testing-vitest'],
      status: 'active' as const,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Teams</h2>
          <p className="text-sm text-muted-foreground">
            Organize agents into teams for better workflow management
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      {/* Teams List */}
      {teams.length > 0 ? (
        <div className="grid gap-4">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Users2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{team.name}</CardTitle>
                      <CardDescription>{team.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>
                    {team.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{team.agents} agents</span>
                    <span>•</span>
                    <span>{team.kits.length} kits</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
                    </Button>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first team to organize your agents
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamManagerPage;
