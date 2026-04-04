import { cn } from '@lib/utils';
import * as React from 'react';

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      disabled={disabled}
      ref={ref}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-[rgba(255,255,255,0.07)] transition-[background,border-color,box-shadow] duration-250',
        'focus-visible:outline-none focus-visible:border-[rgba(255,0,54,0.55)] focus-visible:shadow-(--shadow-neon-ghost)',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'bg-[rgba(255,0,54,0.55)] border-[rgba(255,0,54,0.55)] shadow-(--shadow-neon-ghost)'
          : 'bg-[rgba(255,255,255,0.025)]',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none block h-3.5 w-3.5 rounded-full shadow ring-0 transition-transform duration-250',
          checked ? 'translate-x-4 bg-white' : 'translate-x-0.5 bg-[rgba(255,255,255,0.4)]',
        )}
      />
    </button>
  ),
);
Switch.displayName = 'Switch';

export { Switch };
