import { Label } from '@components/ui/label';
import { Separator } from '@components/ui/separator';
import { Switch } from '@components/ui/switch';
import type { BundledAgentId, BundledResourcesConfig, BundledSkillId } from '../types';

type BundledItem<T extends string> = {
  id: T;
  label: string;
  hint: string;
};

const BUNDLED_AGENTS: BundledItem<BundledAgentId>[] = [
  {
    id: 'agent-designer',
    label: 'Agent Designer',
    hint: 'Helps design and scaffold new agents for your team.',
  },
  {
    id: 'consultant',
    label: 'Consultant',
    hint: 'General advisor for project architecture and decisions.',
  },
  {
    id: 'project-configurator',
    label: 'Project Configurator',
    hint: 'Guides through project setup and configuration.',
  },
];

const BUNDLED_SKILLS: BundledItem<BundledSkillId>[] = [
  {
    id: 'agent-spec-authoring',
    label: 'Agent Spec Authoring',
    hint: 'Instructions for writing agent specifications.',
  },
  {
    id: 'project-spec-authoring',
    label: 'Project Spec Authoring',
    hint: 'Instructions for writing project specifications.',
  },
];

type BundledResourcesCardProps = {
  bundledResources: BundledResourcesConfig;
  onToggle: (group: 'agents' | 'skills', id: string) => void;
};

export const BundledResourcesCard: React.FC<BundledResourcesCardProps> = ({
  bundledResources,
  onToggle,
}) => {
  const groups: Array<{
    key: 'agents' | 'skills';
    label: string;
    items: BundledItem<string>[];
  }> = [
    { key: 'agents', label: 'Agents', items: BUNDLED_AGENTS },
    { key: 'skills', label: 'Skills', items: BUNDLED_SKILLS },
  ];

  return (
    <div className='space-y-3'>
      {groups.map((group, groupIndex) => (
        <div key={group.key}>
          {groupIndex > 0 && <Separator className='my-3' />}
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2'>
            {group.label}
          </p>
          <div className='space-y-3'>
            {group.items.map((item) => {
              const isEnabled =
                bundledResources[group.key][item.id as BundledAgentId & BundledSkillId] !== false;
              return (
                <div key={item.id} className='flex items-center gap-3'>
                  <Switch
                    id={`bundled-${item.id}`}
                    checked={isEnabled}
                    onCheckedChange={() => onToggle(group.key, item.id)}
                  />
                  <Label
                    htmlFor={`bundled-${item.id}`}
                    className='cursor-pointer flex flex-col gap-0.5'
                  >
                    <span className='text-sm font-medium'>{item.label}</span>
                    <span className='text-xs text-muted-foreground'>{item.hint}</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
