import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats } from '../../types';

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

type HostMessage =
  | { type: 'updateStats'; stats: DashboardStats }
  | { type: 'createTeamResult'; success: boolean; error?: string }
  | {
      type: 'teamTemplate';
      team: {
        id: string;
        name: string;
        description?: string;
        agents?: string[];
        tags?: string[];
      };
    }
  | { type: 'teamTemplateError'; error: string };

export const useCreateTeamLogic = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);
  const [teamId, setTeamId] = useState('');
  const [teamIdTouched, setTeamIdTouched] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [templateTeamId, setTemplateTeamId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  const slugify = useCallback(
    (value: string) =>
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    [],
  );

  const availableAgents = useMemo(() => stats.globalCatalog.agents, [stats.globalCatalog.agents]);
  const availableTeamTemplates = useMemo(
    () => stats.globalCatalog.teams,
    [stats.globalCatalog.teams],
  );
  const existingTeamIds = useMemo(
    () => new Set(stats.teams.map((team) => team.id.toLowerCase())),
    [stats.teams],
  );

  const toUniqueTeamId = useCallback(
    (candidate: string) => {
      const normalized = slugify(candidate);
      if (!normalized) return '';
      if (!existingTeamIds.has(normalized)) return normalized;

      let suffix = 1;
      let next = `${normalized}-copy`;
      while (existingTeamIds.has(next)) {
        suffix += 1;
        next = `${normalized}-copy-${suffix}`;
      }
      return next;
    },
    [existingTeamIds, slugify],
  );

  useEffect(() => {
    if (!teamIdTouched) {
      setTeamId(slugify(name));
    }
  }, [name, slugify, teamIdTouched]);

  const handleUpdateStats = useCallback(
    (message: Extract<HostMessage, { type: 'updateStats' }>) => {
      setStats(message.stats);
    },
    [],
  );

  const handleCreateTeamResult = useCallback(
    (message: Extract<HostMessage, { type: 'createTeamResult' }>) => {
      if (message.success) {
        navigate('/team-manager');
      } else {
        setCreateError(message.error || 'Failed to create team');
      }
    },
    [navigate],
  );

  const handleTeamTemplate = useCallback(
    (message: Extract<HostMessage, { type: 'teamTemplate' }>) => {
      const template = message.team;
      setName(template.name || '');
      setDescription(template.description || '');
      setSelectedAgents(template.agents || []);
      setTags(template.tags || []);
      setTeamIdTouched(true);
      setTeamId(toUniqueTeamId(template.id || template.name || ''));
      setCreateError(null);
    },
    [toUniqueTeamId],
  );

  const handleTeamTemplateError = useCallback(
    (message: Extract<HostMessage, { type: 'teamTemplateError' }>) => {
      setCreateError(message.error);
    },
    [],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (message.type === 'updateStats') handleUpdateStats(message);
      else if (message.type === 'createTeamResult') handleCreateTeamResult(message);
      else if (message.type === 'teamTemplate') handleTeamTemplate(message);
      else if (message.type === 'teamTemplateError') handleTeamTemplateError(message);
    };

    window.addEventListener('message', onMessage);
    vscode.postMessage({ type: 'refresh' });
    return () => window.removeEventListener('message', onMessage);
  }, [handleUpdateStats, handleCreateTeamResult, handleTeamTemplate, handleTeamTemplateError]);

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

  const applyTemplate = (selectedId: string) => {
    setTemplateTeamId(selectedId);
    if (!selectedId) {
      return;
    }
    vscode.postMessage({
      type: 'loadTeamTemplate',
      teamId: selectedId,
    });
  };

  const handleCreate = () => {
    if (!teamId) {
      setCreateError('Team ID is required');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(teamId)) {
      setCreateError('Use lowercase letters, numbers, and hyphens only in Team ID');
      return;
    }
    if (existingTeamIds.has(teamId.toLowerCase())) {
      setCreateError(`Team ID "${teamId}" already exists`);
      return;
    }
    if (!name.trim()) {
      setCreateError('Team name is required');
      return;
    }

    setCreateError(null);
    vscode.postMessage({
      type: 'createTeam',
      teamId,
      name,
      description,
      agents: selectedAgents.length > 0 ? selectedAgents : undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  return {
    navigate,
    teamId,
    setTeamId: (next: string) => {
      setTeamIdTouched(true);
      setTeamId(slugify(next));
    },
    name,
    setName,
    description,
    setDescription,
    selectedAgents,
    templateTeamId,
    availableAgents,
    availableTeamTemplates,
    tagInput,
    setTagInput,
    tags,
    createError,
    toggleAgent,
    addTag,
    removeTag,
    applyTemplate,
    handleCreate,
    canCreate: Boolean(teamId.trim() && name.trim()),
  };
};
