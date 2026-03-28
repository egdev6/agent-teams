import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { SkillsBrowserCatalogCard } from './components/SkillsBrowserCatalogCard';
import { SkillsBrowserCommunityCard } from './components/SkillsBrowserCommunityCard';
import { SkillsBrowserFiltersCard } from './components/SkillsBrowserFiltersCard';
import { SkillsBrowserFooter } from './components/SkillsBrowserFooter';
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

      <Tabs defaultValue='project' className='w-full'>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='project'>Project Skills</TabsTrigger>
          <TabsTrigger value='explore'>Explore Skills</TabsTrigger>
        </TabsList>

        <TabsContent value='project' className='space-y-4'>
          <SkillsBrowserFiltersCard
            query={model.query}
            activeCategory={model.activeCategory}
            categories={model.skillCategories}
            onQueryChange={model.setQuery}
            onCategoryChange={model.setActiveCategory}
          />
          <SkillsBrowserCatalogCard
            skills={model.filtered}
            deletingSkillId={model.deletingSkillId}
            onDeleteSkill={model.handleDeleteSkill}
          />
        </TabsContent>

        <TabsContent value='explore'>
          <SkillsBrowserCommunityCard
            community={model.community}
            onQueryChange={model.setCommunityQuery}
            onSearch={() => model.searchCommunity(1)}
            onGoToPage={model.searchCommunity}
            onInstall={model.installCommunitySkill}
            onOpenExternal={model.openSkillPage}
          />
        </TabsContent>
      </Tabs>

      <SkillsBrowserFooter
        filteredCount={model.filtered.length}
        totalCount={model.skillsRegistry.length}
      />
    </div>
  );
};

export default SkillsBrowserPage;
