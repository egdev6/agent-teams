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
            setName={model.setName}
            role={model.role}
            setRole={model.setRole}
            description={model.description}
            setDescription={model.setDescription}
            domain={model.domain}
            setDomain={model.setDomain}
            subdomain={model.subdomain}
            setSubdomain={model.setSubdomain}
            expertise={model.expertise}
            setExpertise={model.setExpertise}
            intents={model.intents}
            setIntents={model.setIntents}
            scopeTopics={model.scopeTopics}
            setScopeTopics={model.setScopeTopics}
            scopeGlobs={model.scopeGlobs}
            setScopeGlobs={model.setScopeGlobs}
            scopeExcludes={model.scopeExcludes}
            setScopeExcludes={model.setScopeExcludes}
            workflowSteps={model.workflowSteps}
            setWorkflowSteps={model.setWorkflowSteps}
            tools={model.tools}
            setTools={model.setTools}
            lockedToolNames={model.lockedToolNames}
            mcpServers={model.mcpServers}
            setMcpServers={model.setMcpServers}
            skills={model.skills}
            catalogSkills={model.catalogSkills}
            addSkill={model.addSkill}
            removeSkill={model.removeSkill}
            updateSkill={model.updateSkill}
            onInstallCatalogSkill={model.onInstallCatalogSkill}
            onBrowseRegistry={() => model.navigate('/skills-browser')}
            permissions={model.permissions}
            setPermissions={model.setPermissions}
            constraintsAlways={model.constraintsAlways}
            setConstraintsAlways={model.setConstraintsAlways}
            constraintsNever={model.constraintsNever}
            setConstraintsNever={model.setConstraintsNever}
            constraintsEscalate={model.constraintsEscalate}
            setConstraintsEscalate={model.setConstraintsEscalate}
            receivesFrom={model.receivesFrom}
            setReceivesFrom={model.setReceivesFrom}
            delegatesTo={model.delegatesTo}
            setDelegatesTo={model.setDelegatesTo}
            escalatesTo={model.escalatesTo}
            setEscalatesTo={model.setEscalatesTo}
            engramConfigured={model.engramConfigured}
            engramAutonomous={model.engramAutonomous}
            setEngramAutonomous={model.setEngramAutonomous}
            outputTemplate={model.outputTemplate}
            setOutputTemplate={model.setOutputTemplate}
            outputMode={model.outputMode}
            setOutputMode={model.setOutputMode}
            outputMaxItems={model.outputMaxItems}
            setOutputMaxItems={model.setOutputMaxItems}
            outputNeverInclude={model.outputNeverInclude}
            setOutputNeverInclude={model.setOutputNeverInclude}
            outputFormatInstructions={model.outputFormatInstructions}
            setOutputFormatInstructions={model.setOutputFormatInstructions}
            contextPacks={model.contextPacks}
            availableContextPacks={model.availableContextPacks}
            onToggleContextPack={model.toggleContextPack}
            onGoToContextPacks={() => model.navigate('/context-packs')}
            targets={model.targets}
            setTargets={model.setTargets}
            currentStep={model.currentStep}
            setCurrentStep={model.setCurrentStep}
            isConfigurationEnabled={model.isConfigurationEnabled}
          />
        </div>

        <div>
          <div className='sticky top-18 flex flex-col gap-4'>
            <EditAgentPreviewCard
              agentId={model.agentId}
              name={model.name}
              role={model.role}
              description={model.description}
              intents={model.intents}
              teamIds={model.assignedTeamIds}
            />
            <EditAgentActions
              saveError={model.saveError}
              isValid={model.isValid}
              isSaving={model.isSaving}
              saveDisabledReason={model.saveDisabledReason}
              isDeleteDisabled={model.isAssignedToAnyTeam}
              isDeleting={model.isDeleting}
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
