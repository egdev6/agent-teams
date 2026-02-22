import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { FolderOpen, Plus, Settings, Trash2, Users, Users2 } from 'lucide-react';
import type { Agent } from '../../../types';

type AgentsListCardProps = {
  hasActiveTeam: boolean;
  activeTeamId: string | null;
  visibleAgents: Agent[];
  agents: Agent[];
  manageTeamsEnabled: boolean;
  manageTeamsReason?: string;
  createAgentEnabled: boolean;
  createAgentReason?: string;
  onManageTeams: () => void;
  onCreateAgent: () => void;
  onEditAgent: (agentId: string) => void;
};

export const AgentsListCard: React.FC<AgentsListCardProps> = ({
  hasActiveTeam,
  activeTeamId,
  visibleAgents,
  agents,
  manageTeamsEnabled,
  manageTeamsReason,
  createAgentEnabled,
  createAgentReason,
  onManageTeams,
  onCreateAgent,
  onEditAgent,
}) => {
  const disabledTooltip = (reason?: string) => reason || undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Agents</CardTitle>
            <CardDescription>
              {hasActiveTeam
                ? `Mostrando agentes del team: ${activeTeamId}`
                : 'Selecciona un team activo para ver agentes'}
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={onManageTeams}
            disabled={!manageTeamsEnabled}
            title={disabledTooltip(manageTeamsReason)}
          >
            <Users2 className="mr-2 h-4 w-4" />
            Manage Teams
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasActiveTeam ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin team activo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona un equipo para continuar.
            </p>
          </div>
        ) : visibleAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primer agente para este team
            </p>
            <Button
              onClick={onCreateAgent}
              disabled={!createAgentEnabled}
              title={disabledTooltip(createAgentReason)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{agent.name}</CardTitle>
                    <CardDescription>{agent.role}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEditAgent(agent.id)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
