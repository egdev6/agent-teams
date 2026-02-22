import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import type { ChangeEvent } from 'react';
import type { GlobalCatalogSummary } from '../../../types';

type GlobalCatalogBindingsCardProps = {
  catalog: GlobalCatalogSummary;
  selectedTeamId: string;
  selectedAgentIds: string[];
  selectedSkillIds: string[];
  selectedKitIds: string[];
  onSelectTeamId: (value: string) => void;
  onSelectAgentIds: (value: string[]) => void;
  onSelectSkillIds: (value: string[]) => void;
  onSelectKitIds: (value: string[]) => void;
  onSaveBindings: () => void;
};

export const GlobalCatalogBindingsCard: React.FC<GlobalCatalogBindingsCardProps> = ({
  catalog,
  selectedTeamId,
  selectedAgentIds,
  selectedSkillIds,
  selectedKitIds,
  onSelectTeamId,
  onSelectAgentIds,
  onSelectSkillIds,
  onSelectKitIds,
  onSaveBindings,
}) => {
  const readMultiSelect = (event: ChangeEvent<HTMLSelectElement>): string[] =>
    Array.from(event.target.selectedOptions).map((option) => option.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reuse Global Catalog</CardTitle>
        <CardDescription>
          Selecciona equipos, agentes, kits y skills globales para este proyecto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Team global</label>
          <select
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={selectedTeamId}
            onChange={(event) => onSelectTeamId(event.target.value)}
          >
            <option value="">No vincular team global</option>
            {catalog.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.id})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Agents globales</label>
            <select
              multiple
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
              value={selectedAgentIds}
              onChange={(event) => onSelectAgentIds(readMultiSelect(event))}
            >
              {catalog.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Skills globales</label>
            <select
              multiple
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
              value={selectedSkillIds}
              onChange={(event) => onSelectSkillIds(readMultiSelect(event))}
            >
              {catalog.skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Kits globales</label>
            <select
              multiple
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
              value={selectedKitIds}
              onChange={(event) => onSelectKitIds(readMultiSelect(event))}
            >
              {catalog.kits.map((kit) => (
                <option key={kit.id} value={kit.id}>
                  {kit.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onSaveBindings}>
            Guardar bindings en proyecto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
