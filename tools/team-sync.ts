/**
 * CLI command: team:sync
 * Synchronize a team to .github/agents/
 */

import process from 'node:process';
import { TeamManager } from '../extension/src/teamManager';

export async function runTeamSync(args: string[]) {
  const teamId = getArgValue(args, '--team', '-t');
  const dryRun = args.includes('--dry-run');
  const showDiff = !args.includes('--no-diff');  // Show diff by default
  const outputDir = getArgValue(args, '--output', '-o');

  if (!teamId) {
    console.error('❌ Error: --team is required');
    console.log('');
    console.log('Usage: agent-teams team:sync --team <team-id> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --team, -t <id>      Team ID to sync (required)');
    console.log('  --dry-run            Preview changes without writing files');
    console.log('  --no-diff            Skip diff output in dry-run mode');
    console.log('  --output, -o <dir>   Custom output directory (default: .github/agents)');
    console.log('');
    console.log('Examples:');
    console.log('  agent-teams team:sync --team minimal-testing');
    console.log('  agent-teams team:sync --team minimal-testing --dry-run');
    console.log('  agent-teams team:sync --team full-stack --dry-run --no-diff');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const teamManager = new TeamManager();

  console.log(`\n🔄 Syncing team: ${teamId}`);
  console.log(`   Project root: ${projectRoot}`);
  
  if (dryRun) {
    console.log('   Mode: DRY RUN (no files will be written)');
  }
  console.log('');

  const result = await teamManager.syncTeam(projectRoot, teamId, {
    dryRun,
    showDiff,
    outputDir
  });

  // Display summary
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total agents: ${result.summary.total}`);
  console.log(`   ✨ New:       ${result.summary.created}`);
  console.log(`   📝 Updated:   ${result.summary.updated}`);
  console.log(`   ⏭️  Skipped:   ${result.summary.skipped}`);

  // Display changes in dry-run mode
  if (dryRun && result.changes.length > 0) {
    console.log('');
    console.log('📋 Changes Preview:');
    console.log('─'.repeat(60));

    for (const change of result.changes) {
      const icon = change.action === 'create' ? '✨' : change.action === 'update' ? '📝' : '⏭️';
      console.log(`\n${icon} ${change.agentId} (${change.action})`);
      console.log(`   File: ${change.filepath}`);

      if (change.diff && showDiff) {
        console.log(change.diff);
      }
    }

    console.log('');
    console.log('─'.repeat(60));
    console.log('💡 Run without --dry-run to apply changes');
  } else if (!dryRun) {
    const dir = outputDir || '.github/agents';
    console.log(`\n✅ Success! Agents synced to ${dir}/\n`);
  } else {
    console.log('\n✅ No changes detected\n');
  }
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
