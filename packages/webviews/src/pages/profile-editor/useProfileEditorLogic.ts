import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExistingProfileUpdates, ProfileEditorContextPacksState } from '../../models';
import type { DetectedProjectConfig, ProfileFormData, ProjectType, SyncTarget } from './types';

const DETECTION_TIMEOUT_MS = 10000;
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';

const INITIAL_PROFILE: ProfileFormData = {
  id: 'my-project',
  name: 'My Project',
  version: '1.0.0',
  type: 'fullstack',
  technologies: [],
  paths: {
    root: '.',
    src: './src',
    tests_root: './tests',
  },
  commands: {
    build: 'pnpm build',
    test: 'pnpm test',
    dev: 'pnpm dev',
  },
  contextPacks: [],
  syncTargets: ['claude_code', 'github_copilot'],
};

const normalizeDetectedType = (value: string | undefined): ProjectType | null => {
  if (!value) return null;
  const allowed: ProjectType[] = ['frontend', 'backend', 'fullstack', 'monorepo', 'library'];
  return allowed.includes(value as ProjectType) ? (value as ProjectType) : null;
};

const normalizeSyncTargets = (value: unknown): SyncTarget[] => {
  const allowed: SyncTarget[] = ['claude_code', 'codex', 'github_copilot'];
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (item): item is SyncTarget =>
          typeof item === 'string' && allowed.includes(item as SyncTarget),
      ),
    ),
  );
};

const toStringMap = (value: unknown): Record<string, string> | null => {
  if (!value || typeof value !== 'object') return null;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([, mapValue]) => typeof mapValue === 'string',
    ),
  ) as Record<string, string>;
};

const safeStringField = (data: Record<string, unknown> | null, key: string): string | null => {
  if (!data) return null;
  const v = data[key];
  return typeof v === 'string' && v.trim() ? v : null;
};

const parseTechnologiesFromRaw = (rawTechnologies: unknown): string[] => {
  if (Array.isArray(rawTechnologies)) {
    return rawTechnologies.filter((item): item is string => typeof item === 'string');
  }
  if (rawTechnologies && typeof rawTechnologies === 'object') {
    return Object.entries(rawTechnologies as Record<string, unknown>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([name]) => name);
  }
  return [];
};

const filterStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

const parseExistingProfileUpdates = (raw: unknown): ExistingProfileUpdates | null => {
  if (!raw || typeof raw !== 'object') return null;
  const profileData = raw as Record<string, unknown>;
  const projectData =
    profileData.project && typeof profileData.project === 'object'
      ? (profileData.project as Record<string, unknown>)
      : null;
  const technologies = parseTechnologiesFromRaw(profileData.technologies);
  const paths = toStringMap(profileData.paths);
  const commands = toStringMap(profileData.commands);
  const contextPacks = filterStringArray(profileData.context_packs);
  const syncTargets = normalizeSyncTargets(profileData.sync_targets);
  return {
    id: safeStringField(projectData, 'id'),
    name: safeStringField(projectData, 'name'),
    version: safeStringField(projectData, 'version'),
    type: normalizeDetectedType(safeStringField(projectData, 'type') ?? undefined),
    technologies: technologies.length > 0 ? technologies : null,
    paths: paths && Object.keys(paths).length > 0 ? paths : null,
    commands: commands && Object.keys(commands).length > 0 ? commands : null,
    contextPacks: contextPacks.length > 0 ? contextPacks : null,
    syncTargets: syncTargets.length > 0 ? syncTargets : null,
  };
};

const mergeExistingProfileUpdates = (
  current: ProfileFormData,
  u: ExistingProfileUpdates,
): ProfileFormData => ({
  ...current,
  id: u.id ?? current.id,
  name: u.name ?? current.name,
  version: u.version ?? current.version,
  type: u.type ?? current.type,
  technologies: u.technologies ?? current.technologies,
  paths: u.paths ? { ...current.paths, ...u.paths } : current.paths,
  commands: u.commands ? { ...current.commands, ...u.commands } : current.commands,
  contextPacks: u.contextPacks ?? current.contextPacks,
  syncTargets: u.syncTargets ?? current.syncTargets,
});

export const useProfileEditorLogic = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileFormData>(INITIAL_PROFILE);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [availableContextPacks, setAvailableContextPacks] = useState<string[]>([]);
  const [syncTargetsError, setSyncTargetsError] = useState<string | null>(null);

  const applyExistingProfile = useCallback((raw: unknown) => {
    const updates = parseExistingProfileUpdates(raw);
    if (updates) setProfile((current) => mergeExistingProfileUpdates(current, updates));
  }, []);

  const applyDetectedConfig = useCallback(
    (config: DetectedProjectConfig, workspaceName?: string) => {
      const detectedTechnologies = Object.entries(config.technologies ?? {})
        .filter(([, enabled]) => Boolean(enabled))
        .map(([name]) => name);
      const detectedType = normalizeDetectedType(config.type);
      const detectedPaths = config.paths ?? {};
      const detectedCommands = config.commands ?? {};
      const nextName = workspaceName?.trim();

      const newName = nextName || null;
      const newId = nextName ? slugify(nextName) : null;
      const newType = detectedType;
      const newTechnologies = detectedTechnologies.length > 0 ? detectedTechnologies : null;
      const newPaths = Object.keys(detectedPaths).length > 0 ? detectedPaths : null;
      const newCommands = Object.keys(detectedCommands).length > 0 ? detectedCommands : null;

      setProfile((current) => ({
        ...current,
        name: newName ?? current.name,
        id: newId ?? current.id,
        type: newType ?? current.type,
        technologies: newTechnologies ?? current.technologies,
        paths: newPaths ? { ...current.paths, ...newPaths } : current.paths,
        commands: newCommands ? { ...current.commands, ...newCommands } : current.commands,
      }));
    },
    [],
  );

  const requestDetection = useCallback(() => {
    setIsDetecting(true);
    setDetectionError(null);
    vscode.postMessage({ type: 'requestDetectedConfig' });
  }, []);

  useEffect(() => {
    requestDetection();
    vscode.postMessage({ type: 'requestContextPacksState' });
  }, [requestDetection]);

  useEffect(() => {
    if (!isDetecting) return;
    const timeoutId = window.setTimeout(() => {
      setIsDetecting(false);
      setDetectionError('Could not auto-detect technologies. You can still select them manually.');
    }, DETECTION_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isDetecting]);

  const handleContextPacksStateMessage = useCallback((message: ProfileEditorContextPacksState) => {
    const available = Array.isArray(message.availablePacks)
      ? message.availablePacks.filter((item: unknown): item is string => typeof item === 'string')
      : [];
    const selected = Array.isArray(message.selectedPacks)
      ? message.selectedPacks.filter((item: unknown): item is string => typeof item === 'string')
      : [];
    setAvailableContextPacks(available);
    setProfile((current) => ({ ...current, contextPacks: selected }));
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'detectedConfig') {
        applyDetectedConfig(
          message.config as DetectedProjectConfig,
          message.workspaceName as string,
        );
        applyExistingProfile((message as { profile?: unknown }).profile);
        setIsDetecting(false);
        setDetectionError(null);
      } else if (message.type === 'contextPacksState') {
        handleContextPacksStateMessage(message);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [applyDetectedConfig, applyExistingProfile, handleContextPacksStateMessage]);

  const handleNameChange = (name: string) => setProfile((current) => ({ ...current, name }));

  const handleIdChange = (id: string) =>
    setProfile((current) => ({ ...current, id: id.toLowerCase().replace(/[^a-z0-9-]/g, '-') }));

  const handleVersionChange = (version: string) =>
    setProfile((current) => ({ ...current, version }));

  const handleTypeChange = (type: ProjectType) => setProfile((current) => ({ ...current, type }));

  const handleToggleTechnology = (technology: string) => {
    setProfile((current) => {
      const technologies = current.technologies.includes(technology)
        ? current.technologies.filter((item) => item !== technology)
        : [...current.technologies, technology];
      return { ...current, technologies };
    });
  };

  const handleAddTechnology = (technology: string) => {
    const normalized = technology.trim().toLowerCase();
    if (!normalized) return;

    setProfile((current) => {
      if (current.technologies.includes(normalized)) {
        return current;
      }
      return { ...current, technologies: [...current.technologies, normalized] };
    });
  };

  const handlePathChange = (key: string, value: string) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;
    setProfile((current) => ({
      ...current,
      paths: { ...current.paths, [normalizedKey]: value },
    }));
  };

  const handleRemovePath = (key: string) => {
    setProfile((current) => {
      const nextPaths = { ...current.paths };
      delete nextPaths[key];
      return { ...current, paths: nextPaths };
    });
  };

  const handleCommandChange = (key: string, value: string) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;
    setProfile((current) => ({
      ...current,
      commands: { ...current.commands, [normalizedKey]: value },
    }));
  };

  const handleRemoveCommand = (key: string) => {
    setProfile((current) => {
      const nextCommands = { ...current.commands };
      delete nextCommands[key];
      return { ...current, commands: nextCommands };
    });
  };

  const handleSave = () => {
    if (profile.syncTargets.length === 0) {
      setSyncTargetsError('Select at least one sync target before saving.');
      return;
    }
    setSyncTargetsError(null);
    setIsSaving(true);
    vscode.postMessage({ type: 'saveProfile', profile });

    setTimeout(() => {
      setIsSaving(false);
      navigate('/');
    }, 1000);
  };

  const handleCancel = () => navigate('/');

  const handleToggleContextPack = (packId: string) => {
    setProfile((current) => ({
      ...current,
      contextPacks: current.contextPacks.includes(packId)
        ? current.contextPacks.filter((item) => item !== packId)
        : [...current.contextPacks, packId],
    }));
  };

  const handleManageContextPacks = () => navigate('/context-packs');

  const handleToggleSyncTarget = (target: SyncTarget) => {
    setProfile((current) => ({
      ...current,
      syncTargets: current.syncTargets.includes(target)
        ? current.syncTargets.filter((item) => item !== target)
        : [...current.syncTargets, target],
    }));
  };

  return {
    profile,
    isSaving,
    isDetecting,
    detectionError,
    syncTargetsError,
    availableContextPacks,
    handleNameChange,
    handleIdChange,
    handleVersionChange,
    handleTypeChange,
    handleToggleTechnology,
    handleAddTechnology,
    handlePathChange,
    handleRemovePath,
    handleCommandChange,
    handleRemoveCommand,
    handleToggleContextPack,
    handleManageContextPacks,
    handleToggleSyncTarget,
    requestDetection,
    handleSave,
    handleCancel,
  };
};
