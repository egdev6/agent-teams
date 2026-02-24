import { EditAgentView } from './components/EditAgentView';
import { useEditAgentLogic } from './useEditAgentLogic';

const EditAgentPage: React.FC = () => {
  const model = useEditAgentLogic();
  return <EditAgentView model={model} />;
};

export default EditAgentPage;
