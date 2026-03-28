import * as fs from 'node:fs';
import * as path from 'node:path';
import { stringify as yamlStringify } from 'yaml';
import { TeamManager } from '../../teamManager';
import { Command, type CommandContext } from '../base/Command';

export class SaveProfileCommand extends Command {
  constructor(context: CommandContext) {
    super(context, {
      id: 'saveProfile',
      title: 'Save Project Profile',
      category: 'project',
      description: 'Save project profile configuration',
    });
  }

  async execute(profileData: any): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    if (!profileData) {
      this.showError('No profile data provided');
      return;
    }

    try {
      // Ensure .agent-teams directory exists
      const agentTeamDir = path.join(workspaceFolder, '.agent-teams');
      if (!fs.existsSync(agentTeamDir)) {
        fs.mkdirSync(agentTeamDir, { recursive: true });
      }

      // Write profile file
      const profilePath = path.join(agentTeamDir, 'project.profile.yml');
      const yamlContent = yamlStringify(profileData);

      fs.writeFileSync(profilePath, yamlContent, 'utf-8');

      this.context.logger.info(`Profile saved to ${profilePath}`);

      // Regenerate root context files for all configured sync targets
      try {
        const teamManager = new TeamManager();
        await teamManager.syncContextFileOnly(workspaceFolder);
        this.context.logger.info('Context files updated after profile save');
      } catch (err) {
        this.context.logger.warn(`Could not update context files: ${err}`);
      }

      this.showInfo('Project profile saved successfully');
    } catch (error) {
      this.showError(`Failed to save profile: ${error}`, error);
    }
  }
}
