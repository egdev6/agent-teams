import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

type PathsCardProps = {
  paths: Record<string, string>;
  onPathChange: (key: string, value: string) => void;
  onRemovePath: (key: string) => void;
};

export const PathsCard: React.FC<PathsCardProps> = ({ paths, onPathChange, onRemovePath }) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAddPath = () => {
    const key = newKey.trim();
    if (!key) return;
    onPathChange(key, newValue.trim() || '.');
    setNewKey('');
    setNewValue('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paths</CardTitle>
        <CardDescription>
          Configure project path aliases used by agents and templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(paths).map(([key, value]) => (
          <div key={key} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2">
            <Input value={key} readOnly />
            <Input value={value} onChange={(event) => onPathChange(key, event.target.value)} />
            <Button variant="outline" size="icon" onClick={() => onRemovePath(key)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="border-t pt-3 flex flex-col gap-2">
          <Label>Add Path</Label>
          <div className="grid grid-cols-[1fr_2fr_auto] items-center gap-2">
            <Input
              placeholder="key (e.g. frontend_root)"
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
            />
            <Input
              placeholder="value (e.g. ./src)"
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
            />
            <Button variant="vscode" size="icon" onClick={handleAddPath}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
