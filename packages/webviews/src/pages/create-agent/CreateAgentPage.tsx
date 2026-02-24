import { AgentWizardCard } from '../agent-wizard/AgentWizardCard';
import { CreateAgentActions } from './components/CreateAgentActions';
import { CreateAgentHeader } from './components/CreateAgentHeader';
import { CreateAgentPreviewCard } from './components/CreateAgentPreviewCard';
import { useCreateAgentLogic } from './useCreateAgentLogic';

const CreateAgentPage: React.FC = () => {
  const model = useCreateAgentLogic();
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <CreateAgentHeader onBack={() => model.navigate(-1)} />

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
          <CreateAgentPreviewCard
            name={model.name}
            role={model.role}
            description={model.description}
          />
          <CreateAgentActions
            createError={model.createError}
            isValid={model.isValid}
            isSaving={model.isSaving}
            onCreate={model.handleCreate}
            onDiscard={() => model.navigate(-1)}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateAgentPage;
