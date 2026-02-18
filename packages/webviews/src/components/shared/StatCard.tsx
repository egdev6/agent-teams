/**
 * StatCard Component - Migrated to shadcn/ui
 * Displays statistics with icons, badges, and values
 */

import { Badge } from '@components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
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

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  title,
  value,
  label,
  badge,
  className,
}) => {
  const badgeVariantMap = {
    success: 'default' as const,
    warning: 'secondary' as const,
    error: 'destructive' as const,
    default: 'default' as const,
  };

  return (
    <Card className={cn('transition-all hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {badge && <Badge variant={badgeVariantMap[badge.variant || 'default']}>{badge.text}</Badge>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
