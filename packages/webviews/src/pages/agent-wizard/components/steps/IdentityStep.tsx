import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import { AGENT_ROLES, DOMAIN_OPTIONS } from '../../constants';
import { fieldClass, helpTextClass } from '../styles';

type IdentityStepProps = {
  name: string;
  setName: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  domain: string;
  setDomain: (v: string) => void;
  subdomain: string;
  setSubdomain: (v: string) => void;
};

export const IdentityStep: React.FC<IdentityStepProps> = ({
  name,
  setName,
  role,
  setRole,
  description,
  setDescription,
  domain,
  setDomain,
  subdomain,
  setSubdomain,
}) => {
  const descriptionLength = description.trim().length;

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='agent-name'>Agent Name *</Label>
        <Input
          id='agent-name'
          placeholder='e.g. Backend API Worker'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='agent-role'>Role *</Label>
        <select
          id='agent-role'
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={cn(fieldClass, 'h-9')}
        >
          <option value=''>Select a role...</option>
          {AGENT_ROLES.map((r) => (
            <option key={r.value} value={r.value} title={r.description}>
              {r.label} - {r.description}
            </option>
          ))}
        </select>
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='agent-description'>Description *</Label>
        <textarea
          id='agent-description'
          rows={4}
          placeholder='Describe what this agent does and its primary responsibilities (10-600 chars)...'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={cn(fieldClass, 'resize-none py-2')}
        />
        <p className={cn(helpTextClass, descriptionLength < 10 ? 'text-destructive' : '')}>
          {descriptionLength} / 10 minimum characters
        </p>
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='agent-domain'>Domain</Label>
        <p className={helpTextClass}>Primary problem space this agent focuses on.</p>
        <select
          id='agent-domain'
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className={cn(fieldClass, 'h-9')}
          disabled={role === 'router'}
        >
          <option value=''>Select a domain...</option>
          {DOMAIN_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {role === 'router' && (
          <p className={helpTextClass}>
            Router agents use <code>global</code> domain by default.
          </p>
        )}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='agent-subdomain'>Subdomain</Label>
        <p className={helpTextClass}>
          Narrows the domain into a concrete area of ownership (e.g. <code>api</code>,{' '}
          <code>auth</code>).
        </p>
        <Input
          id='agent-subdomain'
          placeholder='e.g. api'
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value)}
        />
      </div>
    </div>
  );
};
