/**
 * CLI command: team:create
 * Create a new team profile
 */

import process from 'node:process';
import { TeamManager } from '../extension/src/teamManager';

export async function runTeamCreate(args: string[]) {
  const id = getArgValue(args, '--id');
  const name = getArgValue(args, '--name');
  const description = getArgValue(args, '--description');
  const kitsArg = getArgValue(args, '--kits');

  if (!id || !name || !kitsArg) {
    console.error('❌ Error: --id, --name, and --kits are required');
    console.log('');
    console.log('Usage: agent-teams team:create --id <team-id> --name <team-name> --kits <kit1,kit2,...> [--description <desc>]');
    console.log('');
    console.log('Example:');
    console.log('  agent-teams team:create \\');
    console.log('    --id minimal-testing \\');
    console.log('    --name "Minimal Testing" \\');
    console.log('    --kits testing-vitest \\');
    console.log('    --description "Essential testing setup"');
    process.exit(1);
  }

  const kits = kitsArg.split(',').map(k => k.trim());
  const projectRoot = process.cwd();
  const teamManager = new TeamManager();

  console.log('\n🔨 Creating team profile...');
  console.log(`   ID: ${id}`);
  console.log(`   Name: ${name}`);
  console.log(`   Kits: ${kits.join(', ')}`);
  if (description) {
    console.log(`   Description: ${description}`);
  }
  console.log('');

  await teamManager.createTeam(projectRoot, id, {
    name,
    description,
    kits
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
