import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent } from '@/components/ui';
import { ContextPacksActions } from './components/ContextPacksActions';
import { ContextPacksCreatePack } from './components/ContextPacksCreatePack';
import { ContextPacksHeader } from './components/ContextPacksHeader';
import { ContextPacksList } from './components/ContextPacksList';
import { useContextPacksLogic } from './useContextPacksLogic';

const ContextPacksPage: React.FC = () => {
  const model = useContextPacksLogic();
  return (
    <div className='mx-auto max-w-4xl space-y-6 animate-fade-in'>
      <PageTitle
        title='Context Packs'
        description='Manage your context packs to provide additional information and capabilities to your agents.'
      />
      <Card>
        <ContextPacksHeader onRefresh={model.refresh} agentsMdBudget={model.agentsMdBudget} />
        <CardContent className='space-y-4'>
          {model.error && <p className='text-sm text-destructive'>{model.error}</p>}
          {model.status && <p className='text-sm text-muted-foreground'>{model.status}</p>}

          <ContextPacksList
            packs={model.allPackItems}
            selectedPacks={model.selectedPacks}
            onTogglePack={model.togglePack}
            onPriorityChange={model.updatePackPriority}
          />

          <ContextPacksCreatePack
            newPackName={model.newPackName}
            onNameChange={model.setNewPackName}
            newPackPriority={model.newPackPriority}
            onPriorityChange={model.setNewPackPriority}
            onCreate={model.createPack}
          />

          <ContextPacksActions
            isSaving={model.isSaving}
            isImporting={model.isImporting}
            onImportMd={model.importMd}
            onSave={model.saveSelection}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ContextPacksPage;
