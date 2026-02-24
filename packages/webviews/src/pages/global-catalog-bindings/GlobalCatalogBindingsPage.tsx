import { GlobalCatalogBindingsView } from './components/GlobalCatalogBindingsView';
import { useGlobalCatalogBindingsLogic } from './useGlobalCatalogBindingsLogic';

const GlobalCatalogBindingsPage: React.FC = () => {
  const model = useGlobalCatalogBindingsLogic();
  return <GlobalCatalogBindingsView model={model} />;
};

export default GlobalCatalogBindingsPage;
