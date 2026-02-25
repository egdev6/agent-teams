import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BrowserSkill } from '@/types';

type HostMessage =
  | {
      type: 'skillsCatalog';
      skills?: BrowserSkill[];
      selectedSkillIds?: string[];
    }
  | {
      type: 'skillsCatalogError';
      error?: string;
    }
  | {
      type: 'communitySkillsResult';
      query?: string;
      sources?: string[];
      output?: string;
    }
  | {
      type: 'communitySkillImportResult';
      source?: string;
      success?: boolean;
      output?: string;
    };

type SkillCategory = 'All' | string;

type CommunityState = {
  query: string;
  sources: string[];
  output: string;
  importingSource: string | null;
  status: string | null;
};

export const useSkillsBrowserLogic = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SkillCategory>('All');
  const [skillsRegistry, setSkillsRegistry] = useState<BrowserSkill[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [community, setCommunity] = useState<CommunityState>({
    query: '',
    sources: [],
    output: '',
    importingSource: null,
    status: null,
  });

  const refreshCatalog = useCallback(() => {
    vscode.postMessage({ type: 'requestSkillsCatalog' });
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (!message || typeof message !== 'object') {
        return;
      }

      if (message.type === 'skillsCatalog') {
        const skills = Array.isArray(message.skills) ? message.skills : [];
        const selectedSkillIds = Array.isArray(message.selectedSkillIds)
          ? message.selectedSkillIds.filter((id): id is string => typeof id === 'string')
          : [];
        setSkillsRegistry(skills);
        setInstalledIds(new Set(selectedSkillIds));
        setError(null);
        return;
      }

      if (message.type === 'skillsCatalogError') {
        setError(typeof message.error === 'string' ? message.error : 'Failed to load skills.');
        return;
      }

      if (message.type === 'communitySkillsResult') {
        setCommunity((prev) => ({
          ...prev,
          query: typeof message.query === 'string' ? message.query : prev.query,
          sources: Array.isArray(message.sources)
            ? message.sources.filter((item): item is string => typeof item === 'string')
            : [],
          output: typeof message.output === 'string' ? message.output : '',
          status: null,
        }));
        return;
      }

      if (message.type === 'communitySkillImportResult') {
        const source = typeof message.source === 'string' ? message.source : 'unknown';
        const success = Boolean(message.success);
        setCommunity((prev) => ({
          ...prev,
          importingSource: null,
          status: success
            ? `Imported ${source} using skills-lc-cli`
            : `Failed to import ${source}: ${typeof message.output === 'string' ? message.output : 'unknown error'}`,
        }));
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const skillCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const skill of skillsRegistry) {
      if (skill.category && skill.category.trim()) {
        categories.add(skill.category);
      }
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

  const searchCommunity = () => {
    vscode.postMessage({ type: 'searchCommunitySkills', query: community.query.trim() });
  };

  const importCommunitySource = (source: string) => {
    setCommunity((prev) => ({ ...prev, importingSource: source, status: null }));
    vscode.postMessage({ type: 'importCommunitySkillSource', source });
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
    importCommunitySource,
  };
};
