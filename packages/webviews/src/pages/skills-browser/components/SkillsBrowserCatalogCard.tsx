import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import type { BrowserSkill } from '@/models';

type SkillsBrowserCatalogCardProps = {
  skills: BrowserSkill[];
  deletingSkillId: string | null;
  onDeleteSkill: (id: string) => void;
};

export const SkillsBrowserCatalogCard: React.FC<SkillsBrowserCatalogCardProps> = ({
  skills,
  deletingSkillId,
  onDeleteSkill,
}) => {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>Project Skills</CardTitle>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No skills found in `.agent-teams/skills`. Install one from Community Skills.
          </p>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2'>
            {skills.map((skill) => {
              const isDeleting = deletingSkillId === skill.id;
              return (
                <div key={skill.id} className='rounded-lg border border-border p-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium'>{skill.name}</p>
                      <p className='truncate text-xs text-muted-foreground'>{skill.id}</p>
                    </div>
                    <Button
                      size='sm'
                      variant='default'
                      disabled={!skill.canDelete || isDeleting}
                      title={skill.deleteDisabledReason}
                      onClick={() => onDeleteSkill(skill.id)}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete Skill'}
                    </Button>
                  </div>

                  <p className='mt-2 line-clamp-3 text-xs text-muted-foreground'>
                    {skill.description}
                  </p>

                  <div className='mt-2 flex flex-wrap gap-1'>
                    {skill.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant='secondary' className='text-[10px]'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {!skill.canDelete && skill.deleteDisabledReason && (
                    <p className='mt-2 text-xs text-muted-foreground'>
                      {skill.deleteDisabledReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
