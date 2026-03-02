import { AgentCard } from '@components/shared/AgentCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';

type CreateAgentPreviewCardProps = {
  name: string;
  role: string;
  description: string;
};

export const CreateAgentPreviewCard: React.FC<CreateAgentPreviewCardProps> = ({
  name,
  role,
  description,
}) => {
  return (
    <Card className='sticky top-4'>
      <CardHeader>
        <CardTitle className='text-base'>Preview</CardTitle>
        <CardDescription>How this agent will appear in your workspace</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <AgentCard
          id='preview'
          name={name || 'Unnamed Agent'}
          role={role || undefined}
          description={description || undefined}
          status='inactive'
        />
      </CardContent>
    </Card>
  );
};
