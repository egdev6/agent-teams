import { StatCard } from '@components/shared/StatCard';
import {
  Brain,
  CheckCircle,
  CircleAlert,
  FileText,
  FolderKanban,
  ShieldHalf,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui';
import type { DashboardStats } from '../../../models';

type StatsGridProps = {
  stats: DashboardStats;
  hasActiveTeam: boolean;
  engramInstalled: boolean;
  engramConfigured: boolean;
};

function memoryValue(installed: boolean, configured: boolean): string {
  if (installed && configured) return 'Active';
  if (!installed) return 'Not installed';
  return 'Not configured';
}

function profileIcon(status: string) {
  if (status === 'Active') return CheckCircle;
  if (status === 'Error') return Users;
  return CircleAlert;
}

function profileStatusVariant(status: string): 'success' | 'error' | 'warning' {
  if (status === 'Active') return 'success';
  if (status === 'Not configured') return 'error';
  return 'warning';
}

function agentsLabel(hasActiveTeam: boolean, stats: DashboardStats): string {
  if (hasActiveTeam)
    return `${stats.agents.length} active in team · ${stats.totalAgents} in catalog`;
  return `${stats.totalAgents} in catalog`;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  hasActiveTeam,
  engramInstalled,
  engramConfigured,
}) => {
  return (
    <Card className='grid gap-x-4 gap-y-1 lg:gap-2 grid-cols-2 lg:grid-cols-6 p-4'>
      <StatCard
        icon={profileIcon(stats.profileStatus)}
        title='Profile Status'
        value={stats.profileStatus}
        label='Project configuration'
        status={profileStatusVariant(stats.profileStatus)}
      />
      <StatCard
        icon={ShieldHalf}
        title='Team Selected'
        value={
          stats.activeTeamId
            ? stats.teams.find((team) => team.id === stats.activeTeamId)?.name || 'Unknown'
            : 'No team selected'
        }
        label='Team active'
        status={stats.activeTeamId ? 'success' : 'error'}
      />
      <StatCard
        icon={Brain}
        title='Engram'
        value={memoryValue(engramInstalled, engramConfigured)}
        label='Engram persistent memory'
        status={engramInstalled && engramConfigured ? 'success' : 'warning'}
      />
      <StatCard
        icon={FileText}
        title='Skills'
        value={
          stats.projectSkillsCount && stats.projectSkillsCount > 0
            ? stats.projectSkillsCount
            : 'No skills'
        }
        label='Available in project (.agent-teams/skills)'
        status={stats.projectSkillsCount && stats.projectSkillsCount > 0 ? 'default' : 'warning'}
      />
      <StatCard
        icon={FolderKanban}
        title='Total Teams'
        value={stats.totalTeams > 0 ? stats.totalTeams : 'No teams'}
        label={`${stats.totalTeams} in catalog`}
        status={stats.totalTeams > 0 ? 'default' : 'warning'}
      />
      <StatCard
        icon={Users}
        title='Total Agents'
        value={stats.totalAgents > 0 ? stats.totalAgents : 'No agents'}
        label={agentsLabel(hasActiveTeam, stats)}
        status={stats.totalAgents > 0 ? 'default' : 'warning'}
      />
    </Card>
  );
};
