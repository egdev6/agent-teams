/**
 * Optimized ProfileEditorPage with React 19 features
 * Uses useOptimistic for better UX
 */

import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { useOptimistic } from '@lib/react19-hooks';
import { vscode } from '@lib/vscode';
import { AlertCircle, Loader2, Save, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Profile {
  name: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'monorepo' | 'library';
  technologies: string[];
}

const ProfileEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Profile state with optimistic updates
  const [profile, setProfile] = useState<Profile>({
    name: 'My Project',
    type: 'fullstack',
    technologies: ['react', 'typescript', 'node'],
  });

  const [optimisticProfile, setOptimisticProfile] = useOptimistic(
    profile,
    (_current: Profile, newProfile: Profile) => newProfile,
  );

  const handleSave = async () => {
    setIsSaving(true);

    // Optimistically update UI
    setOptimisticProfile(profile);

    // Send to extension
    vscode.postMessage({ type: 'saveProfile', profile });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSaving(false);
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleTypeChange = (type: Profile['type']) => {
    const newProfile = { ...profile, type };
    setProfile(newProfile);
    setOptimisticProfile(newProfile);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Warning Banner */}
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

      {/* Basic Information */}
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
              value={optimisticProfile.name}
              onChange={(e) => {
                const newProfile = { ...profile, name: e.target.value };
                setProfile(newProfile);
                setOptimisticProfile(newProfile);
              }}
              placeholder="My Awesome Project"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label>Project Type</Label>
            <div className="flex flex-wrap gap-2">
              {(['frontend', 'backend', 'fullstack', 'monorepo', 'library'] as const).map(
                (type) => (
                  <Badge
                    key={type}
                    variant={optimisticProfile.type === type ? 'default' : 'outline'}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => !isSaving && handleTypeChange(type)}
                  >
                    {type}
                  </Badge>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technologies */}
      <Card>
        <CardHeader>
          <CardTitle>Technologies</CardTitle>
          <CardDescription>Select the technologies used in your project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {optimisticProfile.technologies.map((tech) => (
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

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} variant="default">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ProfileEditorPage;
