import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { ExternalLink, Plus, SearchX, Sparkles, Tag, X } from 'lucide-react';

type CreateAgentSkillsCardProps = {
  skillInput: string;
  skills: string[];
  setSkillInput: (value: string) => void;
  addSkill: () => void;
  removeSkill: (skill: string) => void;
  onBrowseRegistry: () => void;
};

export const CreateAgentSkillsCard: React.FC<CreateAgentSkillsCardProps> = ({
  skillInput,
  skills,
  setSkillInput,
  addSkill,
  removeSkill,
  onBrowseRegistry,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Sparkles className='h-4 w-4 text-primary' />
          Skills
        </CardTitle>
        <CardDescription className='flex items-center justify-between'>
          <span>Custom instructions or capabilities added to this agent</span>
          <Button
            variant='ghost'
            size='sm'
            className='h-6 gap-1 px-2 text-xs'
            onClick={onBrowseRegistry}
          >
            <ExternalLink className='h-3 w-3' />
            Browse registry
          </Button>
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='flex gap-2'>
          <Input
            placeholder='e.g. prefer-functional, strict-types...'
            value={skillInput}
            onChange={(event) => setSkillInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addSkill();
              }
            }}
          />
          <Button variant='outline' size='sm' onClick={addSkill}>
            <Plus className='h-4 w-4' />
          </Button>
        </div>

        {skills.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            {skills.map((skill) => (
              <Badge key={skill} variant='secondary' className='gap-1.5 pl-2'>
                <Tag className='h-3 w-3' />
                {skill}
                <button
                  type='button'
                  onClick={() => removeSkill(skill)}
                  className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {skills.length === 0 && (
          <div className='flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-center'>
            <SearchX className='mb-3 h-8 w-8 text-muted-foreground' />
            <p className='mb-1 text-sm font-semibold'>No skills added yet</p>
            <p className='mb-3 text-xs text-muted-foreground'>
              Browse the registry to find and add skills for this agent.
            </p>
            <Button variant='vscode' size='sm' onClick={onBrowseRegistry}>
              <ExternalLink className='mr-1.5 h-3.5 w-3.5' />
              Browse registry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
