import { Button } from '../ui/button';

type PageTitleProps = {
  title: string;
  description?: string;
  button?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
};

export const PageTitle: React.FC<PageTitleProps> = ({ title, description, button }) => {
  return (
    <div className='w-full flex items-center justify-between'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-xl font-bold'>{title}</h1>
        {description && <p className='text-sm text-muted-foreground'>{description}</p>}
      </div>
      {button && (
        <Button onClick={button.onClick}>
          {button.icon && <button.icon className='mr-2 h-4 w-4' />}
          {button.label}
        </Button>
      )}
    </div>
  );
};
