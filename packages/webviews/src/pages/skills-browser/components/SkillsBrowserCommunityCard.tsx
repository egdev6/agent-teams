import { Button } from '@components/ui/button';
import { Card, CardContent } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Search } from 'lucide-react';

type CommunityState = {
  query: string;
  sources: string[];
  output: string;
  importingSource: string | null;
  status: string | null;
};

type SkillsBrowserCommunityCardProps = {
  community: CommunityState;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onImportSource: (source: string) => void;
};

export const SkillsBrowserCommunityCard: React.FC<SkillsBrowserCommunityCardProps> = ({
  community,
  onQueryChange,
  onSearch,
  onImportSource,
}) => {
  return (
    <Card>
      <CardContent className='space-y-3 pt-4'>
        <p className='text-sm font-medium'>Community catalog (skills-lc-cli)</p>
        <div className='flex gap-2'>
          <Input
            placeholder='Search community skills (e.g. testing, react, docs)'
            value={community.query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <Button variant='outline' onClick={onSearch}>
            <Search className='mr-1.5 h-3.5 w-3.5' />
            Search
          </Button>
        </div>

        {community.status && <p className='text-xs text-muted-foreground'>{community.status}</p>}

        {community.sources.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            {community.sources.map((source) => (
              <Button
                key={source}
                size='sm'
                variant='outline'
                disabled={community.importingSource === source}
                onClick={() => onImportSource(source)}
              >
                {community.importingSource === source ? 'Importing...' : `Import ${source}`}
              </Button>
            ))}
          </div>
        )}

        {community.output && (
          <pre className='max-h-48 overflow-auto rounded-md border border-border bg-muted p-3 text-xs'>
            {community.output}
          </pre>
        )}
      </CardContent>
    </Card>
  );
};
