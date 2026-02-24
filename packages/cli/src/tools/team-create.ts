/**
 * CLI command: team:create
 * Create a new team profile
 */

import process from 'node:process';
import { TeamManager } from '@agent-teams/extension/teamManager.js';

export async function runTeamCreate(args: string[]) {
  const id = getArgValue(args, '--id');
  const name = getArgValue(args, '--name');
  const description = getArgValue(args, '--description');

  if (!id || !name) {
    console.error('❌ Error: --id and --name are required');
    console.log('');
    console.log(
      'Usage: agent-teams team:create --id <team-id> --name <team-name> [--description <desc>]',
    );
    console.log('');
    console.log('Example:');
    console.log('  agent-teams team:create \\');
    console.log('    --id minimal-testing \\');
    console.log('    --name "Minimal Testing" \\');
    console.log('    --description "Essential testing setup"');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const teamManager = new TeamManager();

  console.log('\n🔨 Creating team profile...');
  console.log(`   ID: ${id}`);
  console.log(`   Name: ${name}`);
  if (description) {
    console.log(`   Description: ${description}`);
  }
  console.log('');

  await teamManager.createTeam(projectRoot, id, {
    name,
    description,
  });

  console.log('✅ Team created!');
  console.log(`   → .agent-teams/teams/${id}.yml\n`);
  console.log('Next step:\n');
  console.log(`   agent-teams team:sync --team ${id}\n`);
}

function getArgValue(args: string[], ...names: string[]): string | undefined {
  for (const name of names) {
    const index = args.indexOf(name);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
  }
  return undefined;
}
