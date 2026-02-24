import { ContextPacksCard } from './components/ContextPacksCard';
import { useContextPacksLogic } from './useContextPacksLogic';

const ContextPacksPage: React.FC = () => {
  const model = useContextPacksLogic();

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <ContextPacksCard model={model} />
    </div>
  );
};

export default ContextPacksPage;
