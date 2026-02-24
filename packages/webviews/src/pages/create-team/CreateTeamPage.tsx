import { CreateTeamView } from './components/CreateTeamView';
import { useCreateTeamLogic } from './useCreateTeamLogic';

const CreateTeamPage: React.FC = () => {
  const model = useCreateTeamLogic();
  return <CreateTeamView model={model} />;
};

export default CreateTeamPage;
