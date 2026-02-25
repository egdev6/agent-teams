/**
 * CLI command: team:sync
 * Synchronize a team to all configured targets
 */

import process from 'node:process';
import { TeamManager } from '@agent-teams/extension/teamManager.js';

export async function runTeamSync(args: string[]) {
  const teamId = getArgValue(args, '--team', '-t');
  const dryRun = args.includes('--dry-run');
  const showDiff = !args.includes('--no-diff'); // Show diff by default
  const outputDir = getArgValue(args, '--output', '-o');

  if (!teamId) {
    printHelpMessage();
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const teamManager = new TeamManager();

  printSyncStartMessage(teamId, projectRoot, dryRun);

  const result = await teamManager.syncTeam(projectRoot, teamId, {
    dryRun,
    showDiff,
    outputDir,
  });

  printSummary(result.summary);
  printChangesOrSuccess(result, dryRun, showDiff, outputDir);
}

function printHelpMessage(): void {
  console.error('❌ Error: --team is required');
  console.log('');
  console.log('Usage: agent-teams team:sync --team <team-id> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --team, -t <id>      Team ID to sync (required)');
  console.log('  --dry-run            Preview changes without writing files');
  console.log('  --no-diff            Skip diff output in dry-run mode');
  console.log('  --output, -o <dir>   Custom GitHub Copilot agents directory (optional)');
  console.log('');
  console.log('Examples:');
  console.log('  agent-teams team:sync --team minimal-testing');
  console.log('  agent-teams team:sync --team minimal-testing --dry-run');
  console.log('  agent-teams team:sync --team full-stack --dry-run --no-diff');
}

function printSyncStartMessage(teamId: string, projectRoot: string, dryRun: boolean): void {
  console.log(`\n🔄 Syncing team: ${teamId}`);
  console.log(`   Project root: ${projectRoot}`);
  if (dryRun) {
    console.log('   Mode: DRY RUN (no files will be written)');
  }
  console.log('');
}

function printSummary(summary: any): void {
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total changes: ${summary.total}`);
  console.log(`   ✨ New:       ${summary.created}`);
  console.log(`   📝 Updated:   ${summary.updated}`);
  console.log(`   ⏭️  Skipped:   ${summary.skipped}`);
}

function printChangesOrSuccess(
  result: any,
  dryRun: boolean,
  showDiff: boolean,
  outputDir: string | undefined,
): void {
  if (dryRun && result.changes.length > 0) {
    printChangesPreview(result.changes, showDiff);
  } else if (!dryRun) {
    const targets = Array.isArray(result.targets)
      ? result.targets.join(', ')
      : 'configured targets';
    const dir = outputDir ? ` (github output override: ${outputDir})` : '';
    console.log(`\n✅ Success! Team synced to targets: ${targets}${dir}\n`);
  } else {
    console.log('\n✅ No changes detected\n');
  }
}

function printChangesPreview(changes: any[], showDiff: boolean): void {
  console.log('');
  console.log('📋 Changes Preview:');
  console.log('─'.repeat(60));

  for (const change of changes) {
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
