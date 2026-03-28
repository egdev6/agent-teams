/**
 * CLI command: team:sync
 * Synchronize a team to all configured targets
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { TeamManager } from 'agent-teams/teamManager.js';
import chalk from 'chalk';

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

  const engramActive = isEngramConfigured(projectRoot);
  printSummary(result.summary, engramActive);
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

function isEngramConfigured(projectRoot: string): boolean {
  const mcpJsonPath = path.join(projectRoot, '.vscode', 'mcp.json');
  try {
    const content = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
    return !!content?.servers?.engram;
  } catch {
    return false;
  }
}

function printSummary(summary: any, engramActive: boolean): void {
  const mem = engramActive ? '  [+memory]' : '';
  console.log('');
  console.log(chalk.bold('📊 Summary:'));
  console.log(`   Total changes: ${summary.total}`);
  console.log(`   ✨ New:       ${chalk.green(summary.created)}${summary.created > 0 ? mem : ''}`);
  console.log(`   📝 Updated:   ${chalk.yellow(summary.updated)}${summary.updated > 0 ? mem : ''}`);
  console.log(`   ⏭️  Skipped:   ${chalk.dim(summary.skipped)}`);
  if (summary.deleted > 0) {
    console.log(`   🗑️  Deleted:   ${chalk.red(summary.deleted)}`);
  }
  if (engramActive) {
    console.log('\n🧠 Memory: Engram active — all agents synced with persistent memory');
  }
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
    console.log(chalk.green(`\n✅ Success! Team synced to targets: ${targets}${dir}\n`));
  } else {
    console.log(chalk.dim('\n✅ No changes detected\n'));
  }
}

const ACTION_STYLE: Record<string, { prefix: string; label: string; color: typeof chalk }> = {
  create: { prefix: '+', label: 'create', color: chalk.green },
  update: { prefix: '~', label: 'update', color: chalk.yellow },
  delete: { prefix: '-', label: 'delete', color: chalk.red },
  skip: { prefix: ' ', label: 'skip', color: chalk.dim },
};

function printChangesPreview(changes: any[], showDiff: boolean): void {
  console.log('');
  console.log(chalk.bold('📋 Changes Preview:'));
  console.log(chalk.dim('─'.repeat(60)));

  // Group by target for cleaner output when multiple targets are present
  const byTarget = new Map<string, typeof changes>();
  for (const change of changes) {
    const target = change.target ?? 'unknown';
    if (!byTarget.has(target)) byTarget.set(target, []);
    byTarget.get(target)?.push(change);
  }

  for (const [target, targetChanges] of byTarget) {
    if (byTarget.size > 1) {
      console.log('');
      console.log(chalk.dim(`  target: ${target}`));
    }
    for (const change of targetChanges) {
      const { prefix, label, color } = ACTION_STYLE[change.action] ?? ACTION_STYLE.skip;
      const filepath = change.filepath ?? change.agentId;
      console.log(color(`  ${prefix} ${filepath}`) + chalk.dim(`  [${label}]`));
      if (change.diff && showDiff) {
        console.log(change.diff);
      }
    }
  }

  console.log('');
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.dim('💡 Run without --dry-run to apply changes'));
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
