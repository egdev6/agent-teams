import { PageTitle } from '@/components/shared/PageTitle';
import { AgentWizardCard } from '../agent-wizard/AgentWizardCard';
import { EditAgentActions } from './components/EditAgentActions';
import { EditAgentPreviewCard } from './components/EditAgentPreviewCard';
import { useEditAgentLogic } from './useEditAgentLogic';

const EditAgentPage: React.FC = () => {
  const model = useEditAgentLogic();
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <PageTitle
        title="Edit Agent"
        description="Modify the settings and configurations of your agent."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AgentWizardCard
            name={model.name}
            role={model.role}
            description={model.description}
            domain={model.domain}
            subdomainsText={model.subdomainsText}
            intentsText={model.intentsText}
            pathGlobsText={model.pathGlobsText}
            keywordsText={model.keywordsText}
            skillInput={model.skillInput}
            skills={model.skills}
            outputMode={model.outputMode}
            maxFiles={model.maxFiles}
            maxCharsPerFile={model.maxCharsPerFile}
            delegationEnabled={model.delegationEnabled}
            delegationStrategy={model.delegationStrategy}
            maxHandoffs={model.maxHandoffs}
            allowedSubagentsText={model.allowedSubagentsText}
            currentStep={model.currentStep}
            setName={model.setName}
            setRole={model.setRole}
            setDescription={model.setDescription}
            setDomain={model.setDomain}
            setSubdomainsText={model.setSubdomainsText}
            setIntentsText={model.setIntentsText}
            setPathGlobsText={model.setPathGlobsText}
            setKeywordsText={model.setKeywordsText}
            setSkillInput={model.setSkillInput}
            addSkill={model.addSkill}
            toggleQuickSkill={model.toggleQuickSkill}
            removeSkill={model.removeSkill}
            setOutputMode={model.setOutputMode}
            setMaxFiles={model.setMaxFiles}
            setMaxCharsPerFile={model.setMaxCharsPerFile}
            setDelegationEnabled={model.setDelegationEnabled}
            setDelegationStrategy={model.setDelegationStrategy}
            setMaxHandoffs={model.setMaxHandoffs}
            setAllowedSubagentsText={model.setAllowedSubagentsText}
            onBrowseRegistry={() => model.navigate('/skills-browser')}
            setCurrentStep={model.setCurrentStep}
            nextStep={model.nextStep}
            prevStep={model.prevStep}
          />
        </div>

        <div className="space-y-4">
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
            onSave={model.handleSave}
            onCancel={() => model.navigate(-1)}
            onDelete={model.handleDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default EditAgentPage;
