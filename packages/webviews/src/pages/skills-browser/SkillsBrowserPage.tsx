import { SkillsBrowserView } from './components/SkillsBrowserView';
import { useSkillsBrowserLogic } from './useSkillsBrowserLogic';

const SkillsBrowserPage: React.FC = () => {
  const model = useSkillsBrowserLogic();
  return <SkillsBrowserView model={model} />;
};

export default SkillsBrowserPage;
