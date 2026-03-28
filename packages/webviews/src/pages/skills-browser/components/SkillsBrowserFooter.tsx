import { Separator } from '@components/ui/separator';

type SkillsBrowserFooterProps = {
  filteredCount: number;
  totalCount: number;
};

export const SkillsBrowserFooter: React.FC<SkillsBrowserFooterProps> = ({
  filteredCount,
  totalCount,
}) => {
  return (
    <>
      <Separator />
      <div className='flex items-center justify-between pb-4'>
        <p className='text-xs text-muted-foreground'>
          Showing {filteredCount} of {totalCount} skills
        </p>
      </div>
    </>
  );
};
