import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent } from '@/components/ui';
import { SkillsBrowserCommunityCard } from './components/SkillsBrowserCommunityCard';
import { SkillsBrowserFiltersCard } from './components/SkillsBrowserFiltersCard';
import { SkillsBrowserFooter } from './components/SkillsBrowserFooter';
import { SkillsBrowserList } from './components/SkillsBrowserList';
import { SkillsBrowserStatsGrid } from './components/SkillsBrowserStatsGrid';
import { useSkillsBrowserLogic } from './useSkillsBrowserLogic';

const SkillsBrowserPage: React.FC = () => {
  const model = useSkillsBrowserLogic();
  return (
    <div className='mx-auto max-w-4xl space-y-6 animate-fade-in'>
      <PageTitle
        title='Skills Browser'
        description='Explore and manage the skills available for your agents.'
      />

      {model.error && (
        <Card className='border-red-500/30'>
          <CardContent className='pt-4 text-sm text-red-500'>{model.error}</CardContent>
        </Card>
      )}

      <SkillsBrowserFiltersCard
        query={model.query}
        activeCategory={model.activeCategory}
        categories={model.skillCategories}
        onQueryChange={model.setQuery}
        onCategoryChange={model.setActiveCategory}
        onRefresh={model.refreshCatalog}
      />

      <SkillsBrowserStatsGrid
        skillsRegistry={model.skillsRegistry}
        installedIds={model.installedIds}
        onCategorySelect={model.setActiveCategory}
      />

      <SkillsBrowserCommunityCard
        community={model.community}
        onQueryChange={model.setCommunityQuery}
        onSearch={model.searchCommunity}
        onImportSource={model.importCommunitySource}
      />

      <SkillsBrowserList
        skills={model.filtered}
        installedIds={model.installedIds}
        onToggleInstall={model.handleInstall}
      />

      <SkillsBrowserFooter
        filteredCount={model.filtered.length}
        totalCount={model.skillsRegistry.length}
        onCreateAgent={() => model.navigate('/create-agent')}
      />
    </div>
  );
};

export default SkillsBrowserPage;
