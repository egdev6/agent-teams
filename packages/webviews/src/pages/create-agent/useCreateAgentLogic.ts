import { vscode } from '@lib/vscode';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats } from '../../types';
import {
  clamp,
  isAgentRole,
  listToMultiline,
  parseList,
  UNIQUE_DEFAULT,
} from '../agent-wizard/constants';
import { buildAgentWizardPayload } from '../agent-wizard/payload';

const EMPTY_STATS: DashboardStats = {
  hasProfile: false,
  profileStatus: 'Not configured',
  totalAgents: 0,
  specCount: 0,
  validSpecs: 0,
  teamsCount: 0,
  teams: [],
  activeTeamId: null,
  teamContext: 'no_teams',
  syncStatus: 'NOT_SYNCED',
  syncTime: 'Never',
  warnings: [],
  gatingReasons: {},
  agents: [],
  globalCatalog: { teams: [], agents: [], skills: [] },
  bindings: { teamId: null, agentIds: [], skillIds: [] },
};

type HostMessage =
  | { type: 'updateStats'; stats: DashboardStats }
  | { type: 'createAgentResult'; success: boolean; error?: string };

export const useCreateAgentLogic = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [subdomainsText, setSubdomainsText] = useState('');
  const [intentsText, setIntentsText] = useState('');
  const [pathGlobsText, setPathGlobsText] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [outputMode, setOutputMode] = useState<string>(UNIQUE_DEFAULT.outputMode);
  const [maxFiles, setMaxFiles] = useState<number>(UNIQUE_DEFAULT.maxFiles);
  const [maxCharsPerFile, setMaxCharsPerFile] = useState<number>(UNIQUE_DEFAULT.maxCharsPerFile);
  const [delegationEnabled, setDelegationEnabled] = useState(false);
  const [delegationStrategy, setDelegationStrategy] = useState<string>('agent_handoff');
  const [maxHandoffs, setMaxHandoffs] = useState(1);
  const [allowedSubagentsText, setAllowedSubagentsText] = useState('all');
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (message.type === 'updateStats') {
        setStats(message.stats);
      } else if (message.type === 'createAgentResult') {
        setIsSaving(false);
        if (message.success) {
          navigate('/');
        } else {
          setCreateError(message.error ?? 'Failed to create agent');
        }
      }
    };
    window.addEventListener('message', onMessage);
    vscode.postMessage({ type: 'refresh' });
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);

  const availableWorkerAgents = useMemo(
    () =>
      stats.agents
        .filter((agent) => agent.role === 'worker')
        .map((agent) => ({ id: agent.id, name: agent.name })),
    [stats.agents],
  );

  useEffect(() => {
    if (role === 'router') {
      setDomain('global');
      setSkills(['search_codebase']);
      setOutputMode('short+diff');
      setMaxFiles(8);
      setMaxCharsPerFile(8000);
      setDelegationEnabled(true);
      setDelegationStrategy('router_split');
      setMaxHandoffs(1);
      setAllowedSubagentsText('all');
    } else if (role === 'orchestrator') {
      setSkills([]);
      setOutputMode('short+diff');
      setMaxFiles(8);
      setMaxCharsPerFile(8000);
      setDelegationEnabled(true);
      setDelegationStrategy('router_split');
      setMaxHandoffs((value) => clamp(value, 1, 3));
      if (!allowedSubagentsText.trim()) {
        setAllowedSubagentsText('all');
      }
    } else if (role === 'worker') {
      setDelegationStrategy('agent_handoff');
      setMaxHandoffs((value) => clamp(value, 1, 2));
      if (!domain) {
        setDomain('general');
      }
    }
  }, [allowedSubagentsText, domain, role]);

  const isConfigurationEnabled =
    name.trim().length > 0 && description.trim().length >= 10 && isAgentRole(role);

  useEffect(() => {
    setCurrentStep((step) => Math.min(step, 1));
  }, []);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => setSkills((prev) => prev.filter((item) => item !== skill));

  const toggleQuickSkill = (skill: string) => {
    if (skills.includes(skill)) {
      removeSkill(skill);
      return;
    }
    setSkills((prev) => [...prev, skill]);
  };

  const handleCreate = () => {
    setCreateError(null);
    setIsSaving(true);
    const payload = buildAgentWizardPayload({
      role,
      domain,
      subdomainsText,
      intentsText,
      pathGlobsText,
      keywordsText,
      skills,
      outputMode,
      maxFiles,
      maxCharsPerFile,
      delegationEnabled,
      delegationStrategy,
      maxHandoffs,
      allowedSubagentsText,
    });

    vscode.postMessage({
      type: 'createAgent',
      name,
      role: payload.role,
      description: description || undefined,
      domain: payload.domain,
      subdomains: payload.subdomains,
      intents: payload.intents,
      pathGlobs: payload.pathGlobs,
      keywords: payload.keywords,
      skills: payload.skills,
      output: payload.output,
      context: payload.context,
      delegation: payload.delegation,
    });
  };

  const nextStep = () =>
    setCurrentStep((step) => {
      if (step === 0 && !isConfigurationEnabled) {
        return step;
      }
      return Math.min(step + 1, 1);
    });
  const prevStep = () => setCurrentStep((step) => Math.max(step - 1, 0));

  return {
    navigate,
    name,
    setName,
    role,
    setRole,
    description,
    setDescription,
    domain,
    setDomain,
    subdomainsText,
    setSubdomainsText,
    intentsText,
    setIntentsText,
    pathGlobsText,
    setPathGlobsText,
    keywordsText,
    setKeywordsText,
    skillInput,
    setSkillInput,
    skills,
    outputMode,
    setOutputMode,
    maxFiles,
    setMaxFiles,
    maxCharsPerFile,
    setMaxCharsPerFile,
    delegationEnabled,
    setDelegationEnabled,
    delegationStrategy,
    setDelegationStrategy,
    maxHandoffs,
    setMaxHandoffs,
    allowedSubagentsText,
    setAllowedSubagentsText,
    availableWorkerAgents,
    currentStep,
    setCurrentStep,
    isConfigurationEnabled,
    isSaving,
    createError,
    addSkill,
    toggleQuickSkill,
    removeSkill,
    nextStep,
    prevStep,
    handleCreate,
    isValid: isConfigurationEnabled,
    roleSummary: {
      domain,
      intents: listToMultiline(parseList(intentsText)),
      keywords: listToMultiline(parseList(keywordsText)),
    },
  };
};
