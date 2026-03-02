import { Plus } from 'lucide-react';
import { PageTitle } from '@/components/shared/PageTitle';
import { TeamCard } from './components/TeamCard';
import { TeamEmptyState } from './components/TeamEmptyState';
import { useTeamManagerLogic } from './useTeamManagerLogic';

const TeamManagerPage: React.FC = () => {
  const model = useTeamManagerLogic();
  return (
    <div className='space-y-6 animate-fade-in'>
      <PageTitle
        title='Team Manager'
        description='Manage your teams and their assigned agents.'
        button={{
          label: 'Create Team',
          onClick: () => model.navigate('/create-team'),
          icon: Plus,
        }}
      />

      {model.teams.length > 0 ? (
        <div className='grid gap-4'>
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
