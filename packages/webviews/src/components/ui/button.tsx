import { cn } from '@lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[box-shadow,background,transform] duration-250 ease-in-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer!',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-[#ff1a4b] to-[#cc0030] text-white font-semibold shadow-[var(--shadow-neon-default)] hover:from-[#ff3366] hover:to-[#e0003a] hover:shadow-[var(--shadow-neon-hover)]',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        warning:
          'bg-status-warning/10 border border-status-warning text-secondary-foreground shadow-sm hover:bg-status-warning/80',
        success:
          'bg-status-success/10 border border-status-success text-secondary-foreground shadow-sm hover:bg-status-success/80',
        outline:
          'border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.025)] backdrop-blur-sm shadow-sm hover:border-[rgba(255,0,54,0.45)] hover:shadow-[var(--shadow-glow)]',
        secondary:
          'bg-[rgba(255,0,54,0.06)] border border-[rgba(255,0,54,0.55)] text-white font-semibold shadow-[var(--shadow-neon-ghost)] hover:bg-[rgba(255,0,54,0.12)] hover:border-[rgba(255,60,90,0.85)] hover:shadow-[var(--shadow-neon-ghost-hover)]',
        ghost: 'hover:bg-[rgba(255,0,54,0.08)] hover:text-white',
        link: 'text-primary underline-offset-4 hover:underline',
        vscode:
          'bg-gradient-to-br from-[#ff1a4b] to-[#cc0030] text-white shadow-[var(--shadow-neon-default)] hover:from-[#ff3366] hover:to-[#e0003a] hover:shadow-[var(--shadow-neon-hover)]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
        xl: 'h-12 px-4 [&_svg]:size-8',
        icon: 'h-9 w-9 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
