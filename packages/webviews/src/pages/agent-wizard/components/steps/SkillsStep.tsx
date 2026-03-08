import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import { AlertCircle, CheckCircle, Download, ExternalLink, X } from 'lucide-react';
import type { AgentSkillRef, CatalogSkillEntry } from '../../../../models';
import { fieldClass, helpTextClass } from '../styles';

type SkillsStepProps = {
  skills: AgentSkillRef[];
  catalogSkills: CatalogSkillEntry[];
  addSkill: (entry: CatalogSkillEntry) => void;
  removeSkill: (id: string) => void;
  updateSkill: (id: string, patch: Partial<AgentSkillRef>) => void;
  onInstallCatalogSkill: (skillId: string) => void;
  onBrowseRegistry: () => void;
};

export const SkillsStep: React.FC<SkillsStepProps> = ({
  skills,
  catalogSkills,
  addSkill,
  removeSkill,
  updateSkill,
  onInstallCatalogSkill,
  onBrowseRegistry,
}) => {
  return (
    <div className='space-y-4'>
      {catalogSkills.length > 0 && (
        <div className='space-y-2'>
          <Label>Skills Catalog</Label>
          <p className={helpTextClass}>
            Add skills from the project catalog. Install missing ones to make them available in the
            workspace.
          </p>
          <div className='space-y-1.5'>
            {catalogSkills.map((entry) => {
              const isAdded = skills.some((skill) => skill.id === entry.id);
              return (
                <div
                  key={entry.id}
                  className='flex items-center justify-between gap-2 rounded-md border border-border p-2'
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    {entry.materialized ? (
                      <CheckCircle className='h-4 w-4 shrink-0 text-green-500' />
                    ) : (
                      <AlertCircle className='h-4 w-4 shrink-0 text-yellow-500' />
                    )}
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium'>{entry.title}</p>
                      <div className='flex flex-wrap gap-1'>
                        <Badge variant='outline' className='h-4 px-1 text-xs'>
                          {entry.version}
                        </Badge>
                        {entry.tags.map((tag) => (
                          <Badge key={tag} variant='secondary' className='h-4 px-1 text-xs'>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className='flex shrink-0 gap-1'>
                    {!entry.materialized && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-6 gap-1 px-2 text-xs'
                        onClick={() => onInstallCatalogSkill(entry.id)}
                      >
                        <Download className='h-3 w-3' />
                        Install
                      </Button>
                    )}
                    <Button
                      type='button'
                      variant={isAdded ? 'default' : 'outline'}
                      size='sm'
                      className='h-6 px-2 text-xs'
                      disabled={isAdded}
                      onClick={() => !isAdded && addSkill(entry)}
                    >
                      {isAdded ? 'Added' : 'Add'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className='space-y-2'>
        <Label>Selected Skills</Label>
        {skills.length > 0 ? (
          <div className='space-y-2'>
            {skills.map((skill) => {
              const entry = catalogSkills.find((catalogSkill) => catalogSkill.id === skill.id);
              return (
                <div key={skill.id} className='space-y-2 rounded-md border border-border p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      {entry?.materialized ? (
                        <CheckCircle className='h-3.5 w-3.5 text-green-500' />
                      ) : (
                        <AlertCircle className='h-3.5 w-3.5 text-yellow-500' />
                      )}
                      <span className='text-sm font-medium'>{skill.id}</span>
                    </div>
                    <button
                      type='button'
                      onClick={() => removeSkill(skill.id)}
                      className='rounded-full p-0.5 hover:bg-muted-foreground/20'
                    >
                      <X className='h-3.5 w-3.5' />
                    </button>
                  </div>
                  {entry && !entry.materialized && (
                    <div className='flex items-center gap-1 text-xs text-yellow-600'>
                      <AlertCircle className='h-3 w-3' />
                      Not installed.
                      <button
                        type='button'
                        className='underline'
                        onClick={() => onInstallCatalogSkill(skill.id)}
                      >
                        Install now
                      </button>
                    </div>
                  )}
                  <div className='flex flex-col gap-1'>
                    <Label className='text-xs'>When to invoke</Label>
                    <textarea
                      rows={2}
                      placeholder='Condition or context when this skill should be applied...'
                      value={skill.when ?? ''}
                      onChange={(e) => updateSkill(skill.id, { when: e.target.value })}
                      className={cn(fieldClass, 'resize-none py-1 text-xs')}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className='flex flex-col items-center gap-2'>
            <p className={helpTextClass}>No skills added yet.</p>
            <Button
              variant='outline'
              size='sm'
              className='h-6 gap-1 px-2 text-xs'
              onClick={onBrowseRegistry}
            >
              <ExternalLink className='h-3 w-3' />
              Browse registry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
