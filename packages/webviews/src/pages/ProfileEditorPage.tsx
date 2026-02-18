/**
 * Profile Editor Page
 * Configure project profile and settings
 */

import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { vscode } from '@lib/vscode';
import { AlertCircle, Save, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProfileEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const [profile, setProfile] = useState({
    name: 'My Project',
    type: 'fullstack' as const,
    technologies: ['react', 'typescript', 'node'],
  });

  const handleSave = async () => {
    setIsSaving(true);
    vscode.postMessage({ type: 'saveProfile', profile });

    setTimeout(() => {
      setIsSaving(false);
      navigate('/');
    }, 1000);
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Card className="border-yellow-500/50 bg-yellow-500/10">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Profile Editor</h3>
            <p className="text-sm text-muted-foreground">
              Configure your project profile to enable automatic agent detection and context packs.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Configure project details and metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="My Awesome Project"
            />
          </div>

          <div className="space-y-2">
            <Label>Project Type</Label>
            <div className="flex flex-wrap gap-2">
              {(['frontend', 'backend', 'fullstack', 'monorepo', 'library'] as const).map(
                (type) => (
                  <Badge
                    key={type}
                    variant={profile.type === type ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setProfile({ ...profile, type: type as any })}
                  >
                    {type}
                  </Badge>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technologies</CardTitle>
          <CardDescription>Select the technologies used in your project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {profile.technologies.map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Technology detection and selection UI coming soon...
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} variant="default">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
};

export default ProfileEditorPage;
