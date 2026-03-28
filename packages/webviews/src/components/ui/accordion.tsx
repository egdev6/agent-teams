import { cn } from '@lib/utils';
import { ChevronDown } from 'lucide-react';
import { createContext, useContext, useState } from 'react';

// ── Context ──────────────────────────────────────────────────────────────────

type AccordionContextValue = {
  type: 'single' | 'multiple';
  openItems: Set<string>;
  toggle: (value: string) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

const useAccordion = () => {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error('Accordion compound components must be used within <Accordion>');
  return ctx;
};

// ── Accordion ─────────────────────────────────────────────────────────────────

type AccordionProps = {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
};

const Accordion: React.FC<AccordionProps> = ({
  type = 'multiple',
  defaultValue,
  className,
  children,
}) => {
  const initial = defaultValue
    ? new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue])
    : new Set<string>();

  const [openItems, setOpenItems] = useState<Set<string>>(initial);

  const toggle = (value: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (type === 'single') next.clear();
        next.add(value);
      }
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ type, openItems, toggle }}>
      <div className={cn('divide-y divide-border', className)}>{children}</div>
    </AccordionContext.Provider>
  );
};

// ── AccordionItem ─────────────────────────────────────────────────────────────

type AccordionItemProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

const AccordionItem: React.FC<AccordionItemProps> = ({ value, className, children }) => {
  const { openItems, toggle } = useAccordion();
  const isOpen = openItems.has(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen, toggle }}>
      <div className={className}>{children}</div>
    </AccordionItemContext.Provider>
  );
};

// ── AccordionItem Context ─────────────────────────────────────────────────────

type AccordionItemContextValue = {
  value: string;
  isOpen: boolean;
  toggle: (value: string) => void;
};

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

const useAccordionItem = () => {
  const ctx = useContext(AccordionItemContext);
  if (!ctx)
    throw new Error('AccordionTrigger/AccordionContent must be used within <AccordionItem>');
  return ctx;
};

// ── AccordionTrigger ──────────────────────────────────────────────────────────

type AccordionTriggerProps = {
  className?: string;
  children: React.ReactNode;
};

const AccordionTrigger: React.FC<AccordionTriggerProps> = ({ className, children }) => {
  const { value, isOpen, toggle } = useAccordionItem();

  return (
    <button
      type='button'
      onClick={() => toggle(value)}
      className={cn(
        'w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors',
        className,
      )}
    >
      {children}
      <ChevronDown
        className={cn(
          'h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0',
          isOpen && 'rotate-180',
        )}
      />
    </button>
  );
};

// ── AccordionContent ──────────────────────────────────────────────────────────

type AccordionContentProps = {
  className?: string;
  children: React.ReactNode;
};

const AccordionContent: React.FC<AccordionContentProps> = ({ className, children }) => {
  const { isOpen } = useAccordionItem();

  if (!isOpen) return null;

  return <div className={cn('px-6 pb-5', className)}>{children}</div>;
};

// ── Exports ───────────────────────────────────────────────────────────────────

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
