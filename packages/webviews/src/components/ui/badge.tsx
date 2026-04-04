import { cn } from '@lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gradient-to-r from-[#ff1a4b] to-[#cc0030] text-white shadow-[var(--shadow-neon-default)]',
        warning: 'bg-secondary border border-status-warning text-secondary-foreground shadow-sm',
        success: 'bg-secondary border border-status-success text-secondary-foreground shadow-sm',
        secondary:
          'bg-[rgba(255,0,54,0.06)] border border-[rgba(255,0,54,0.55)] text-white shadow-[var(--shadow-neon-ghost)] hover:bg-[rgba(255,0,54,0.12)]',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.025)] text-foreground',
        vscode: 'border-transparent bg-vscode-badge-bg text-vscode-badge-fg',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
