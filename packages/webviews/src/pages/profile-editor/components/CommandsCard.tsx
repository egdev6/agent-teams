import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

type CommandsCardProps = {
  commands: Record<string, string>;
  onCommandChange: (key: string, value: string) => void;
  onRemoveCommand: (key: string) => void;
};

export const CommandsCard: React.FC<CommandsCardProps> = ({
  commands,
  onCommandChange,
  onRemoveCommand,
}) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAddCommand = () => {
    const key = newKey.trim();
    if (!key) return;
    onCommandChange(key, newValue.trim());
    setNewKey('');
    setNewValue('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commands</CardTitle>
        <CardDescription>
          Configure command aliases referenced by agents and context packs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(commands).map(([key, value]) => (
          <div key={key} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2">
            <Input value={key} readOnly />
            <Input value={value} onChange={(event) => onCommandChange(key, event.target.value)} />
            <Button variant="outline" size="icon" onClick={() => onRemoveCommand(key)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="border-t pt-3 flex flex-col gap-2">
          <Label>Add Command</Label>
          <div className="grid grid-cols-[1fr_2fr_auto] items-center gap-2">
            <Input
              placeholder="key (e.g. lint)"
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
            />
            <Input
              placeholder="value (e.g. pnpm lint)"
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
            />
            <Button variant="vscode" size="icon" onClick={handleAddCommand}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
