import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
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
      // Ensure .agent-team directory exists
      const agentTeamDir = path.join(workspaceFolder, '.agent-team');
      if (!fs.existsSync(agentTeamDir)) {
        fs.mkdirSync(agentTeamDir, { recursive: true });
      }

      // Write profile file
      const profilePath = path.join(agentTeamDir, 'project.profile.yml');
      const yamlContent = yaml.dump(profileData, {
        indent: 2,
        lineWidth: 100,
        noRefs: true,
      });

      fs.writeFileSync(profilePath, yamlContent, 'utf-8');

      this.context.logger.info(`Profile saved to ${profilePath}`);
      this.showInfo('Project profile saved successfully');
    } catch (error) {
      this.showError(`Failed to save profile: ${error}`, error);
    }
  }
}
