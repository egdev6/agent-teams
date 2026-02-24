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
    <Card className="grid gap-2 grid-cols-4 p-4">
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
      />
      <StatCard
        icon={ShieldHalf}
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
    </Card>
  );
};
