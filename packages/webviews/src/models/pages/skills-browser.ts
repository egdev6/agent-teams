import type { BrowserSkill, CommunitySkillResult } from '../catalog';

export type SkillsBrowserHostMessage =
  | { type: 'skillsCatalog'; skills?: BrowserSkill[]; selectedSkillIds?: string[] }
  | { type: 'skillsCatalogError'; error?: string }
  | { type: 'deleteSkillResult'; skillId?: string; success?: boolean; error?: string }
  | {
      type: 'communitySkillsResult';
      query?: string;
      skills?: CommunitySkillResult[];
      total?: number;
      page?: number;
      error?: string;
    }
  | { type: 'communitySkillImportResult'; skillId?: string; success?: boolean; error?: string };

export type SkillCategory = 'All' | string;

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
