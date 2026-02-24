import { TeamCard } from './components/TeamCard';
import { TeamEmptyState } from './components/TeamEmptyState';
import { TeamManagerHeader } from './components/TeamManagerHeader';
import { useTeamManagerLogic } from './useTeamManagerLogic';

const TeamManagerPage: React.FC = () => {
  const model = useTeamManagerLogic();
  return (
    <div className="space-y-6 animate-fade-in">
      <TeamManagerHeader onCreateTeam={() => model.navigate('/create-team')} />

      {model.teams.length > 0 ? (
        <div className="grid gap-4">
          {model.teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isActive={model.activeTeamId === team.id}
              onConfigure={(teamId) => model.navigate(`/edit-team/${teamId}`)}
            />
          ))}
        </div>
      ) : (
        <TeamEmptyState onCreateTeam={() => model.navigate('/create-team')} />
      )}
    </div>
  );
};

export default TeamManagerPage;
