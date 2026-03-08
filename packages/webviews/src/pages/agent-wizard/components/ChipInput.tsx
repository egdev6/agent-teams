import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { helpTextClass } from './styles';

type ChipInputProps = {
  label: string;
  helpText?: string;
  items: string[];
  setItems: (items: string[]) => void;
  placeholder?: string;
  id: string;
};

export const ChipInput: React.FC<ChipInputProps> = ({
  label,
  helpText,
  items,
  setItems,
  placeholder,
  id,
}) => {
  const [input, setInput] = useState('');

  const add = () => {
    const val = input.trim();
    if (!val || items.includes(val)) {
      setInput('');
      return;
    }
    setItems([...items, val]);
    setInput('');
  };

  return (
    <div className='flex flex-col gap-2'>
      <Label htmlFor={id}>{label}</Label>
      {helpText && <p className={helpTextClass}>{helpText}</p>}
      <div className='flex gap-2'>
        <Input
          id={id}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type='button' variant='vscode' size='icon' onClick={add}>
          <Plus className='h-4 w-4' />
        </Button>
      </div>
      {items.length > 0 ? (
        <div className='flex flex-wrap gap-2'>
          {items.map((item) => (
            <Badge key={item} variant='secondary' className='gap-1.5 pl-2'>
              {item}
              <button
                type='button'
                onClick={() => setItems(items.filter((i) => i !== item))}
                className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
              >
                <X className='h-3 w-3' />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className={helpTextClass}>None added.</p>
      )}
    </div>
  );
};
