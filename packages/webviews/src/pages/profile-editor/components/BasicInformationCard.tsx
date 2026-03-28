import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import type { ProfileFormData, ProjectType } from '../types';

const PROJECT_TYPES: ProjectType[] = ['frontend', 'backend', 'fullstack', 'monorepo', 'library'];

type BasicInformationCardProps = {
  profile: ProfileFormData;
  onIdChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onTypeChange: (value: ProjectType) => void;
};

export const BasicInformationCard: React.FC<BasicInformationCardProps> = ({
  profile,
  onIdChange,
  onNameChange,
  onVersionChange,
  onTypeChange,
}) => {
  return (
    <div className='grid grid-cols-2 gap-4'>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='project-id'>Project ID</Label>
        <Input
          id='project-id'
          value={profile.id}
          onChange={(event) => onIdChange(event.target.value)}
          placeholder='my-project'
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='project-name'>Project Name</Label>
        <Input
          id='project-name'
          value={profile.name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder='My Awesome Project'
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='project-version'>Version</Label>
        <Input
          id='project-version'
          value={profile.version}
          onChange={(event) => onVersionChange(event.target.value)}
          placeholder='1.0.0'
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='project-type'>Project Type</Label>
        <select
          id='project-type'
          value={profile.type}
          onChange={(event) => onTypeChange(event.target.value as ProjectType)}
          className='h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm'
        >
          {PROJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
