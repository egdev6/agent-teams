import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';

type TechnologiesCardProps = {
  technologies: string[];
  onToggleTechnology: (technology: string) => void;
  onAddTechnology: (technology: string) => void;
  onDetectTechnologies: () => void;
  isDetecting: boolean;
  detectionError?: string | null;
};

export const TechnologiesCard: React.FC<TechnologiesCardProps> = ({
  technologies,
  onToggleTechnology,
  onAddTechnology,
  onDetectTechnologies,
  isDetecting,
  detectionError,
}) => {
  const [technologyInput, setTechnologyInput] = useState('');
  const technologyOptions = Array.from(new Set(technologies)).sort();

  const handleAddFromInput = () => {
    onAddTechnology(technologyInput);
    setTechnologyInput('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Technologies</CardTitle>
            <CardDescription>
              Auto-detect technologies and adjust the selection manually.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onDetectTechnologies} disabled={isDetecting}>
            {isDetecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-detect
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {detectionError && <p className="text-sm text-destructive">{detectionError}</p>}
        <div className="flex gap-2">
          <Input
            value={technologyInput}
            placeholder="Add custom technology (e.g. elixir)"
            onChange={(event) => setTechnologyInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddFromInput();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={handleAddFromInput}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {technologyOptions.map((tech) => (
            <Badge
              key={tech}
              variant="outline"
              className="cursor-pointer"
              onClick={() => onToggleTechnology(tech)}
            >
              {tech}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Only detected or manually added technologies are shown. Click a badge to remove it.
        </p>
      </CardContent>
    </Card>
  );
};
