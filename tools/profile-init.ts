/**
 * CLI command: profile:init
 * Initialize a new project profile
 */

import process from 'node:process';
import { ProfileLoader } from '../extension/src/profileLoader';

export async function runProfileInit(args: string[]) {
  const id = getArgValue(args, '--id');
  const name = getArgValue(args, '--name');
  const type = getArgValue(args, '--type') || 'frontend';

  if (!id || !name) {
    console.error('❌ Error: --id and --name are required');
    console.log('');
    console.log('Usage: agent-teams profile:init --id <project-id> --name <project-name> [--type <type>]');
    console.log('');
    console.log('Available types: frontend, backend, fullstack, library, monorepo');
    console.log('');
    console.log('Example:');
    console.log('  agent-teams profile:init \\');
    console.log('    --id my-web-app \\');
    console.log('    --name "My Web Application" \\');
    console.log('    --type frontend');
    process.exit(1);
  }

  const projectRoot = process.cwd();

  console.log('\n🔧 Initializing project profile...');
  console.log(`   ID: ${id}`);
  console.log(`   Name: ${name}`);
  console.log(`   Type: ${type}`);
  console.log('');

  await ProfileLoader.init(projectRoot, { id, name, type });

  console.log('✅ Project profile created!');
  console.log('   → .agent-teams/project.profile.yml\n');
  console.log('Next steps:\n');
  console.log('   1. Edit .agent-teams/project.profile.yml (configure paths, commands, technologies)');
  console.log('   2. Create a team: agent-teams team:create --id my-team --name "My Team" --kits testing-vitest');
  console.log('   3. Sync team: agent-teams team:sync --team my-team\n');
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
