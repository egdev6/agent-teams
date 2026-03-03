import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BrowserSkill, CommunitySkillResult } from '@/types';

type HostMessage =
  | { type: 'skillsCatalog'; skills?: BrowserSkill[]; selectedSkillIds?: string[] }
  | { type: 'skillsCatalogError'; error?: string }
  | {
      type: 'communitySkillsResult';
      query?: string;
      skills?: CommunitySkillResult[];
      total?: number;
      page?: number;
      error?: string;
    }
  | { type: 'communitySkillImportResult'; skillId?: string; success?: boolean; error?: string };

type SkillCategory = 'All' | string;

export type CommunityState = {
  query: string;
  skills: CommunitySkillResult[];
  total: number;
  page: number;
  isSearching: boolean;
  installingId: string | null;
  error: string | null;
  lastQuery: string;
};

function applyCommunitySkillsResult(
  prev: CommunityState,
  message: Extract<HostMessage, { type: 'communitySkillsResult' }>,
): CommunityState {
  return {
    ...prev,
    isSearching: false,
    query: typeof message.query === 'string' ? message.query : prev.query,
    lastQuery: typeof message.query === 'string' ? message.query : prev.lastQuery,
    skills: Array.isArray(message.skills) ? message.skills : [],
    total: typeof message.total === 'number' ? message.total : 0,
    page: typeof message.page === 'number' ? message.page : 1,
    error: typeof message.error === 'string' ? message.error : null,
  };
}

export const useSkillsBrowserLogic = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SkillCategory>('All');
  const [skillsRegistry, setSkillsRegistry] = useState<BrowserSkill[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [community, setCommunity] = useState<CommunityState>({
    query: '',
    skills: [],
    total: 0,
    page: 1,
    isSearching: false,
    installingId: null,
    error: null,
    lastQuery: '',
  });

  const refreshCatalog = useCallback(() => {
    vscode.postMessage({ type: 'requestSkillsCatalog' });
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  const handleSkillsCatalog = useCallback(
    (message: Extract<HostMessage, { type: 'skillsCatalog' }>) => {
      const skills = Array.isArray(message.skills) ? message.skills : [];
      const selectedSkillIds = Array.isArray(message.selectedSkillIds)
        ? message.selectedSkillIds.filter((id): id is string => typeof id === 'string')
        : [];
      setSkillsRegistry(skills);
      setInstalledIds(new Set(selectedSkillIds));
      setError(null);
    },
    [],
  );

  const handleCommunitySkillsResult = useCallback(
    (message: Extract<HostMessage, { type: 'communitySkillsResult' }>) => {
      setCommunity((prev) => applyCommunitySkillsResult(prev, message));
    },
    [],
  );

  const handleCommunitySkillImportResult = useCallback(
    (message: Extract<HostMessage, { type: 'communitySkillImportResult' }>) => {
      setCommunity((prev) => ({
        ...prev,
        installingId: null,
        error: !message.success && message.error ? (message.error ?? null) : prev.error,
      }));
      if (message.success) refreshCatalog();
    },
    [refreshCatalog],
  );

  const handleHostMessage = useCallback(
    (message: HostMessage) => {
      if (!message || typeof message !== 'object') return;
      if (message.type === 'skillsCatalog') handleSkillsCatalog(message);
      else if (message.type === 'skillsCatalogError')
        setError(typeof message.error === 'string' ? message.error : 'Failed to load skills.');
      else if (message.type === 'communitySkillsResult') handleCommunitySkillsResult(message);
      else if (message.type === 'communitySkillImportResult')
        handleCommunitySkillImportResult(message);
    },
    [handleSkillsCatalog, handleCommunitySkillsResult, handleCommunitySkillImportResult],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostMessage>) => handleHostMessage(event.data);
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleHostMessage]);

  const skillCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const skill of skillsRegistry) {
      if (skill?.category?.trim()) categories.add(skill.category);
    }
    return ['All', ...[...categories].sort()];
  }, [skillsRegistry]);

  const filtered = useMemo(() => {
    return skillsRegistry.filter((skill) => {
      const matchCategory = activeCategory === 'All' || skill.category === activeCategory;
      const normalized = query.toLowerCase();
      const matchQuery =
        !normalized ||
        skill.name.toLowerCase().includes(normalized) ||
        skill.description.toLowerCase().includes(normalized) ||
        skill.tags.some((tag) => tag.includes(normalized));
      return matchCategory && matchQuery;
    });
  }, [activeCategory, query, skillsRegistry]);

  const handleInstall = (id: string) => {
    vscode.postMessage({ type: 'toggleSkill', skillId: id });
  };

  const setCommunityQuery = (value: string) => {
    setCommunity((prev) => ({ ...prev, query: value }));
  };

  const searchCommunity = (page = 1) => {
    // Page 1 = new search (uses current input); page > 1 = page navigation (uses last searched query)
    const q = (page === 1 ? community.query : community.lastQuery || community.query).trim();
    if (!q) return;
    setCommunity((prev) => ({
      ...prev,
      isSearching: true,
      error: null,
      skills: [],
    }));
    vscode.postMessage({
      type: 'searchCommunitySkills',
      query: q,
      page,
      limit: 20,
      sortBy: 'stars',
    });
  };

  const openSkillPage = (url: string) => {
    vscode.postMessage({ type: 'openExternal', url });
  };

  const installCommunitySkill = (skill: CommunitySkillResult) => {
    setCommunity((prev) => ({ ...prev, installingId: skill.id, error: null }));
    vscode.postMessage({
      type: 'installCommunitySkill',
      skillId: skill.id,
      title: skill.title,
      description: skill.description,
      tags: skill.tags,
      version: skill.version ?? '1.0.0',
      githubUrl: skill.githubUrl,
    });
  };

  return {
    navigate,
    query,
    setQuery,
    activeCategory,
    setActiveCategory,
    installedIds,
    filtered,
    error,
    installedCount: installedIds.size,
    skillCategories,
    skillsRegistry,
    handleInstall,
    refreshCatalog,
    community,
    setCommunityQuery,
    searchCommunity,
    openSkillPage,
    installCommunitySkill,
  };
};

export type SkillsBrowserModel = ReturnType<typeof useSkillsBrowserLogic>;
