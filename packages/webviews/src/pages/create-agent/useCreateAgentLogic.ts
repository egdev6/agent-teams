import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CatalogSkillEntry, DashboardStats, SkillUseDefinition } from '../../types';
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
  agentYamlCount: 0,
  validAgentYamlCount: 0,
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
  | { type: 'createAgentResult'; success: boolean; error?: string }
  | { type: 'importAgentSpecResult'; success: boolean; canceled?: boolean; error?: string }
  | { type: 'catalogSkills'; skills: CatalogSkillEntry[] }
  | { type: 'installCatalogSkillResult'; success: boolean; skillId: string; error?: string };

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
  const [skillUses, setSkillUses] = useState<SkillUseDefinition[]>([]);
  const [catalogSkills, setCatalogSkills] = useState<CatalogSkillEntry[]>([]);
  const [outputMode, setOutputMode] = useState<string>(UNIQUE_DEFAULT.outputMode);
  const [maxFiles, setMaxFiles] = useState<number>(UNIQUE_DEFAULT.maxFiles);
  const [maxCharsPerFile, setMaxCharsPerFile] = useState<number>(UNIQUE_DEFAULT.maxCharsPerFile);
  const [delegationEnabled, setDelegationEnabled] = useState(false);
  const [delegationStrategy, setDelegationStrategy] = useState<string>('agent_handoff');
  const [maxHandoffs, setMaxHandoffs] = useState(1);
  const [allowedSubagentsText, setAllowedSubagentsText] = useState('all');
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateAgentResult = useCallback(
    (message: Extract<HostMessage, { type: 'createAgentResult' }>) => {
      setIsSaving(false);
      if (message.success) {
        navigate('/');
      } else {
        setCreateError(message.error ?? 'Failed to create agent');
      }
    },
    [navigate],
  );

  const handleImportAgentSpecResult = useCallback(
    (message: Extract<HostMessage, { type: 'importAgentSpecResult' }>) => {
      setIsImporting(false);
      if (message.success) {
        navigate('/');
      } else if (!message.canceled) {
        setCreateError(message.error ?? 'Failed to import agent spec');
      }
    },
    [navigate],
  );

  const handleHostMessage = useCallback(
    (message: HostMessage) => {
      if (message.type === 'updateStats') {
        setStats(message.stats);
      } else if (message.type === 'createAgentResult') {
        handleCreateAgentResult(message);
      } else if (message.type === 'importAgentSpecResult') {
        handleImportAgentSpecResult(message);
      } else if (message.type === 'catalogSkills') {
        setCatalogSkills(message.skills);
      } else if (message.type === 'installCatalogSkillResult' && !message.success) {
        // Catalog skills will be refreshed via the follow-up 'catalogSkills' message
        setCreateError(message.error ?? `Failed to install skill ${message.skillId}`);
      }
    },
    [handleCreateAgentResult, handleImportAgentSpecResult],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostMessage>) => handleHostMessage(event.data);
    window.addEventListener('message', onMessage);
    vscode.postMessage({ type: 'refresh' });
    vscode.postMessage({ type: 'requestCatalogSkills' });
    return () => window.removeEventListener('message', onMessage);
  }, [handleHostMessage]);

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
      setSkillUses([]);
      setOutputMode('short+diff');
      setMaxFiles(8);
      setMaxCharsPerFile(8000);
      setDelegationEnabled(true);
      setDelegationStrategy('router_split');
      setMaxHandoffs(1);
      setAllowedSubagentsText('all');
    } else if (role === 'orchestrator') {
      setSkills([]);
      setSkillUses([]);
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

  const addSkillUse = useCallback((entry: CatalogSkillEntry) => {
    setSkillUses((prev) => {
      if (prev.some((u) => u.id === entry.id)) return prev;
      return [...prev, { id: entry.id, when: '', tags: [...entry.tags], autoload: true }];
    });
  }, []);

  const removeSkillUse = useCallback((id: string) => {
    setSkillUses((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const updateSkillUse = useCallback((id: string, patch: Partial<SkillUseDefinition>) => {
    setSkillUses((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const onInstallCatalogSkill = useCallback(
    (skillId: string) => {
      const entry = catalogSkills.find((s) => s.id === skillId);
      if (!entry) return;
      vscode.postMessage({
        type: 'installCatalogSkill',
        skillId: entry.id,
        title: entry.title,
        description: entry.description,
        sourceType: entry.source.type,
        ref: entry.source.ref,
        version: entry.version,
        tags: entry.tags,
      });
    },
    [catalogSkills],
  );

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
      skillUses,
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
      skillUses: payload.skillUses,
      output: payload.output,
      context: payload.context,
      delegation: payload.delegation,
    });
  };

  const handleImport = () => {
    setCreateError(null);
    setIsImporting(true);
    vscode.postMessage({ type: 'importAgentSpec' });
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
    skillUses,
    catalogSkills,
    addSkillUse,
    removeSkillUse,
    updateSkillUse,
    onInstallCatalogSkill,
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
    isImporting,
    createError,
    addSkill,
    toggleQuickSkill,
    removeSkill,
    nextStep,
    prevStep,
    handleCreate,
    handleImport,
    isValid: isConfigurationEnabled,
    roleSummary: {
      domain,
      intents: listToMultiline(parseList(intentsText)),
      keywords: listToMultiline(parseList(keywordsText)),
    },
  };
};
