import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export type KeyValueEditorProps = {
  entries: Record<string, string>;
  onEntryChange: (key: string, value: string) => void;
  onRemoveEntry: (key: string) => void;
  addLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
};

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  entries,
  onEntryChange,
  onRemoveEntry,
  addLabel,
  keyPlaceholder,
  valuePlaceholder,
}) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    const key = newKey.trim();
    if (!key) return;
    onEntryChange(key, newValue.trim() || '');
    setNewKey('');
    setNewValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className='space-y-3'>
      {Object.entries(entries).map(([key, value]) => (
        <div key={key} className='grid grid-cols-[1fr_2fr_auto] items-center gap-2'>
          <Input value={key} readOnly />
          <Input value={value} onChange={(e) => onEntryChange(key, e.target.value)} />
          <Button variant='outline' size='icon' onClick={() => onRemoveEntry(key)}>
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>
      ))}

      <div className='border-t pt-3 flex flex-col gap-2'>
        <Label>{addLabel}</Label>
        <div className='grid grid-cols-[1fr_2fr_auto] items-center gap-2'>
          <Input
            placeholder={keyPlaceholder}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Input
            placeholder={valuePlaceholder}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button variant='vscode' size='icon' onClick={handleAdd}>
            <Plus className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  );
};
