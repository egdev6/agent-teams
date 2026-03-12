import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DashboardStats, EditTeamHostMessage } from '../../models';

const EMPTY_STATS: DashboardStats = {
  hasProfile: false,
  profileStatus: 'Not configured',
  engramInstalled: false,
  engramConfigured: false,
  totalAgents: 0,
  totalTeams: 0,
  agentYamlCount: 0,
  validAgentYamlCount: 0,
  teamsCount: 0,
  teams: [],
  activeTeamId: null,
  teamContext: 'no_teams',
  syncStatus: 'NOT_SYNCED',
  syncTime: 'Never',
  syncNeeded: false,
  warnings: [],
  gatingReasons: {},
  agents: [],
  globalCatalog: {
    teams: [],
    agents: [],
    skills: [],
  },
  bindings: {
    teamId: null,
    agentIds: [],
    skillIds: [],
  },
};

export const useEditTeamLogic = () => {
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const availableAgents = useMemo(() => stats.globalCatalog.agents, [stats.globalCatalog.agents]);
  const isActiveTeam = teamId !== undefined && teamId === stats.activeTeamId;

  useEffect(() => {
    if (!teamId) {
      setIsLoading(false);
      setLoadError('Team ID is required');
      return;
    }
    vscode.postMessage({ type: 'requestTeamData', teamId });
    vscode.postMessage({ type: 'refresh' });
  }, [teamId]);

  const handleTeamData = useCallback(
    (message: Extract<EditTeamHostMessage, { type: 'teamData' }>) => {
      if (!teamId || message.teamId !== teamId) {
        return;
      }

      setIsLoading(false);
      if (message.error) {
        setLoadError(message.error);
        return;
      }

      setLoadError(null);
      setName(message.name ?? '');
      setDescription(message.description ?? '');
      setSelectedAgents(message.agents ?? []);
      setTags(message.tags ?? []);
    },
    [teamId],
  );

  const handleSaveTeamResult = useCallback(
    (message: Extract<EditTeamHostMessage, { type: 'saveTeamResult' }>) => {
      setIsSaving(false);
      if (message.success) {
        navigate('/team-manager');
      } else {
        setSaveError(message.error ?? 'Failed to save team');
      }
    },
    [navigate],
  );

  const handleDeleteTeamResult = useCallback(
    (message: Extract<EditTeamHostMessage, { type: 'deleteTeamResult' }>) => {
      setIsSaving(false);
      if (message.success) {
        navigate(-1);
      } else {
        setSaveError(message.error ?? 'Failed to delete team');
      }
    },
    [navigate],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<EditTeamHostMessage>) => {
      const message = event.data;
      if (message.type === 'updateStats') setStats(message.stats);
      else if (message.type === 'teamData') handleTeamData(message);
      else if (message.type === 'saveTeamResult') handleSaveTeamResult(message);
      else if (message.type === 'deleteTeamResult') handleDeleteTeamResult(message);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleTeamData, handleSaveTeamResult, handleDeleteTeamResult]);

  const toggleAgent = (id: string) =>
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((agent) => agent !== id) : [...prev, id],
    );

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((item) => item !== tag));

  const handleSave = () => {
    if (!teamId) {
      setSaveError('Team ID is required');
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    vscode.postMessage({
      type: 'saveTeam',
      teamId,
      name,
      description: description || undefined,
      agents: selectedAgents,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  const handleDelete = () => {
    if (!teamId) {
      setSaveError('Team ID is required');
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    vscode.postMessage({ type: 'deleteTeam', teamId });
  };

  const handleSetActiveTeam = () => {
    if (!teamId) {
      setSaveError('Team ID is required');
      return;
    }
    setSaveError(null);
    vscode.postMessage({ type: 'setActiveTeam', teamId });
  };

  return {
    navigate,
    teamId,
    name,
    setName,
    description,
    setDescription,
    selectedAgents,
    availableAgents,
    tagInput,
    setTagInput,
    tags,
    isLoading,
    isSaving,
    loadError,
    saveError,
    isActiveTeam,
    toggleAgent,
    addTag,
    removeTag,
    handleSave,
    handleDelete,
    handleSetActiveTeam,
    isValid: name.trim().length > 0,
  };
};
