import { AgentWizardCard } from '../../agent-wizard/AgentWizardCard';
import type { useEditAgentLogic } from '../useEditAgentLogic';
import { EditAgentActions } from './EditAgentActions';
import { EditAgentErrorState } from './EditAgentErrorState';
import { EditAgentHeader } from './EditAgentHeader';
import { EditAgentLoadingState } from './EditAgentLoadingState';
import { EditAgentPreviewCard } from './EditAgentPreviewCard';

type EditAgentViewProps = {
  model: ReturnType<typeof useEditAgentLogic>;
};

export const EditAgentView: React.FC<EditAgentViewProps> = ({ model }) => {
  if (model.isLoading) {
    return <EditAgentLoadingState />;
  }

  if (model.loadError) {
    return <EditAgentErrorState loadError={model.loadError} onBack={() => model.navigate(-1)} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <EditAgentHeader onBack={() => model.navigate(-1)} />

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
