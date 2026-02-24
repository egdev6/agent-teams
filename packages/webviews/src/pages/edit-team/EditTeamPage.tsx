import { EditTeamView } from './components/EditTeamView';
import { useEditTeamLogic } from './useEditTeamLogic';

const EditTeamPage: React.FC = () => {
  const model = useEditTeamLogic();
  return <EditTeamView model={model} />;
};

export default EditTeamPage;
