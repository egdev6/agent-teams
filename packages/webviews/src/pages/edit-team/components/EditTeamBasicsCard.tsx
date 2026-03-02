import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import { Plus, X } from 'lucide-react';
import type { useEditTeamLogic } from '../useEditTeamLogic';

const fieldClass =
  'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type EditTeamBasicsCardProps = {
  model: ReturnType<typeof useEditTeamLogic>;
};

export const EditTeamBasicsCard: React.FC<EditTeamBasicsCardProps> = ({ model }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Basic Information</CardTitle>
        <CardDescription>Name and purpose of this team</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='team-name'>Team Name *</Label>
          <Input
            id='team-name'
            placeholder='e.g. Frontend Quality Team'
            value={model.name}
            onChange={(event) => model.setName(event.target.value)}
          />
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='team-description'>Description</Label>
          <textarea
            id='team-description'
            rows={3}
            placeholder='What is this team responsible for?'
            value={model.description}
            onChange={(event) => model.setDescription(event.target.value)}
            className={cn(fieldClass, 'resize-none py-2')}
          />
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='team-tags'>Tags</Label>
          <div className='flex gap-2'>
            <Input
              id='team-tags'
              placeholder='e.g. frontend, quality...'
              value={model.tagInput}
              onChange={(event) => model.setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  model.addTag();
                }
              }}
            />
            <Button variant='outline' size='sm' onClick={model.addTag}>
              <Plus className='h-4 w-4' />
            </Button>
          </div>

          {model.tags.length > 0 && (
            <div className='flex flex-wrap gap-2 pt-1'>
              {model.tags.map((tag) => (
                <Badge key={tag} variant='secondary' className='gap-1.5 pl-2'>
                  {tag}
                  <button
                    type='button'
                    onClick={() => model.removeTag(tag)}
                    className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
                  >
                    <X className='h-3 w-3' />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
