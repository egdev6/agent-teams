import { Button } from '../ui/button';

type PageTitleProps = {
  title: string;
  description?: string;
  button?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
};

export const PageTitle: React.FC<PageTitleProps> = ({
  title,
  description,
  button,
  secondaryButton,
}) => {
  return (
    <div className='w-full flex items-center justify-between'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-xl font-bold'>{title}</h1>
        {description && <p className='text-sm text-muted-foreground'>{description}</p>}
      </div>
      <div className='flex gap-2'>
        {secondaryButton && (
          <Button onClick={secondaryButton.onClick} variant='secondary'>
            {secondaryButton.icon && <secondaryButton.icon className='mr-2 h-4 w-4' />}
            {secondaryButton.label}
          </Button>
        )}
        {button && (
          <Button onClick={button.onClick} variant='vscode'>
            {button.icon && <button.icon className='mr-2 h-4 w-4' />}
            {button.label}
          </Button>
        )}
      </div>
    </div>
  );
};
