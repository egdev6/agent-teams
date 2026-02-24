import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DashboardStats } from '../../types';

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
      skills?: string[];
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
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Request agent data on mount
  useEffect(() => {
    if (!agentId) {
      setIsLoading(false);
      return;
    }
    vscode.postMessage({ type: 'requestAgentData', agentId });
  }, [agentId]);

  const handleAgentData = useCallback((message: Extract<HostMessage, { type: 'agentData' }>) => {
    setIsLoading(false);
    if (message.error) {
      setLoadError(message.error);
    } else {
      setName(message.name ?? '');
      setRole(message.role ?? '');
      setDescription(message.description ?? '');
      setSkills(message.skills ?? []);
    }
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

  const handleSave = () => {
    setSaveError(null);
    setIsSaving(true);
    vscode.postMessage({
      type: 'saveAgent',
      agentId: agentId ?? '',
      name,
      role: role || undefined,
      description: description || undefined,
      skills: skills.length > 0 ? skills : undefined,
    });
  };

  const handleDelete = () => {
    vscode.postMessage({ type: 'deleteAgent', agentId: agentId ?? '' });
    navigate(-1);
  };

  return {
    navigate,
    agentId,
    name,
    setName,
    role,
    setRole,
    description,
    setDescription,
    skillInput,
    setSkillInput,
    skills,
    isLoading,
    isSaving,
    loadError,
    saveError,
    addSkill,
    removeSkill,
    handleSave,
    handleDelete,
    isValid: name.trim().length > 0,
  };
};
