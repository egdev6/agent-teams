import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { ChevronRight } from 'lucide-react';
import type { TeamSummary } from '../../../types';

type TeamContextCardProps = {
  teams: TeamSummary[];
  activeTeamId: string | null;
  teamContext: 'no_teams' | 'no_active_team' | 'active_team';
  onSetActiveTeam: (teamId: string | null) => void;
  onManageTeams: () => void;
};

export const TeamContextCard: React.FC<TeamContextCardProps> = ({
  teams,
  activeTeamId,
  teamContext,
  onSetActiveTeam,
  onManageTeams,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team Context</CardTitle>
        <CardDescription>
          Selecciona un team activo para habilitar creación y navegación contextual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <select
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={activeTeamId ?? ''}
          onChange={(event) => onSetActiveTeam(event.target.value ? event.target.value : null)}
        >
          <option value="">{teams.length === 0 ? 'No teams yet' : 'Selecciona un equipo'}</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} ({team.id})
            </option>
          ))}
        </select>

        {teamContext === 'no_teams' && (
          <div className="flex items-center justify-between rounded-md border p-3">
            <p className="text-sm">Crea un equipo para empezar.</p>
            <Button size="sm" variant="outline" onClick={onManageTeams}>
              Manage Teams
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {teamContext === 'no_active_team' && (
          <p className="text-sm text-muted-foreground">Selecciona un equipo para continuar.</p>
        )}
      </CardContent>
    </Card>
  );
};
