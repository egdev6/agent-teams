import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { ChipInput } from '../ChipInput';
import { fieldClass, helpTextClass } from '../styles';

type ScopeStepProps = {
  expertise: string[];
  setExpertise: (v: string[]) => void;
  intents: string[];
  setIntents: (v: string[]) => void;
  scopeTopics: string[];
  setScopeTopics: (v: string[]) => void;
  scopeGlobs: string;
  setScopeGlobs: (v: string) => void;
  scopeExcludes: string[];
  setScopeExcludes: (v: string[]) => void;
};

export const ScopeStep: React.FC<ScopeStepProps> = ({
  expertise,
  setExpertise,
  intents,
  setIntents,
  scopeTopics,
  setScopeTopics,
  scopeGlobs,
  setScopeGlobs,
  scopeExcludes,
  setScopeExcludes,
}) => {
  const globLines = scopeGlobs
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const [newGlobInput, setNewGlobInput] = useState('');
  const [newGlobPriority, setNewGlobPriority] = useState('');

  const addGlob = () => {
    const value = newGlobInput.trim();
    if (!value) return;
    const entry = newGlobPriority ? `${value}::${newGlobPriority}` : value;
    setScopeGlobs([...globLines, entry].join('\n'));
    setNewGlobInput('');
    setNewGlobPriority('');
  };

  const removeGlob = (line: string) => {
    setScopeGlobs(globLines.filter((item) => item !== line).join('\n'));
  };

  return (
    <div className='space-y-5'>
      <ChipInput
        id='agent-expertise'
        label='Expertise'
        helpText='Knowledge areas and specialisations this agent covers (e.g. REST APIs, React, SQL).'
        items={expertise}
        setItems={setExpertise}
        placeholder='e.g. REST APIs'
      />

      <ChipInput
        id='agent-intents'
        label='Intents'
        helpText='Snake_case task patterns this agent handles (used for routing). e.g. endpoint_add, test_fix.'
        items={intents}
        setItems={setIntents}
        placeholder='e.g. endpoint_add'
      />

      <ChipInput
        id='agent-scope-topics'
        label='Scope Topics'
        helpText='Human-readable responsibility topics that describe what this agent manages.'
        items={scopeTopics}
        setItems={setScopeTopics}
        placeholder='e.g. REST endpoint implementation'
      />

      <div className='flex flex-col gap-2'>
        <Label>Path Globs</Label>
        <p className={helpTextClass}>
          File patterns restricting where this agent operates. Optionally add a priority suffix
          (::high, ::medium, ::low).
        </p>
        <div className='flex gap-2'>
          <Input
            placeholder='e.g. src/api/**/*.ts'
            value={newGlobInput}
            onChange={(e) => setNewGlobInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addGlob();
              }
            }}
          />
          <select
            value={newGlobPriority}
            onChange={(e) => setNewGlobPriority(e.target.value)}
            className={cn(fieldClass, 'h-9 w-28 shrink-0')}
          >
            <option value=''>priority</option>
            <option value='high'>high</option>
            <option value='medium'>medium</option>
            <option value='low'>low</option>
          </select>
          <Button type='button' variant='vscode' size='icon' onClick={addGlob}>
            <Plus className='h-4 w-4' />
          </Button>
        </div>
        {globLines.length > 0 ? (
          <div className='flex flex-wrap gap-2'>
            {globLines.map((line) => (
              <Badge key={line} variant='secondary' className='gap-1.5 pl-2 font-mono'>
                {line}
                <button
                  type='button'
                  onClick={() => removeGlob(line)}
                  className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className={helpTextClass}>No path globs added.</p>
        )}
      </div>

      <ChipInput
        id='agent-scope-excludes'
        label='Scope Excludes'
        helpText="File or folder patterns explicitly outside this agent's scope."
        items={scopeExcludes}
        setItems={setScopeExcludes}
        placeholder='e.g. src/legacy/**'
      />
    </div>
  );
};
