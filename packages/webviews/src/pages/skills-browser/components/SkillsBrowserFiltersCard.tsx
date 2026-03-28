import { Card, CardContent } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { cn } from '@lib/utils';
import { Search } from 'lucide-react';

type SkillsBrowserFiltersCardProps = {
  query: string;
  activeCategory: string;
  categories: string[];
  onQueryChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
};

export const SkillsBrowserFiltersCard: React.FC<SkillsBrowserFiltersCardProps> = ({
  query,
  activeCategory,
  categories,
  onQueryChange,
  onCategoryChange,
}) => {
  return (
    <Card>
      <CardContent className='space-y-3 pt-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search skills by name, description or tag...'
            className='pl-10'
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>

        <div className='flex flex-wrap gap-2'>
          {categories.map((category) => (
            <button
              key={category}
              type='button'
              onClick={() => onCategoryChange(category)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                activeCategory === category
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-transparent text-muted-foreground hover:bg-accent',
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
