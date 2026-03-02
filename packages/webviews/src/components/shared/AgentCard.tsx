/**
 * AgentCard Component
 * Displays agent information in a card format
 */

import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@components/ui/card';
import { cn } from '@lib/utils';
import { Edit, Play, Trash2, User } from 'lucide-react';

interface AgentCardProps {
  id: string;
  name: string;
  role?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'error';
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRun?: (id: string) => void;
  className?: string;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  id,
  name,
  role,
  description,
  status = 'inactive',
  onEdit,
  onDelete,
  onRun,
  className,
}) => {
  const statusColors = {
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    inactive: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <Card className={cn('transition-all hover:shadow-lg', className)}>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <CardTitle className='flex items-center gap-2'>
              <User className='h-5 w-5' />
              {name}
            </CardTitle>
            {role && (
              <CardDescription className='mt-1'>
                <Badge variant='outline' className='text-xs'>
                  {role}
                </Badge>
              </CardDescription>
            )}
          </div>
          <div className={cn('rounded-full px-2 py-1 text-xs font-medium', statusColors[status])}>
            {status}
          </div>
        </div>
      </CardHeader>

      {description && (
        <CardContent>
          <p className='text-sm text-muted-foreground'>{description}</p>
        </CardContent>
      )}

      <CardFooter className='flex gap-2'>
        {onRun && (
          <Button size='sm' variant='vscode' onClick={() => onRun(id)}>
            <Play className='h-4 w-4' />
            Run
          </Button>
        )}
        {onEdit && (
          <Button size='sm' variant='outline' onClick={() => onEdit(id)}>
            <Edit className='h-4 w-4' />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button size='sm' variant='destructive' onClick={() => onDelete(id)}>
            <Trash2 className='h-4 w-4' />
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
