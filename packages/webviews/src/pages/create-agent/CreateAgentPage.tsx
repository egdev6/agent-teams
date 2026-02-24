import { CreateAgentView } from './components/CreateAgentView';
import { useCreateAgentLogic } from './useCreateAgentLogic';

const CreateAgentPage: React.FC = () => {
  const model = useCreateAgentLogic();
  return <CreateAgentView model={model} />;
};

export default CreateAgentPage;
