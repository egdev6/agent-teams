import { AgentManagerCard } from '@components/shared/AgentManagerCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import type { AgentItem } from '@/models';

type EditAgentPreviewCardProps = {
  agentId?: string;
  name: string;
  role: string;
  description: string;
  intents?: string[];
  teamIds?: string[];
};

export const EditAgentPreviewCard: React.FC<EditAgentPreviewCardProps> = ({
  agentId,
  name,
  role,
  description,
  intents,
  teamIds,
}) => {
  const previewAgent: AgentItem = {
    id: agentId ?? 'preview',
    name: name || 'Unnamed Agent',
    role: (role as AgentItem['role']) || undefined,
    description: description || undefined,
    intents: intents?.length ? intents : undefined,
    teamIds: teamIds?.length ? teamIds : undefined,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Preview</CardTitle>
        <CardDescription>How this agent will appear in your workspace</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <AgentManagerCard agent={previewAgent} />
      </CardContent>
    </Card>
  );
};
