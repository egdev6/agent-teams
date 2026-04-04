import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext';
import type { EditTeamHostMessage } from '../../models';

export const useEditTeamLogic = () => {
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const { stats, optimisticActiveTeamId, setOptimisticActiveTeamId } = useDashboard();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const availableAgents = useMemo(() => stats.globalCatalog.agents, [stats.globalCatalog.agents]);
  const isActiveTeam = useMemo(
    () => teamId !== undefined && teamId === (optimisticActiveTeamId ?? stats.activeTeamId),
    [teamId, optimisticActiveTeamId, stats.activeTeamId],
  );

  // Debug log to track isActiveTeam changes
  useEffect(() => {
    console.log('[EditTeam] isActiveTeam changed:', isActiveTeam, {
      teamId,
      optimisticActiveTeamId,
      statsActiveTeamId: stats.activeTeamId,
    });
  }, [isActiveTeam, teamId, optimisticActiveTeamId, stats.activeTeamId]);

  useEffect(() => {
    if (!teamId) {
      setIsLoading(false);
      setLoadError('Team ID is required');
      return;
    }
    vscode.postMessage({ type: 'requestTeamData', teamId });
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

  useEffect(() => {
    const onMessage = (event: MessageEvent<EditTeamHostMessage>) => {
      const message = event.data;
      // Stats are now handled by DashboardContext, only handle teamData here
      if (message.type === 'teamData') {
        handleTeamData(message);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleTeamData]);

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
    vscode.postMessage({
      type: 'saveTeam',
      teamId,
      name,
      description: description || undefined,
      agents: selectedAgents,
      tags: tags.length > 0 ? tags : undefined,
    });
    // Navigate immediately for instant feel
    navigate(-1);
  };

  const handleDelete = () => {
    if (!teamId) {
      setSaveError('Team ID is required');
      return;
    }
    setSaveError(null);
    vscode.postMessage({ type: 'deleteTeam', teamId });
    // Navigate immediately for instant feel
    navigate(-1);
  };

  const handleSetActiveTeam = () => {
    if (!teamId) {
      setSaveError('Team ID is required');
      return;
    }
    setSaveError(null);
    console.log('[EditTeam] Setting optimistic active team:', teamId, 'at', performance.now());
    // Set optimistic state immediately for instant UI feedback
    setOptimisticActiveTeamId(teamId);
    // Also persist to sessionStorage (read by DashboardContext on mount)
    sessionStorage.setItem('optimisticActiveTeamId', teamId);
    console.log('[EditTeam] optimisticActiveTeamId set to:', teamId);
    vscode.postMessage({ type: 'setActiveTeam', teamId });
    console.log('[EditTeam] postMessage sent');
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
