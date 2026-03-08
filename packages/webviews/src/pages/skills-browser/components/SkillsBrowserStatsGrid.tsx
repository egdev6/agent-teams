import type { BrowserSkill } from '@/models';

type SkillsBrowserStatsGridProps = {
  skillsRegistry: BrowserSkill[];
  installedIds: Set<string>;
  onCategorySelect: (category: string) => void;
};

const HIGHLIGHT_CATEGORIES = ['TypeScript', 'Testing', 'Security'] as const;

export const SkillsBrowserStatsGrid: React.FC<SkillsBrowserStatsGridProps> = ({
  skillsRegistry,
  installedIds,
  onCategorySelect,
}) => {
  return (
    <div className='grid grid-cols-3 gap-3'>
      {HIGHLIGHT_CATEGORIES.map((category) => {
        const count = skillsRegistry.filter((skill) => skill.category === category).length;
        const installed = skillsRegistry.filter(
          (skill) => skill.category === category && installedIds.has(skill.id),
        ).length;

        return (
          <button
            key={category}
            type='button'
            onClick={() => onCategorySelect(category)}
            className='rounded-md border border-border p-3 text-left transition-colors hover:bg-accent'
          >
            <p className='text-xs text-muted-foreground'>{category}</p>
            <p className='text-lg font-bold'>
              {installed}/{count}
            </p>
            <p className='text-xs text-muted-foreground'>installed</p>
          </button>
        );
      })}
    </div>
  );
};
