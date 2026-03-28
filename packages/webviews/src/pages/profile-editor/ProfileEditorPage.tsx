import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@components/ui/accordion';
import { Badge } from '@components/ui/badge';
import { Card } from '@components/ui/card';
import { cn } from '@lib/utils';
import { PageTitle } from '@/components/shared/PageTitle';
import { BasicInformationCard } from './components/BasicInformationCard';
import { ContextPacksSelectionCard } from './components/ContextPacksSelectionCard';
import { GitignoreCard } from './components/GitignoreCard';
import { KeyValueEditor } from './components/PathsCommandsCard';
import { ProfileEditorActions } from './components/ProfileEditorActions';
import { SYNC_TARGETS, SyncTargetsCard } from './components/SyncTargetsCard';
import { TechnologiesCard } from './components/TechnologiesCard';
import { useProfileEditorLogic } from './useProfileEditorLogic';

// ── Summary helpers ────────────────────────────────────────────────────────────

type SummaryBadgesProps = { items: string[]; max?: number; className?: string };

const SummaryBadges: React.FC<SummaryBadgesProps> = ({ items, max, className }) => {
  if (!items.length) return null;
  const visible = max !== undefined ? items.slice(0, max) : items;
  const extra = max !== undefined ? items.length - max : 0;
  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {visible.map((item) => (
        <Badge key={item} variant='secondary' className='text-xs py-0 h-5 font-normal'>
          {item}
        </Badge>
      ))}
      {extra > 0 && <span className='text-xs text-muted-foreground'>+{extra}</span>}
    </div>
  );
};

type SectionTriggerProps = {
  title: string;
  count?: number;
  summary?: React.ReactNode;
};

const SectionTrigger: React.FC<SectionTriggerProps> = ({ title, count, summary }) => (
  <div className='flex flex-col items-start gap-1.5 min-w-0'>
    <div className='flex items-center gap-2'>
      <span className='font-semibold text-sm'>{title}</span>
      {count !== undefined && (
        <span className='text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded'>
          {count}
        </span>
      )}
    </div>
    {summary}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const ProfileEditorPage: React.FC = () => {
  const {
    profile,
    isSaving,
    isDetecting,
    detectionError,
    availableContextPacks,
    handleIdChange,
    handleNameChange,
    handleVersionChange,
    handleTypeChange,
    handleToggleTechnology,
    handleAddTechnology,
    handlePathChange,
    handleRemovePath,
    handleCommandChange,
    handleRemoveCommand,
    handleToggleContextPack,
    handleManageContextPacks,
    handlePreviewContextPacks,
    packPreview,
    isPreviewLoading,
    handleToggleSyncTarget,
    handleToggleGitignoreTarget,
    handleToggleAddToGitignore,
    gitignoreStatus,
    syncTargetsError,
    requestDetection,
    handleSave,
    handleCancel,
  } = useProfileEditorLogic();

  const syncTargetLabels = SYNC_TARGETS.filter((t) => profile.syncTargets.includes(t.id)).map(
    (t) => t.label,
  );

  return (
    <div className='w-full space-y-6 animate-fade-in'>
      <PageTitle
        title='Edit Profile'
        description='Modify your project profile settings and configurations.'
      />

      <Card className='overflow-hidden'>
        <Accordion type='single' defaultValue='basic'>
          {/* Basic Information */}
          <AccordionItem value='basic'>
            <AccordionTrigger>
              <SectionTrigger
                title='Basic Information'
                summary={
                  profile.name ? (
                    <span className='text-xs text-muted-foreground'>
                      {profile.name} · {profile.type}
                    </span>
                  ) : null
                }
              />
            </AccordionTrigger>
            <AccordionContent>
              <BasicInformationCard
                profile={profile}
                onIdChange={handleIdChange}
                onNameChange={handleNameChange}
                onVersionChange={handleVersionChange}
                onTypeChange={handleTypeChange}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Context Packs */}
          <AccordionItem value='context-packs'>
            <AccordionTrigger>
              <SectionTrigger
                title='Context Packs'
                count={profile.contextPacks.length}
                summary={<SummaryBadges items={[...profile.contextPacks].sort()} max={4} />}
              />
            </AccordionTrigger>
            <AccordionContent>
              <ContextPacksSelectionCard
                availablePacks={availableContextPacks}
                selectedPacks={profile.contextPacks}
                onTogglePack={handleToggleContextPack}
                onManagePacks={handleManageContextPacks}
                onPreview={handlePreviewContextPacks}
                packPreview={packPreview}
                isPreviewLoading={isPreviewLoading}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Sync Targets */}
          <AccordionItem value='sync-targets'>
            <AccordionTrigger>
              <SectionTrigger
                title='Sync Targets'
                count={profile.syncTargets.length}
                summary={<SummaryBadges items={syncTargetLabels} max={4} />}
              />
            </AccordionTrigger>
            <AccordionContent>
              <SyncTargetsCard
                selectedTargets={profile.syncTargets}
                gitignoreTargets={profile.gitignoreTargets}
                onToggleTarget={handleToggleSyncTarget}
                onToggleGitignoreTarget={handleToggleGitignoreTarget}
                error={syncTargetsError}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Technologies */}
          <AccordionItem value='technologies'>
            <AccordionTrigger>
              <SectionTrigger
                title='Technologies'
                count={profile.technologies.length}
                summary={<SummaryBadges items={[...profile.technologies].sort()} />}
              />
            </AccordionTrigger>
            <AccordionContent>
              <TechnologiesCard
                technologies={profile.technologies}
                onToggleTechnology={handleToggleTechnology}
                onAddTechnology={handleAddTechnology}
                onDetectTechnologies={requestDetection}
                isDetecting={isDetecting}
                detectionError={detectionError}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Paths */}
          <AccordionItem value='paths'>
            <AccordionTrigger>
              <SectionTrigger
                title='Paths'
                count={Object.keys(profile.paths).length}
                summary={<SummaryBadges items={Object.keys(profile.paths)} max={4} />}
              />
            </AccordionTrigger>
            <AccordionContent>
              <KeyValueEditor
                entries={profile.paths}
                onEntryChange={handlePathChange}
                onRemoveEntry={handleRemovePath}
                addLabel='Add Path'
                keyPlaceholder='key (e.g. frontend_root)'
                valuePlaceholder='value (e.g. ./src)'
              />
            </AccordionContent>
          </AccordionItem>

          {/* Commands */}
          <AccordionItem value='commands'>
            <AccordionTrigger>
              <SectionTrigger
                title='Commands'
                count={Object.keys(profile.commands).length}
                summary={<SummaryBadges items={Object.keys(profile.commands)} max={4} />}
              />
            </AccordionTrigger>
            <AccordionContent>
              <KeyValueEditor
                entries={profile.commands}
                onEntryChange={handleCommandChange}
                onRemoveEntry={handleRemoveCommand}
                addLabel='Add Command'
                keyPlaceholder='key (e.g. lint)'
                valuePlaceholder='value (e.g. pnpm lint)'
              />
            </AccordionContent>
          </AccordionItem>

          {/* Gitignore */}
          <AccordionItem value='gitignore'>
            <AccordionTrigger>
              <SectionTrigger
                title='.gitignore'
                summary={
                  profile.addToGitignore || gitignoreStatus === true ? (
                    <span className='text-xs text-muted-foreground'>
                      {gitignoreStatus === true
                        ? 'Already ignored'
                        : '.agent-teams/ will be ignored'}
                    </span>
                  ) : null
                }
              />
            </AccordionTrigger>
            <AccordionContent>
              <GitignoreCard
                checked={profile.addToGitignore}
                alreadyIgnored={gitignoreStatus === true}
                onToggle={handleToggleAddToGitignore}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <ProfileEditorActions isSaving={isSaving} onCancel={handleCancel} onSave={handleSave} />
    </div>
  );
};

export default ProfileEditorPage;
