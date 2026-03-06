import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Layers,
  Loader2,
  Search,
} from 'lucide-react';
import type { KeyboardEvent } from 'react';

import type { CommunitySkillResult } from '@/types';
import type { CommunityState } from '../useSkillsBrowserLogic';

const ITEMS_PER_PAGE = 20;

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

type PageItem = { kind: 'page'; n: number } | { kind: 'ellipsis'; id: string };

function getPageNumbers(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => ({ kind: 'page' as const, n: i + 1 }));
  }
  const pages: PageItem[] = [{ kind: 'page', n: 1 }];
  if (current > 3) pages.push({ kind: 'ellipsis', id: 'start' });
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push({ kind: 'page', n: p });
  }
  if (current < total - 2) pages.push({ kind: 'ellipsis', id: 'end' });
  pages.push({ kind: 'page', n: total });
  return pages;
}

type SkillsBrowserCommunityCardProps = {
  community: CommunityState;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onGoToPage: (page: number) => void;
  onInstall: (skill: CommunitySkillResult) => void;
  onOpenExternal: (url: string) => void;
};

export const SkillsBrowserCommunityCard: React.FC<SkillsBrowserCommunityCardProps> = ({
  community,
  onQueryChange,
  onSearch,
  onGoToPage,
  onInstall,
  onOpenExternal,
}) => {
  const totalPages = Math.max(1, Math.ceil(community.total / ITEMS_PER_PAGE));
  const hasResults = community.skills.length > 0;
  const hasSearched = community.lastQuery.length > 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSearch();
  };

  const handleView = (skill: CommunitySkillResult) => {
    const source = skill.source ?? skill.githubUrl?.replace('https://github.com/', '') ?? '';
    onOpenExternal(`https://skills.lc/${source}/${skill.id}`);
  };

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>Community Skills</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Search bar */}
        <div className='flex gap-2'>
          <Input
            placeholder='Search community skills (e.g. react, testing, docs)'
            value={community.query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            variant='outline'
            onClick={() => onSearch()}
            disabled={community.isSearching || !community.query.trim()}
          >
            {community.isSearching ? (
              <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
            ) : (
              <Search className='mr-1.5 h-3.5 w-3.5' />
            )}
            Search
          </Button>
        </div>

        {/* Error */}
        {community.error && <p className='text-xs text-red-500'>{community.error}</p>}

        {/* Loading (no results yet) */}
        {community.isSearching && !hasResults && (
          <div className='flex items-center gap-2 py-6 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            Searching…
          </div>
        )}

        {/* Empty state */}
        {hasSearched && !community.isSearching && !hasResults && !community.error && (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
              <Layers className='mb-3 h-10 w-10 text-muted-foreground' />
              <p className='text-sm font-medium'>No skills found</p>
              <p className='mt-1 text-xs text-muted-foreground'>
                Try adjusting your search or category filter
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results summary */}
        {hasResults && (
          <p className='text-xs text-muted-foreground'>
            {community.total} result{community.total !== 1 ? 's' : ''} for "{community.lastQuery}"
            {totalPages > 1 && ` — page ${community.page} of ${totalPages}`}
          </p>
        )}

        {/* 4-column grid */}
        {hasResults ? (
          <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
            {community.skills.map((skill) => (
              <div
                key={skill.id}
                className='flex flex-col gap-2 rounded-lg border border-border p-3'
              >
                {/* Title + installs */}
                <div className='space-y-0.5'>
                  <p className='line-clamp-2 text-sm font-medium leading-tight'>{skill.title}</p>
                  {skill.stars !== undefined && (
                    <p className='flex items-center gap-1 text-[11px] text-muted-foreground'>
                      <Download className='h-3 w-3' />
                      {formatInstalls(skill.stars)} installs
                    </p>
                  )}
                </div>

                {/* Description */}
                {skill.description && (
                  <p className='line-clamp-3 text-[11px] text-muted-foreground'>
                    {skill.description}
                  </p>
                )}

                {/* Tags */}
                {skill.tags.length > 0 && (
                  <div className='flex flex-wrap gap-1'>
                    {skill.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className='rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground'
                      >
                        {tag}
                      </span>
                    ))}
                    {skill.tags.length > 3 && (
                      <span className='text-[10px] text-muted-foreground'>
                        +{skill.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className='mt-auto flex gap-1.5 pt-1'>
                  <Button
                    size='sm'
                    className='h-7 flex-1 text-xs'
                    disabled={community.installingId === skill.id}
                    onClick={() => onInstall(skill)}
                  >
                    {community.installingId === skill.id ? (
                      <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                    ) : (
                      <Download className='mr-1 h-3 w-3' />
                    )}
                    {community.installingId === skill.id ? 'Installing…' : 'Install'}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 w-7 shrink-0 p-0'
                    title='View on skills.lc'
                    onClick={() => handleView(skill)}
                  >
                    <ExternalLink className='h-3 w-3' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
              <Layers className='mb-3 h-10 w-10 text-muted-foreground' />
              <p className='text-sm font-medium'>No skills found</p>
              <p className='mt-1 text-xs text-muted-foreground'>
                Try adjusting your search or category filter
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {hasResults && totalPages > 1 && (
          <div className='flex items-center justify-center gap-1'>
            <Button
              variant='outline'
              size='sm'
              className='h-7 w-7 p-0'
              disabled={community.page <= 1 || community.isSearching}
              onClick={() => onGoToPage(community.page - 1)}
            >
              <ChevronLeft className='h-3.5 w-3.5' />
            </Button>

            {getPageNumbers(community.page, totalPages).map((item) =>
              item.kind === 'ellipsis' ? (
                <span
                  key={`ellipsis-${item.id}`}
                  className='flex h-7 w-7 items-center justify-center text-xs text-muted-foreground'
                >
                  …
                </span>
              ) : (
                <Button
                  key={item.n}
                  size='sm'
                  variant={item.n === community.page ? 'default' : 'outline'}
                  className='h-7 w-7 p-0 text-xs'
                  disabled={community.isSearching}
                  onClick={() => onGoToPage(item.n)}
                >
                  {item.n}
                </Button>
              ),
            )}

            <Button
              variant='outline'
              size='sm'
              className='h-7 w-7 p-0'
              disabled={community.page >= totalPages || community.isSearching}
              onClick={() => onGoToPage(community.page + 1)}
            >
              <ChevronRight className='h-3.5 w-3.5' />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
