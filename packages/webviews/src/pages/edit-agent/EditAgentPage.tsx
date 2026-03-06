import { PageTitle } from '@/components/shared/PageTitle';
import { AgentWizardCard } from '../agent-wizard/AgentWizardCard';
import { EditAgentActions } from './components/EditAgentActions';
import { EditAgentPreviewCard } from './components/EditAgentPreviewCard';
import { useEditAgentLogic } from './useEditAgentLogic';

const EditAgentPage: React.FC = () => {
  const model = useEditAgentLogic();
  return (
    <div className='mx-auto max-w-4xl space-y-6 animate-fade-in'>
      <PageTitle
        title='Edit Agent'
        description='Modify the settings and configurations of your agent.'
      />

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          <AgentWizardCard
            name={model.name}
            role={model.role}
            description={model.description}
            domain={model.domain}
            subdomainsText={model.subdomainsText}
            intentsText={model.intentsText}
            pathGlobsText={model.pathGlobsText}
            keywordsText={model.keywordsText}
            outputMode={model.outputMode}
            maxFiles={model.maxFiles}
            maxCharsPerFile={model.maxCharsPerFile}
            delegationEnabled={model.delegationEnabled}
            delegationStrategy={model.delegationStrategy}
            maxHandoffs={model.maxHandoffs}
            routeTaskRules={model.routeTaskRules}
            setRouteTaskRules={model.setRouteTaskRules}
            orchestratorPlanning={model.orchestratorPlanning}
            setOrchestratorPlanning={model.setOrchestratorPlanning}
            orchestratorMaxTokens={model.orchestratorMaxTokens}
            setOrchestratorMaxTokens={model.setOrchestratorMaxTokens}
            orchestratorCapabilities={model.orchestratorCapabilities}
            setOrchestratorCapabilities={model.setOrchestratorCapabilities}
            routerCapabilities={model.routerCapabilities}
            setRouterCapabilities={model.setRouterCapabilities}
            workerMaxTokens={model.workerMaxTokens}
            setWorkerMaxTokens={model.setWorkerMaxTokens}
            workerExecutionEnabled={model.workerExecutionEnabled}
            setWorkerExecutionEnabled={model.setWorkerExecutionEnabled}
            workerCapabilities={model.workerCapabilities}
            setWorkerCapabilities={model.setWorkerCapabilities}
            availableTargetAgents={model.availableTargetAgents}
            currentStep={model.currentStep}
            isConfigurationEnabled={model.isConfigurationEnabled}
            setName={model.setName}
            setRole={model.setRole}
            setDescription={model.setDescription}
            setDomain={model.setDomain}
            setSubdomainsText={model.setSubdomainsText}
            setIntentsText={model.setIntentsText}
            setPathGlobsText={model.setPathGlobsText}
            setKeywordsText={model.setKeywordsText}
            skillUses={model.skillUses}
            catalogSkills={model.catalogSkills}
            addSkillUse={model.addSkillUse}
            removeSkillUse={model.removeSkillUse}
            updateSkillUse={model.updateSkillUse}
            onInstallCatalogSkill={model.onInstallCatalogSkill}
            setOutputMode={model.setOutputMode}
            setMaxFiles={model.setMaxFiles}
            setMaxCharsPerFile={model.setMaxCharsPerFile}
            setDelegationEnabled={model.setDelegationEnabled}
            setDelegationStrategy={model.setDelegationStrategy}
            setMaxHandoffs={model.setMaxHandoffs}
            onBrowseRegistry={() => model.navigate('/skills-browser')}
            setCurrentStep={model.setCurrentStep}
            nextStep={model.nextStep}
            prevStep={model.prevStep}
            contextPacks={model.contextPacks}
            availableContextPacks={model.availableContextPacks}
            onToggleContextPack={model.toggleContextPack}
            onGoToContextPacks={() => model.navigate('/context-packs')}
          />
        </div>

        <div>
          <div className='sticky top-18 flex flex-col gap-4'>
            <EditAgentPreviewCard
              agentId={model.agentId}
              name={model.name}
              role={model.role}
              description={model.description}
            />
            <EditAgentActions
              saveError={model.saveError}
              isValid={model.isValid}
              isSaving={model.isSaving}
              isDeleteDisabled={model.isAssignedToAnyTeam}
              deleteDisabledReason={model.deleteDisabledReason}
              onSave={model.handleSave}
              onCancel={() => model.navigate(-1)}
              onDelete={model.handleDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAgentPage;
