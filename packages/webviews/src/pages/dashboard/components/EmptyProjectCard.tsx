import { Ban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export const EmptyProjectCard: React.FC = () => (
  <Card className='w-full border-dashed'>
    <CardContent className='flex flex-col items-center justify-center gap-4 py-16 text-center'>
      <div className='rounded-full bg-muted p-5'>
        <Ban className='h-10 w-10 text-muted-foreground' />
      </div>
      <div className='flex flex-col gap-1 w-[80%]'>
        <h2 className='text-lg font-semibold'>Develop your project idea first</h2>
        <p className='w-full m-auto text-sm text-muted-foreground'>
          Your workspace is empty. Add some project files so we can help you configure agents,
          teams, and workflows tailored to your stack.
        </p>
      </div>
    </CardContent>
  </Card>
);
