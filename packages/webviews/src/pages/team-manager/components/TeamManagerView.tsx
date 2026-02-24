import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Plus, Settings, Users2 } from 'lucide-react';
import type { useTeamManagerLogic } from '../useTeamManagerLogic';

type TeamManagerViewProps = {
  model: ReturnType<typeof useTeamManagerLogic>;
};

export const TeamManagerView: React.FC<TeamManagerViewProps> = ({ model }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Teams</h2>
          <p className="text-sm text-muted-foreground">
            Organize agents into teams for better workflow management
          </p>
        </div>
        <Button onClick={() => model.navigate('/create-team')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      {model.teams.length > 0 ? (
        <div className="grid gap-4">
          {model.teams.map((team) => (
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
                  <Badge variant="secondary">{team.id}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>
                      {team.enabledAgentsCount !== undefined
                        ? `${team.enabledAgentsCount} selected agents`
                        : 'Selected agents not specified'}
                    </span>
                    {team.enablesAllAgents && (
                      <>
                        <span>•</span>
                        <span>All agents enabled</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => model.navigate(`/edit-team/${team.id}`)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
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
            <Users2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No teams yet</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Create your first team to organize your agents
            </p>
            <Button onClick={() => model.navigate('/create-team')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
