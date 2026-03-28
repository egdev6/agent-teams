import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { helpTextClass } from './styles';

export type AgentOption = { id: string; name: string; role: string };

type AgentComboInputProps = {
  id: string;
  label: string;
  helpText?: string;
  items: string[];
  setItems: (items: string[]) => void;
  availableAgents: AgentOption[];
  currentAgentId?: string;
  placeholder?: string;
};

export const AgentComboInput: React.FC<AgentComboInputProps> = ({
  id,
  label,
  helpText,
  items,
  setItems,
  availableAgents,
  currentAgentId,
  placeholder,
}) => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = availableAgents.filter(
    (a) =>
      a.id !== currentAgentId &&
      !items.includes(a.id) &&
      (input === '' ||
        a.name.toLowerCase().includes(input.toLowerCase()) ||
        a.role.toLowerCase().includes(input.toLowerCase())),
  );

  const addValue = (value: string) => {
    const val = value.trim();
    if (!val || items.includes(val)) {
      setInput('');
      setIsOpen(false);
      return;
    }
    setItems([...items, val]);
    setInput('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Add first filtered agent if exists, otherwise add free text
      if (filtered.length > 0) {
        addValue(filtered[0].id);
      } else {
        addValue(input);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className='flex flex-col gap-2' ref={containerRef}>
      <Label htmlFor={id}>{label}</Label>
      {helpText && <p className={helpTextClass}>{helpText}</p>}
      <div className='relative flex gap-2'>
        <div className='relative flex-1'>
          <Input
            id={id}
            placeholder={placeholder}
            value={input}
            autoComplete='off'
            onChange={(e) => {
              setInput(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
          />
          {isOpen && filtered.length > 0 && (
            <div className='absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-md'>
              <ul className='max-h-48 overflow-auto py-1'>
                {filtered.map((agent) => (
                  <li
                    key={agent.id}
                    className='flex cursor-pointer flex-col px-3 py-1.5 hover:bg-accent'
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addValue(agent.id);
                    }}
                  >
                    <span className='text-sm font-medium'>{agent.name}</span>
                    <span className='text-xs text-muted-foreground'>{agent.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <Button
          type='button'
          variant='vscode'
          size='icon'
          onClick={() => addValue(filtered.length > 0 ? filtered[0].id : input)}
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>
      {items.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {items.map((item) => {
            const agent = availableAgents.find((a) => a.id === item);
            return (
              <Badge key={item} variant='secondary' className='gap-1.5 pl-2'>
                {agent ? agent.name : item}
                <button
                  type='button'
                  onClick={() => setItems(items.filter((i) => i !== item))}
                  className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : (
        <p className={helpTextClass}>None added.</p>
      )}
    </div>
  );
};
