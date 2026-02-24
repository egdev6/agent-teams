/* biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: wizard view intentionally contains role-based conditional sections */
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import { ChevronLeft, ChevronRight, ExternalLink, Plus, Sparkles, X } from 'lucide-react';
import {
  AGENT_ROLES,
  DOMAIN_OPTIONS,
  isAgentRole,
  OUTPUT_MODES,
  STEP_LABELS,
  WORKER_SKILLS,
} from './constants';

const fieldClass =
  'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type AgentWizardCardProps = {
  name: string;
  role: string;
  description: string;
  domain: string;
  subdomainsText: string;
  intentsText: string;
  pathGlobsText: string;
  keywordsText: string;
  skillInput: string;
  skills: string[];
  outputMode: string;
  maxFiles: number;
  maxCharsPerFile: number;
  delegationEnabled: boolean;
  delegationStrategy: string;
  maxHandoffs: number;
  allowedSubagentsText: string;
  currentStep: number;
  setName: (value: string) => void;
  setRole: (value: string) => void;
  setDescription: (value: string) => void;
  setDomain: (value: string) => void;
  setSubdomainsText: (value: string) => void;
  setIntentsText: (value: string) => void;
  setPathGlobsText: (value: string) => void;
  setKeywordsText: (value: string) => void;
  setSkillInput: (value: string) => void;
  addSkill: () => void;
  toggleQuickSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  setOutputMode: (value: string) => void;
  setMaxFiles: (value: number) => void;
  setMaxCharsPerFile: (value: number) => void;
  setDelegationEnabled: (value: boolean) => void;
  setDelegationStrategy: (value: string) => void;
  setMaxHandoffs: (value: number) => void;
  setAllowedSubagentsText: (value: string) => void;
  onBrowseRegistry: () => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
};

export const AgentWizardCard: React.FC<AgentWizardCardProps> = ({
  name,
  role,
  description,
  domain,
  subdomainsText,
  intentsText,
  pathGlobsText,
  keywordsText,
  skillInput,
  skills,
  outputMode,
  maxFiles,
  maxCharsPerFile,
  delegationEnabled,
  delegationStrategy,
  maxHandoffs,
  allowedSubagentsText,
  currentStep,
  setName,
  setRole,
  setDescription,
  setDomain,
  setSubdomainsText,
  setIntentsText,
  setPathGlobsText,
  setKeywordsText,
  setSkillInput,
  addSkill,
  toggleQuickSkill,
  removeSkill,
  setOutputMode,
  setMaxFiles,
  setMaxCharsPerFile,
  setDelegationEnabled,
  setDelegationStrategy,
  setMaxHandoffs,
  setAllowedSubagentsText,
  onBrowseRegistry,
  setCurrentStep,
  nextStep,
  prevStep,
}) => {
  const stepLabels = isAgentRole(role) ? STEP_LABELS[role] : ['Name', 'Description', 'Role'];
  const stepLabel = stepLabels[currentStep] ?? stepLabels[0];
  const routerMode = role === 'router';
  const orchestratorMode = role === 'orchestrator';
  const workerMode = role === 'worker';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agent Wizard</CardTitle>
        <CardDescription>
          Step {currentStep + 1} of {stepLabels.length}: {stepLabel}
        </CardDescription>
        <div className="flex flex-wrap gap-1 pt-1">
          {stepLabels.map((label, index) => (
            <Button
              key={label}
              type="button"
              size="sm"
              variant={index === currentStep ? 'default' : 'outline'}
              className="h-7 px-2 text-xs"
              onClick={() => setCurrentStep(index)}
            >
              {index + 1}. {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stepLabel === 'Name' && (
          <div className="space-y-1.5">
            <Label htmlFor="agent-name">Agent Name *</Label>
            <Input
              id="agent-name"
              placeholder="e.g. Backend API Worker"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}

        {stepLabel === 'Description' && (
          <div className="space-y-1.5">
            <Label htmlFor="agent-description">Description</Label>
            <textarea
              id="agent-description"
              rows={4}
              placeholder="Describe what this agent does and its primary responsibilities..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={cn(fieldClass, 'resize-none py-2')}
            />
          </div>
        )}

        {stepLabel === 'Role' && (
          <div className="space-y-1.5">
            <Label htmlFor="agent-role">Role *</Label>
            <select
              id="agent-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className={cn(fieldClass, 'h-9')}
            >
              <option value="">Select a role...</option>
              {AGENT_ROLES.map((agentRole) => (
                <option key={agentRole.value} value={agentRole.value} title={agentRole.description}>
                  {agentRole.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {stepLabel === 'Domain' && (
          <div className="space-y-1.5">
            <Label htmlFor="agent-domain">Domain</Label>
            <select
              id="agent-domain"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className={cn(fieldClass, 'h-9')}
              disabled={routerMode}
            >
              <option value="">Select a domain...</option>
              {DOMAIN_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {routerMode && (
              <p className="text-xs text-muted-foreground">
                Router agents use <code>global</code> domain by default.
              </p>
            )}
          </div>
        )}

        {stepLabel === 'Subdomains' && (
          <div className="space-y-1.5">
            <Label htmlFor="agent-subdomains">Subdomains (one per line or comma separated)</Label>
            <textarea
              id="agent-subdomains"
              rows={4}
              placeholder="api, auth"
              value={subdomainsText}
              onChange={(event) => setSubdomainsText(event.target.value)}
              className={cn(fieldClass, 'resize-y py-2')}
            />
          </div>
        )}

        {stepLabel === 'Intents' && (
          <div className="space-y-1.5">
            <Label htmlFor="agent-intents">Intents (one per line or comma separated)</Label>
            <textarea
              id="agent-intents"
              rows={5}
              placeholder="endpoint_add, auth_implementation"
              value={intentsText}
              onChange={(event) => setIntentsText(event.target.value)}
              className={cn(fieldClass, 'resize-y py-2')}
            />
          </div>
        )}

        {stepLabel === 'Path Globs' && (
          <div className="space-y-1.5">
            <Label htmlFor="agent-path-globs">Path Globs (one per line)</Label>
            <textarea
              id="agent-path-globs"
              rows={5}
              placeholder="src/api/**/*.ts"
              value={pathGlobsText}
              onChange={(event) => setPathGlobsText(event.target.value)}
              className={cn(fieldClass, 'resize-y py-2')}
            />
          </div>
        )}

        {stepLabel === 'Keywords' && (
          <div className="space-y-1.5">
            <Label htmlFor="agent-keywords">Keywords (one per line or comma separated)</Label>
            <textarea
              id="agent-keywords"
              rows={5}
              placeholder="REST, endpoint, route"
              value={keywordsText}
              onChange={(event) => setKeywordsText(event.target.value)}
              className={cn(fieldClass, 'resize-y py-2')}
            />
          </div>
        )}

        {stepLabel === 'Skills' && (
          <div className="space-y-3">
            <CardDescription className="flex items-center justify-between">
              <span>Allowed skills for this worker agent</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs"
                onClick={onBrowseRegistry}
              >
                <ExternalLink className="h-3 w-3" />
                Browse registry
              </Button>
            </CardDescription>
            <div className="flex flex-wrap gap-2">
              {WORKER_SKILLS.map((skill) => {
                const active = skills.includes(skill);
                return (
                  <Button
                    key={skill}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    onClick={() => toggleQuickSkill(skill)}
                    className="h-7 text-xs"
                  >
                    {skill}
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. custom skill id"
                value={skillInput}
                onChange={(event) => setSkillInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1.5 pl-2">
                    <Sparkles className="h-3 w-3" />
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No skills selected.</p>
            )}
          </div>
        )}

        {stepLabel === 'Advanced' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agent-output">Output mode</Label>
              <select
                id="agent-output"
                value={outputMode}
                onChange={(event) => setOutputMode(event.target.value)}
                className={cn(fieldClass, 'h-9')}
              >
                {OUTPUT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="agent-max-files">Context max files</Label>
                <Input
                  id="agent-max-files"
                  type="number"
                  min={1}
                  max={64}
                  value={maxFiles}
                  onChange={(event) => setMaxFiles(Number(event.target.value || 8))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-max-chars">Max chars per file</Label>
                <Input
                  id="agent-max-chars"
                  type="number"
                  min={500}
                  max={40000}
                  step={500}
                  value={maxCharsPerFile}
                  onChange={(event) => setMaxCharsPerFile(Number(event.target.value || 8000))}
                />
              </div>
            </div>
            <div className="space-y-2 rounded-md border border-border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={delegationEnabled}
                  onChange={(event) => setDelegationEnabled(event.target.checked)}
                />
                Enable delegation for this worker
              </label>
              {delegationEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="agent-delegation-strategy">Strategy</Label>
                    <select
                      id="agent-delegation-strategy"
                      value={delegationStrategy}
                      onChange={(event) => setDelegationStrategy(event.target.value)}
                      className={cn(fieldClass, 'h-9')}
                    >
                      <option value="agent_handoff">agent_handoff</option>
                      <option value="router_split">router_split</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="agent-max-handoffs">Max handoffs</Label>
                    <Input
                      id="agent-max-handoffs"
                      type="number"
                      min={1}
                      max={2}
                      value={maxHandoffs}
                      onChange={(event) => setMaxHandoffs(Number(event.target.value || 1))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {stepLabel === 'Delegation' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agent-delegation-strategy-orchestrator">Strategy</Label>
              <Input
                id="agent-delegation-strategy-orchestrator"
                value="router_split"
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-max-handoffs-orchestrator">Max handoffs (1-3)</Label>
              <Input
                id="agent-max-handoffs-orchestrator"
                type="number"
                min={1}
                max={3}
                value={maxHandoffs}
                onChange={(event) => setMaxHandoffs(Number(event.target.value || 2))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-allowed-subagents">
                Allowed subagents (comma or line separated, or "all")
              </Label>
              <textarea
                id="agent-allowed-subagents"
                rows={4}
                placeholder="all"
                value={allowedSubagentsText}
                onChange={(event) => setAllowedSubagentsText(event.target.value)}
                className={cn(fieldClass, 'resize-y py-2')}
              />
            </div>
            {orchestratorMode && (
              <p className="text-xs text-muted-foreground">
                Orchestrators do not execute files directly, they only coordinate delegations.
              </p>
            )}
          </div>
        )}

        {routerMode && stepLabel === 'Keywords' && (
          <p className="text-xs text-muted-foreground">
            Router skills and delegation are fixed: <code>search_codebase</code>, strategy{' '}
            <code>router_split</code>, max handoffs <code>1</code>.
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={nextStep}
            disabled={currentStep >= stepLabels.length - 1}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!workerMode && stepLabel === 'Role' && (
          <p className="text-xs text-muted-foreground">
            Choosing role changes wizard steps and fixed metadata defaults.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
