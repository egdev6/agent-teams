import { Button } from '@components/ui/button';
import { ArrowLeft, Bot } from 'lucide-react';

type EditAgentHeaderProps = {
  onBack: () => void;
};

export const EditAgentHeader: React.FC<EditAgentHeaderProps> = ({ onBack }) => {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Bot className="h-5 w-5 text-primary" />
          Edit Agent
        </h1>
        <p className="text-sm text-muted-foreground">Modify the agent&apos;s identity and skills</p>
      </div>
    </div>
  );
};
