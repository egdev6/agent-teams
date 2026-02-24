import { TeamManagerView } from './components/TeamManagerView';
import { useTeamManagerLogic } from './useTeamManagerLogic';

const TeamManagerPage: React.FC = () => {
  const model = useTeamManagerLogic();
  return <TeamManagerView model={model} />;
};

export default TeamManagerPage;
