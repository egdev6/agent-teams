import { PageTitle } from '@/components/shared/PageTitle';
import { BasicInformationCard } from './components/BasicInformationCard';
import { CommandsCard } from './components/CommandsCard';
import { ContextPacksSelectionCard } from './components/ContextPacksSelectionCard';
import { GitignoreCard } from './components/GitignoreCard';
import { PathsCard } from './components/PathsCard';
import { ProfileEditorActions } from './components/ProfileEditorActions';
import { SyncTargetsCard } from './components/SyncTargetsCard';
import { TechnologiesCard } from './components/TechnologiesCard';
import { useProfileEditorLogic } from './useProfileEditorLogic';

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
    handleToggleSyncTarget,
    handleToggleGitignoreTarget,
    handleToggleAddToGitignore,
    gitignoreStatus,
    syncTargetsError,
    requestDetection,
    handleSave,
    handleCancel,
  } = useProfileEditorLogic();

  return (
    <div className='w-full space-y-6 animate-fade-in'>
      <PageTitle
        title='Edit Profile'
        description='Modify your project profile settings and configurations.'
      />

      <BasicInformationCard
        profile={profile}
        onIdChange={handleIdChange}
        onNameChange={handleNameChange}
        onVersionChange={handleVersionChange}
        onTypeChange={handleTypeChange}
      />
      <TechnologiesCard
        technologies={profile.technologies}
        onToggleTechnology={handleToggleTechnology}
        onAddTechnology={handleAddTechnology}
        onDetectTechnologies={requestDetection}
        isDetecting={isDetecting}
        detectionError={detectionError}
      />
      <PathsCard
        paths={profile.paths}
        onPathChange={handlePathChange}
        onRemovePath={handleRemovePath}
      />
      <CommandsCard
        commands={profile.commands}
        onCommandChange={handleCommandChange}
        onRemoveCommand={handleRemoveCommand}
      />
      <ContextPacksSelectionCard
        availablePacks={availableContextPacks}
        selectedPacks={profile.contextPacks}
        onTogglePack={handleToggleContextPack}
        onManagePacks={handleManageContextPacks}
      />
      <SyncTargetsCard
        selectedTargets={profile.syncTargets}
        gitignoreTargets={profile.gitignoreTargets}
        onToggleTarget={handleToggleSyncTarget}
        onToggleGitignoreTarget={handleToggleGitignoreTarget}
        error={syncTargetsError}
      />
      <GitignoreCard
        checked={profile.addToGitignore}
        alreadyIgnored={gitignoreStatus === true}
        onToggle={handleToggleAddToGitignore}
      />
      <ProfileEditorActions isSaving={isSaving} onCancel={handleCancel} onSave={handleSave} />
    </div>
  );
};

export default ProfileEditorPage;
