/**
 * StatCard Component - Migrated to shadcn/ui
 * Displays statistics with icons, badges, and values
 */

import { cn } from '@lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  label: string;
  className?: string;
  status?: 'default' | 'success' | 'error' | 'warning';
  badge?: { count: number; tooltip?: string };
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  title,
  value,
  className,
  status,
  badge,
}) => {
  const statusColors = {
    default: 'text-white',
    success: 'text-status-success',
    error: 'text-primary',
    warning: 'text-status-warning',
  };

  return (
    <div
      className={cn(
        'transition-all hover:shadow-md border-b pb-3 lg:pb-0 lg:border-b-0 lg:border-r last:border-r-0 in-last:border-b-0',
        'flex flex-row items-center justify-between gap-2',
        'lg:flex-col lg:items-start lg:justify-start lg:gap-2',
        className,
      )}
    >
      <div className='text-sm font-medium flex gap-2 items-center justify-between'>
        <div className='flex items-center gap-2 w-auto'>
          <Icon className={`h-4 w-4 ${statusColors[status || 'default']}`} />
          <span className='line-clamp-1'>{title}</span>
        </div>
        {badge && badge.count > 0 && (
          <span
            title={badge.tooltip}
            className='text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded-full bg-status-warning/20 text-status-warning'
          >
            {badge.count}
          </span>
        )}
      </div>
      <p className={`text-xs line-clamp-1 ${statusColors[status || 'default']} text-right`}>
        {value}
      </p>
    </div>
  );
};
