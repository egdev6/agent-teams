/**
 * CLI command: team:list
 * List available teams in the project
 */

import process from 'node:process';
import { TeamManager } from '@agent-teams/extension/teamManager.js';

export async function runTeamList(_args: string[]) {
  const projectRoot = process.cwd();
  const teamManager = new TeamManager();

  const teams = await teamManager.listTeams(projectRoot);

  if (teams.length === 0) {
    console.log('\n❌ No teams found in .agent-teams/teams/\n');
    console.log('Create a team:');
    console.log('  agent-teams team:create --id my-team --name "My Team"\n');
    return;
  }

  console.log('\n📋 Available teams:\n');
  for (const teamId of teams) {
    console.log(`   • ${teamId}`);
  }
  console.log('');
  console.log('Sync a team:');
  console.log('  agent-teams team:sync --team <team-id>\n');
}
