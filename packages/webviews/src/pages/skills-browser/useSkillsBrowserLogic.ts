import { vscode } from '@lib/vscode';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SKILL_CATEGORIES = [
  'All',
  'TypeScript',
  'Testing',
  'Documentation',
  'Security',
  'Style',
] as const;

type SkillCategory = (typeof SKILL_CATEGORIES)[number];

type Skill = {
  id: string;
  name: string;
  description: string;
  category: Exclude<SkillCategory, 'All'>;
  tags: string[];
  version: string;
  installed: boolean;
};

const SKILLS_REGISTRY: Skill[] = [
  {
    id: 'prefer-functional',
    name: 'Prefer Functional',
    description: 'Encourages pure functions, immutability, and functional composition patterns.',
    category: 'TypeScript',
    tags: ['fp', 'immutability', 'patterns'],
    version: '1.0.0',
    installed: true,
  },
  {
    id: 'strict-types',
    name: 'Strict Types',
    description: 'Enforces explicit typing, avoids `any`, and enables strict TypeScript checks.',
    category: 'TypeScript',
    tags: ['types', 'strict', 'typescript'],
    version: '1.1.0',
    installed: false,
  },
  {
    id: 'vitest-patterns',
    name: 'Vitest Patterns',
    description: 'Testing conventions using Vitest: describe blocks, mock helpers, and coverage.',
    category: 'Testing',
    tags: ['vitest', 'unit', 'coverage'],
    version: '1.0.0',
    installed: true,
  },
  {
    id: 'tdd-first',
    name: 'TDD First',
    description: 'Red-green-refactor cycle guidance and test-first approach for all new code.',
    category: 'Testing',
    tags: ['tdd', 'testing', 'workflow'],
    version: '0.9.0',
    installed: false,
  },
  {
    id: 'jsdoc-strict',
    name: 'JSDoc Strict',
    description: 'Requires JSDoc comments on all public APIs with @param and @returns tags.',
    category: 'Documentation',
    tags: ['jsdoc', 'api-docs', 'comments'],
    version: '1.2.0',
    installed: false,
  },
  {
    id: 'readme-generator',
    name: 'README Generator',
    description: "Generates structured README files following the project's documentation style.",
    category: 'Documentation',
    tags: ['readme', 'markdown', 'docs'],
    version: '1.0.0',
    installed: false,
  },
  {
    id: 'owasp-top10',
    name: 'OWASP Top 10',
    description: 'Flags common security vulnerabilities and suggests OWASP-compliant mitigations.',
    category: 'Security',
    tags: ['owasp', 'vulnerabilities', 'audit'],
    version: '2.0.0',
    installed: false,
  },
  {
    id: 'biome-style',
    name: 'Biome Style',
    description: 'Code style conventions aligned with Biome linter/formatter configuration.',
    category: 'Style',
    tags: ['biome', 'linting', 'formatting'],
    version: '1.0.0',
    installed: true,
  },
];

export const useSkillsBrowserLogic = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SkillCategory>('All');
  const [installedIds, setInstalledIds] = useState<Set<string>>(
    () => new Set(SKILLS_REGISTRY.filter((skill) => skill.installed).map((skill) => skill.id)),
  );

  const filtered = useMemo(
    () =>
      SKILLS_REGISTRY.filter((skill) => {
        const matchCategory = activeCategory === 'All' || skill.category === activeCategory;
        const normalized = query.toLowerCase();
        const matchQuery =
          !normalized ||
          skill.name.toLowerCase().includes(normalized) ||
          skill.description.toLowerCase().includes(normalized) ||
          skill.tags.some((tag) => tag.includes(normalized));
        return matchCategory && matchQuery;
      }),
    [activeCategory, query],
  );

  const handleInstall = (id: string) => {
    setInstalledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    vscode.postMessage({ type: 'toggleSkill', skillId: id } as any);
  };

  return {
    navigate,
    query,
    setQuery,
    activeCategory,
    setActiveCategory,
    installedIds,
    filtered,
    installedCount: installedIds.size,
    skillCategories: SKILL_CATEGORIES,
    skillsRegistry: SKILLS_REGISTRY,
    handleInstall,
  };
};
