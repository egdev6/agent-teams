import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Checkbox } from '@components/ui/checkbox';
import { Label } from '@components/ui/label';

type GitignoreCardProps = {
  checked: boolean;
  alreadyIgnored: boolean;
  onToggle: () => void;
};

export const GitignoreCard: React.FC<GitignoreCardProps> = ({
  checked,
  alreadyIgnored,
  onToggle,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>.gitignore</CardTitle>
        <CardDescription>
          Add the <code>.agent-teams/</code> folder to <code>.gitignore</code> to avoid committing
          local agent configuration to version control.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='flex items-start gap-3'>
          <Checkbox
            id='add-to-gitignore'
            className='mt-1'
            checked={alreadyIgnored || checked}
            disabled={alreadyIgnored}
            onCheckedChange={() => !alreadyIgnored && onToggle()}
          />
          <Label
            htmlFor='add-to-gitignore'
            className={alreadyIgnored ? 'cursor-default' : 'cursor-pointer'}
          >
            <span className='block text-sm font-medium'>
              Add <code>.agent-teams/</code> to <code>.gitignore</code>
            </span>
            {alreadyIgnored ? (
              <span className='text-xs text-muted-foreground'>Already present in .gitignore</span>
            ) : (
              <span className='text-xs text-muted-foreground'>
                Prevents committing local agent configuration to version control.
              </span>
            )}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};
