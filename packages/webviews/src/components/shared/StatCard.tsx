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
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'error' | 'default';
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, className }) => {
  const _badgeVariantMap = {
    success: 'default' as const,
    warning: 'secondary' as const,
    error: 'destructive' as const,
    default: 'default' as const,
  };

  return (
    <div
      className={cn(
        'transition-all hover:shadow-md border-r last:border-r-0 flex flex-col gap-2',
        className,
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <div className="flex items-start gap-2">
        <div className="rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
};
