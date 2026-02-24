import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DashboardStats } from '../../types';
import { clamp, isAgentRole, listToMultiline, UNIQUE_DEFAULT } from '../agent-wizard/constants';
import { buildAgentWizardPayload } from '../agent-wizard/payload';

const EMPTY_STATS: DashboardStats = {
  hasProfile: false,
  profileStatus: 'Not configured',
  totalAgents: '—',
  specCount: '—',
  validSpecs: '—',
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
  | {
      type: 'agentData';
      agentId: string;
      name?: string;
      role?: string;
      description?: string;
      domain?: string;
      subdomains?: string[];
      intents?: string[];
      pathGlobs?: string[];
      keywords?: string[];
      skills?: string[];
      output?: {
        modeDefault?: 'short+diff' | 'diff' | 'plan' | 'structured';
      };
      context?: {
        maxFiles?: number;
        maxCharsPerFile?: number;
      };
      delegation?: {
        strategy?: 'disabled' | 'router_split' | 'agent_handoff';
        maxHandoffs?: number;
        allowedSubagents?: string[] | 'all';
      };
      error?: string;
    }
  | { type: 'saveAgentResult'; success: boolean; error?: string };

export const useEditAgentLogic = () => {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();
  const [_stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
      setIsLoading(false);
      return;
    }
    vscode.postMessage({ type: 'requestAgentData', agentId });
  }, [agentId]);

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

  const stepLabels = useMemo(() => {
    if (!isAgentRole(role)) {
      return ['Name', 'Description', 'Role'];
    }
    if (role === 'router') {
      return ['Name', 'Description', 'Role', 'Domain', 'Intents', 'Keywords'];
    }
    if (role === 'orchestrator') {
      return [
        'Name',
        'Description',
        'Role',
        'Domain',
        'Subdomains',
        'Intents',
        'Path Globs',
        'Keywords',
        'Delegation',
      ];
    }
    return [
      'Name',
      'Description',
      'Role',
      'Domain',
      'Subdomains',
      'Intents',
      'Path Globs',
      'Keywords',
      'Skills',
      'Advanced',
    ];
  }, [role]);

  useEffect(() => {
    setCurrentStep((step) => Math.min(step, stepLabels.length - 1));
  }, [stepLabels]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mapping host payload into local wizard form state
  const handleAgentData = useCallback((message: Extract<HostMessage, { type: 'agentData' }>) => {
    setIsLoading(false);
    if (message.error) {
      setLoadError(message.error);
      return;
    }
    setName(message.name ?? '');
    setRole(message.role ?? '');
    setDescription(message.description ?? '');
    setDomain(message.domain ?? '');
    setSubdomainsText(listToMultiline(message.subdomains));
    setIntentsText(listToMultiline(message.intents));
    setPathGlobsText(listToMultiline(message.pathGlobs));
    setKeywordsText(listToMultiline(message.keywords));
    setSkills(message.skills ?? []);
    setOutputMode(message.output?.modeDefault ?? 'short+diff');
    setMaxFiles(message.context?.maxFiles ?? 8);
    setMaxCharsPerFile(message.context?.maxCharsPerFile ?? 8000);

    const strategy = message.delegation?.strategy ?? 'disabled';
    const allowedSubagentsText =
      message.delegation?.allowedSubagents === 'all'
        ? 'all'
        : listToMultiline(message.delegation?.allowedSubagents);
    setDelegationEnabled(strategy !== 'disabled');
    setDelegationStrategy(strategy === 'router_split' ? 'router_split' : 'agent_handoff');
    setMaxHandoffs(message.delegation?.maxHandoffs ?? 1);
    setAllowedSubagentsText(allowedSubagentsText);
  }, []);

  const handleSaveAgentResult = useCallback(
    (message: Extract<HostMessage, { type: 'saveAgentResult' }>) => {
      setIsSaving(false);
      if (message.success) {
        navigate(-1);
      } else {
        setSaveError(message.error ?? 'Failed to save agent');
      }
    },
    [navigate],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (message.type === 'updateStats') setStats(message.stats);
      else if (message.type === 'agentData') handleAgentData(message);
      else if (message.type === 'saveAgentResult') handleSaveAgentResult(message);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleAgentData, handleSaveAgentResult]);

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

  const handleSave = () => {
    setSaveError(null);
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
      type: 'saveAgent',
      agentId: agentId ?? '',
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

  const handleDelete = () => {
    vscode.postMessage({ type: 'deleteAgent', agentId: agentId ?? '' });
    navigate(-1);
  };

  const nextStep = () =>
    setCurrentStep((step) => Math.min(step + 1, Math.max(stepLabels.length - 1, 0)));
  const prevStep = () => setCurrentStep((step) => Math.max(step - 1, 0));

  return {
    navigate,
    agentId,
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
    currentStep,
    setCurrentStep,
    stepLabels,
    isLoading,
    isSaving,
    loadError,
    saveError,
    addSkill,
    toggleQuickSkill,
    removeSkill,
    handleSave,
    handleDelete,
    nextStep,
    prevStep,
    isValid: name.trim().length > 0 && isAgentRole(role),
  };
};
