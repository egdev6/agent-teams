import { StatCard } from '@components/shared/StatCard';
import { CheckCircle, CircleAlert, FileText, ShieldHalf, Users } from 'lucide-react';
import { Card } from '@/components/ui';
import type { DashboardStats } from '../../../types';

type StatsGridProps = {
  stats: DashboardStats;
  hasActiveTeam: boolean;
};

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, hasActiveTeam }) => {
  return (
    <Card className='grid gap-2 grid-cols-4 p-4'>
      <StatCard
        icon={
          stats.profileStatus === 'Active'
            ? CheckCircle
            : stats.profileStatus === 'Error'
              ? Users
              : CircleAlert
        }
        title='Profile Status'
        value={stats.profileStatus}
        label='Project configuration'
        status={
          stats.profileStatus === 'Active'
            ? 'success'
            : stats.profileStatus === 'Not configured'
              ? 'error'
              : 'warning'
        }
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
        icon={Users}
        title='Total Agents'
        value={stats.totalAgents > 0 ? stats.totalAgents : 'No agents'}
        label={
          hasActiveTeam
            ? `${stats.agents.length} active in team · ${stats.totalAgents} in catalog`
            : `${stats.totalAgents} in catalog`
        }
        status={stats.totalAgents > 0 ? 'default' : 'warning'}
      />
      <StatCard
        icon={FileText}
        title='Skills'
        value={stats.validAgentYamlCount > 0 ? stats.validAgentYamlCount : 'No valid agent YAMLs'}
        label={`Valid agent YAML files (total: ${stats.agentYamlCount})`}
        status={stats.validAgentYamlCount > 0 ? 'default' : 'warning'}
      />
    </Card>
  );
};
