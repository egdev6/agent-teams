/**
 * SkillsBrowserPage
 * Browse, search and install skills from the registry.
 */
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Separator } from '@components/ui/separator';
import { cn } from '@lib/utils';
import { vscode } from '@lib/vscode';
import { ArrowLeft, CheckCircle2, Download, Layers, Search, Sparkles, Tag } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mock registry data — replace with real data from the extension when ready
// ---------------------------------------------------------------------------
const SKILL_CATEGORIES = [
  'All',
  'TypeScript',
  'Testing',
  'Documentation',
  'Security',
  'Style',
] as const;

type SkillCategory = (typeof SKILL_CATEGORIES)[number];

interface Skill {
  id: string;
  name: string;
  description: string;
  category: Exclude<SkillCategory, 'All'>;
  tags: string[];
  version: string;
  installed: boolean;
}

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

const categoryColors: Record<Exclude<SkillCategory, 'All'>, string> = {
  TypeScript: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Testing: 'bg-green-500/10 text-green-500 border-green-500/20',
  Documentation: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Security: 'bg-red-500/10 text-red-500 border-red-500/20',
  Style: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const SkillsBrowserPage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SkillCategory>('All');
  const [installedIds, setInstalledIds] = useState<Set<string>>(
    () => new Set(SKILLS_REGISTRY.filter((s) => s.installed).map((s) => s.id)),
  );

  const filtered = SKILLS_REGISTRY.filter((skill) => {
    const matchCat = activeCategory === 'All' || skill.category === activeCategory;
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      skill.name.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q) ||
      skill.tags.some((t) => t.includes(q));
    return matchCat && matchQ;
  });

  const installedCount = installedIds.size;

  const handleInstall = (id: string) => {
    setInstalledIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    vscode.postMessage({ type: 'toggleSkill', skillId: id } as any);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Skills Browser
          </h1>
          <p className="text-sm text-muted-foreground">
            Install skills from the registry to enhance your agents
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {installedCount} installed
        </Badge>
      </div>

      {/* Search + categories */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search skills by name, description or tag…"
              className="pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {SKILL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {(['TypeScript', 'Testing', 'Security'] as const).map((cat) => {
          const count = SKILLS_REGISTRY.filter((s) => s.category === cat).length;
          const inst = SKILLS_REGISTRY.filter(
            (s) => s.category === cat && installedIds.has(s.id),
          ).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="text-left rounded-md border border-border p-3 hover:bg-accent transition-colors"
            >
              <p className="text-xs text-muted-foreground">{cat}</p>
              <p className="text-lg font-bold">
                {inst}/{count}
              </p>
              <p className="text-xs text-muted-foreground">installed</p>
            </button>
          );
        })}
      </div>

      {/* Skills list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No skills found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search or category filter
              </p>
            </CardContent>
          </Card>
        )}

        {filtered.map((skill) => {
          const isInstalled = installedIds.has(skill.id);
          return (
            <Card
              key={skill.id}
              className={cn('transition-all', isInstalled && 'border-primary/40 bg-primary/2')}
            >
              <CardContent className="flex items-start gap-4 pt-4">
                <div
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-xs font-medium shrink-0 mt-0.5',
                    categoryColors[skill.category],
                  )}
                >
                  {skill.category}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{skill.name}</span>
                    <span className="text-xs text-muted-foreground">v{skill.version}</span>
                    {isInstalled && (
                      <Badge variant="default" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Installed
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={isInstalled ? 'secondary' : 'outline'}
                  className="shrink-0"
                  onClick={() => handleInstall(skill.id)}
                >
                  {isInstalled ? (
                    'Remove'
                  ) : (
                    <>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Install
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      <div className="flex justify-between items-center pb-4">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {SKILLS_REGISTRY.length} skills
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/create-agent')}>
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          Create Agent with these skills
        </Button>
      </div>
    </div>
  );
};

export default SkillsBrowserPage;
