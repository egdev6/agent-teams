import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@components/ui/tabs';
import { useEffect } from 'react';
import type {
  AgentMcpServerForm,
  AgentPermissions,
  AgentSkillRef,
  AgentTool,
  CatalogSkillEntry,
  OutputTemplateId,
} from '../../models';
import { IdentityStep } from './components/steps/IdentityStep';
import { OutputContextStep } from './components/steps/OutputContextStep';
import { RulesStep } from './components/steps/RulesStep';
import { ScopeStep } from './components/steps/ScopeStep';
import { SkillsStep } from './components/steps/SkillsStep';
import { WorkflowToolsStep } from './components/steps/WorkflowToolsStep';
import { STEP_LABELS } from './constants';

export type AgentWizardCardProps = {
  // Step 0 - Identity
  name: string;
  setName: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  domain: string;
  setDomain: (v: string) => void;
  subdomain: string;
  setSubdomain: (v: string) => void;
  // Step 1 - Scope
  expertise: string[];
  setExpertise: (v: string[]) => void;
  intents: string[];
  setIntents: (v: string[]) => void;
  scopeTopics: string[];
  setScopeTopics: (v: string[]) => void;
  scopeGlobs: string;
  setScopeGlobs: (v: string) => void;
  scopeExcludes: string[];
  setScopeExcludes: (v: string[]) => void;
  // Step 2 - Workflow & Tools
  workflowSteps: string[];
  setWorkflowSteps: (v: string[]) => void;
  tools: AgentTool[];
  setTools: (v: AgentTool[]) => void;
  lockedToolNames?: ReadonlySet<string>;
  mcpServers: AgentMcpServerForm[];
  setMcpServers: (v: AgentMcpServerForm[]) => void;
  // Step 3 - Skills
  skills: AgentSkillRef[];
  catalogSkills: CatalogSkillEntry[];
  addSkill: (entry: CatalogSkillEntry) => void;
  removeSkill: (id: string) => void;
  updateSkill: (id: string, patch: Partial<AgentSkillRef>) => void;
  onInstallCatalogSkill: (skillId: string) => void;
  onBrowseRegistry: () => void;
  // Step 4 - Rules
  permissions: AgentPermissions;
  setPermissions: (v: AgentPermissions) => void;
  constraintsAlways: string[];
  setConstraintsAlways: (v: string[]) => void;
  constraintsNever: string[];
  setConstraintsNever: (v: string[]) => void;
  constraintsEscalate: string[];
  setConstraintsEscalate: (v: string[]) => void;
  receivesFrom: string[];
  setReceivesFrom: (v: string[]) => void;
  delegatesTo: string[];
  setDelegatesTo: (v: string[]) => void;
  escalatesTo: string[];
  setEscalatesTo: (v: string[]) => void;
  engramConfigured?: boolean;
  engramAutonomous?: boolean;
  setEngramAutonomous?: (v: boolean) => void;
  // Step 5 - Output & Context
  outputTemplate: OutputTemplateId;
  setOutputTemplate: (v: OutputTemplateId) => void;
  outputMode: 'short' | 'detailed';
  setOutputMode: (v: 'short' | 'detailed') => void;
  outputMaxItems: number;
  setOutputMaxItems: (v: number) => void;
  outputNeverInclude: string[];
  setOutputNeverInclude: (v: string[]) => void;
  outputFormatInstructions: string;
  setOutputFormatInstructions: (v: string) => void;
  contextPacks: string[];
  availableContextPacks: string[];
  onToggleContextPack: (packId: string) => void;
  onGoToContextPacks?: () => void;
  targets: string[];
  setTargets: (v: string[]) => void;
  // Navigation
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isConfigurationEnabled: boolean;
};

const STEP_TAB_VALUES = ['identity', 'scope', 'workflow', 'skills', 'rules', 'output'] as const;
type StepTabValue = (typeof STEP_TAB_VALUES)[number];

/** Steps hidden when role is `router` (Scope=1, Skills=3). */
const ROUTER_HIDDEN_STEPS = new Set([1, 3]);

export const AgentWizardCard: React.FC<AgentWizardCardProps> = ({
  name,
  setName,
  role,
  setRole,
  description,
  setDescription,
  domain,
  setDomain,
  subdomain,
  setSubdomain,
  expertise,
  setExpertise,
  intents,
  setIntents,
  scopeTopics,
  setScopeTopics,
  scopeGlobs,
  setScopeGlobs,
  scopeExcludes,
  setScopeExcludes,
  workflowSteps,
  setWorkflowSteps,
  tools,
  setTools,
  lockedToolNames,
  mcpServers,
  setMcpServers,
  skills,
  catalogSkills,
  addSkill,
  removeSkill,
  updateSkill,
  onInstallCatalogSkill,
  onBrowseRegistry,
  permissions,
  setPermissions,
  constraintsAlways,
  setConstraintsAlways,
  constraintsNever,
  setConstraintsNever,
  constraintsEscalate,
  setConstraintsEscalate,
  receivesFrom,
  setReceivesFrom,
  delegatesTo,
  setDelegatesTo,
  escalatesTo,
  setEscalatesTo,
  engramConfigured,
  engramAutonomous,
  setEngramAutonomous,
  outputTemplate,
  setOutputTemplate,
  outputMode,
  setOutputMode,
  outputMaxItems,
  setOutputMaxItems,
  outputNeverInclude,
  setOutputNeverInclude,
  outputFormatInstructions,
  setOutputFormatInstructions,
  contextPacks,
  availableContextPacks,
  onToggleContextPack,
  onGoToContextPacks,
  targets,
  setTargets,
  currentStep,
  setCurrentStep,
  isConfigurationEnabled,
}) => {
  const isRouter = role === 'router';
  const visibleStepIndices = STEP_TAB_VALUES.reduce<number[]>((acc, _, i) => {
    if (!isRouter || !ROUTER_HIDDEN_STEPS.has(i)) acc.push(i);
    return acc;
  }, []);

  // When switching to router, jump off any hidden step.
  useEffect(() => {
    if (isRouter && ROUTER_HIDDEN_STEPS.has(currentStep)) {
      const prev = [...visibleStepIndices].filter((s) => s < currentStep).pop() ?? 0;
      setCurrentStep(prev);
    }
  }, [isRouter, currentStep, visibleStepIndices, setCurrentStep]);

  const tabValue: StepTabValue = STEP_TAB_VALUES[currentStep] ?? 'identity';

  const visiblePosition = visibleStepIndices.indexOf(currentStep);
  const displayPosition = visiblePosition >= 0 ? visiblePosition + 1 : 1;
  const displayTotal = visibleStepIndices.length;

  const handleStepChange = (value: string) => {
    const index = STEP_TAB_VALUES.indexOf(value as StepTabValue);
    if (index === 0) {
      setCurrentStep(0);
      return;
    }
    if (!isConfigurationEnabled) return;
    if (index >= 0) setCurrentStep(index);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Agent Wizard</CardTitle>
        <CardDescription>
          Step {displayPosition} of {displayTotal}: {STEP_LABELS[currentStep]}
        </CardDescription>
        <Tabs value={tabValue} onValueChange={handleStepChange} className='pt-1 w-full'>
          <TabsList className='w-full flex gap-1'>
            {STEP_TAB_VALUES.map((value, index) => {
              if (isRouter && ROUTER_HIDDEN_STEPS.has(index)) return null;
              const visibleIdx = visibleStepIndices.indexOf(index);
              return (
                <TabsTrigger
                  key={value}
                  value={value}
                  disabled={visibleIdx > 0 && !isConfigurationEnabled}
                  className='flex-1 text-xs'
                >
                  {visibleIdx + 1}. {STEP_LABELS[index]}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className='space-y-4'>
        {currentStep === 0 && (
          <IdentityStep
            name={name}
            setName={setName}
            role={role}
            setRole={setRole}
            description={description}
            setDescription={setDescription}
            domain={domain}
            setDomain={setDomain}
            subdomain={subdomain}
            setSubdomain={setSubdomain}
          />
        )}

        {currentStep === 1 && (
          <ScopeStep
            role={role}
            expertise={expertise}
            setExpertise={setExpertise}
            intents={intents}
            setIntents={setIntents}
            scopeTopics={scopeTopics}
            setScopeTopics={setScopeTopics}
            scopeGlobs={scopeGlobs}
            setScopeGlobs={setScopeGlobs}
            scopeExcludes={scopeExcludes}
            setScopeExcludes={setScopeExcludes}
          />
        )}

        {currentStep === 2 && (
          <WorkflowToolsStep
            role={role}
            workflowSteps={workflowSteps}
            setWorkflowSteps={setWorkflowSteps}
            tools={tools}
            setTools={setTools}
            lockedToolNames={lockedToolNames}
            mcpServers={mcpServers}
            setMcpServers={setMcpServers}
          />
        )}

        {currentStep === 3 && (
          <SkillsStep
            skills={skills}
            catalogSkills={catalogSkills}
            addSkill={addSkill}
            removeSkill={removeSkill}
            updateSkill={updateSkill}
            onInstallCatalogSkill={onInstallCatalogSkill}
            onBrowseRegistry={onBrowseRegistry}
          />
        )}

        {currentStep === 4 && (
          <RulesStep
            role={role}
            permissions={permissions}
            setPermissions={setPermissions}
            constraintsAlways={constraintsAlways}
            setConstraintsAlways={setConstraintsAlways}
            constraintsNever={constraintsNever}
            setConstraintsNever={setConstraintsNever}
            constraintsEscalate={constraintsEscalate}
            setConstraintsEscalate={setConstraintsEscalate}
            receivesFrom={receivesFrom}
            setReceivesFrom={setReceivesFrom}
            delegatesTo={delegatesTo}
            setDelegatesTo={setDelegatesTo}
            escalatesTo={escalatesTo}
            setEscalatesTo={setEscalatesTo}
            engramConfigured={engramConfigured}
            engramAutonomous={engramAutonomous}
            setEngramAutonomous={setEngramAutonomous}
          />
        )}

        {currentStep === 5 && (
          <OutputContextStep
            role={role}
            outputTemplate={outputTemplate}
            setOutputTemplate={setOutputTemplate}
            outputMode={outputMode}
            setOutputMode={setOutputMode}
            outputMaxItems={outputMaxItems}
            setOutputMaxItems={setOutputMaxItems}
            outputNeverInclude={outputNeverInclude}
            setOutputNeverInclude={setOutputNeverInclude}
            outputFormatInstructions={outputFormatInstructions}
            setOutputFormatInstructions={setOutputFormatInstructions}
            contextPacks={contextPacks}
            availableContextPacks={availableContextPacks}
            onToggleContextPack={onToggleContextPack}
            onGoToContextPacks={onGoToContextPacks}
            targets={targets}
            setTargets={setTargets}
          />
        )}
      </CardContent>
    </Card>
  );
};
