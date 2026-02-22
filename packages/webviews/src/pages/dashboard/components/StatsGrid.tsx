import { StatCard } from '@components/shared/StatCard';
import { CheckCircle, CircleAlert, FileText, Users } from 'lucide-react';
import type { DashboardStats } from '../../../types';

type StatsGridProps = {
  stats: DashboardStats;
  hasActiveTeam: boolean;
};

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, hasActiveTeam }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={
          stats.profileStatus === 'Active'
            ? CheckCircle
            : stats.profileStatus === 'Error'
              ? Users
              : CircleAlert
        }
        title="Profile Status"
        value={stats.profileStatus}
        label="Project configuration"
        badge={
          stats.profileStatus === 'Active'
            ? { text: 'Configured', variant: 'success' }
            : stats.profileStatus === 'Error'
              ? { text: 'Invalid', variant: 'error' }
              : { text: 'Not configured', variant: 'warning' }
        }
      />
      <StatCard
        icon={Users}
        title="Team Selected"
        value={
          stats.activeTeamId
            ? stats.teams.find((team) => team.id === stats.activeTeamId)?.name || 'Unknown'
            : 'No team selected'
        }
        label="Team active"
      />
      <StatCard
        icon={Users}
        title="Total Agents"
        value={stats.totalAgents}
        label={hasActiveTeam ? 'Agents del team activo' : 'Agents en workspace'}
      />
      <StatCard
        icon={FileText}
        title="Skills"
        value={stats.validSpecs}
        label={`Valid spec files (total: ${stats.specCount})`}
      />
    </div>
  );
};
