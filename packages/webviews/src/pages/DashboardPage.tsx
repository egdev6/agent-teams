import { StatCard } from '@components/shared/StatCard';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { vscode } from '@lib/vscode';
import {
  CheckCircle,
  FileText,
  FolderOpen,
  Package,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  Users,
  Users2,
} from 'lucide-react';
/**
 * Dashboard Page
 * Main landing page showing stats and quick actions
 */
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // TODO: Get real stats from VSCode extension
  const stats = {
    totalAgents: 12,
    validSpecs: 8,
    hasProfile: true,
    syncStatus: 'SYNCED' as const,
    agents: [
      {
        id: 'agent1',
        name: 'John Doe',
        description: 'Project Manager',
        role: 'Project Manager',
      },
      {
        id: 'agent2',
        name: 'Jane Smith',
        description: 'Developer',
        role: 'Developer',
      },
      {
        id: 'agent3',
        name: 'Bob Johnson',
        description: 'Designer',
        role: 'Designer',
      },
      {
        id: 'agent4',
        name: 'Alice Brown',
        description: 'Tester',
        role: 'Tester',
      },
      {
        id: 'agent5',
        name: 'Charlie Wilson',
        description: 'DevOps Engineer',
        role: 'DevOps Engineer',
      },
    ],
  };

  const handleMessage = (type: string, data?: any) => {
    vscode.postMessage({ type, ...data });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => navigate('/profile-editor')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => navigate('/create-agent')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => navigate('/kit-browser')}
          >
            <Package className="mr-2 h-4 w-4" />
            Browse Kits
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => navigate('/skills-browser')}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Browse Skills
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleMessage('syncAgents')}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Agents
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Users}
          title="Total Agents"
          value={stats.totalAgents}
          label="Active agents in workspace"
          badge={{ text: 'Synced', variant: 'success' }}
        />
        <StatCard
          icon={FileText}
          title="Specifications"
          value={stats.validSpecs}
          label="Valid spec files"
        />
        <StatCard
          icon={CheckCircle}
          title="Profile Status"
          value={stats.hasProfile ? 'Active' : 'Not Set'}
          label="Project configuration"
          badge={
            stats.hasProfile
              ? { text: 'Configured', variant: 'success' }
              : { text: 'Setup Required', variant: 'warning' }
          }
        />
      </div>

      {/* Recent Activity / Agents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Agents</CardTitle>
              <CardDescription>Manage and configure your agents</CardDescription>
            </div>
            <Button size="sm" onClick={() => navigate('/team-manager')}>
              <Users2 className="mr-2 h-4 w-4" />
              Manage Teams
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats.totalAgents === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by creating your first agent
              </p>
              <Button onClick={() => navigate('/create-agent')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{agent.name}</CardTitle>
                      <CardDescription>{agent.role}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/edit-agent/${agent.id}`)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
                    </Button>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
