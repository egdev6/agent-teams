import { Settings } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

export const ConfigureProjectCard = ({ onEditProfile }: { onEditProfile: () => void }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure Your Project</CardTitle>
        <CardDescription>
          For starting to use the dashboard, you need to configure your profile with your project
          specifications. This will unlock all dashboard features and allow you to manage your
          agents and teams efficiently.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={onEditProfile}>
          <Settings className="mr-2 h-4 w-4" />
          Configure Profile
        </Button>
      </CardContent>
    </Card>
  );
};
