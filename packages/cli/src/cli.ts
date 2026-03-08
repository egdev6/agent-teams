/**
 * Agent Teams CLI
 *
 * Main entry point for the command-line interface.
 *
 * @packageDocumentation
 */

import { Command } from 'commander';

const program = new Command();

program.name('agent-teams').description('CLI tools for managing Agent Teams').version('2.0.0');

// ── v1.0 commands ────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Create an agent interactively')
  .option('--specs <dir>', 'Specs directory', 'specs')
  .option('--create', 'Auto-generate agent after creating spec')
  .action(async (opts) => {
    const { runInit } = await import('./tools/init-agent.js');
    const args: string[] = ['--specs', opts.specs];
    if (opts.create) args.push('--create');
    await runInit(args);
  });

program
  .command('create')
  .description('Create an agent from a spec file')
  .requiredOption('--spec <path>', 'Path to agent spec (yml/json)')
  .option('--out <dir>', 'Output directory', 'agents')
  .option('--template <path>', 'Template path', 'agents/_templates/agent.template.md')
  .option('--schema <path>', 'Schema path', 'schemas/agent.schema.json')
  .action(async (opts) => {
    const { runCreate } = await import('./tools/create-agent.js');
    await runCreate([
      '--spec',
      opts.spec,
      '--out',
      opts.out,
      '--template',
      opts.template,
      '--schema',
      opts.schema,
    ]);
  });

program
  .command('validate')
  .description('Validate agents against schema')
  .option('--agents <dir>', 'Agents directory', 'agents')
  .option('--schema <path>', 'Schema path', 'schemas/agent.schema.json')
  .action(async (opts) => {
    const { runValidate } = await import('./tools/validate-agent.js');
    await runValidate(['--agents', opts.agents, '--schema', opts.schema]);
  });

program
  .command('sync')
  .description('Sync agents to target project .github/')
  .requiredOption('--project <dir>', 'Target project directory')
  .option('--config <path>', 'Project config path')
  .option('--clean', 'Clean output directory before syncing')
  .action(async (opts) => {
    const { runSync } = await import('./tools/sync-agents.js');
    const args = ['--project', opts.project];
    if (opts.config) args.push('--config', opts.config);
    if (opts.clean) args.push('--clean');
    await runSync(args);
  });

program
  .command('watch')
  .description('Watch spec changes and regenerate agents automatically')
  .option('--specs <dir>', 'Specs directory to watch', 'specs')
  .option('--out <dir>', 'Output directory', 'agents')
  .option('--template <path>', 'Template path', 'agents/_templates/agent.template.md')
  .option('--schema <path>', 'Schema path', 'schemas/agent.schema.json')
  .action(async (opts) => {
    const { runWatch } = await import('./tools/watch-agents.js');
    await runWatch([
      '--specs',
      opts.specs,
      '--out',
      opts.out,
      '--template',
      opts.template,
      '--schema',
      opts.schema,
    ]);
  });

// ── v2.0 profile commands ─────────────────────────────────────────────────────

program
  .command('profile:init')
  .description('Initialize project profile (.agent-teams/)')
  .requiredOption('--id <string>', 'Project ID')
  .requiredOption('--name <string>', 'Project name')
  .option(
    '--type <string>',
    'Project type (frontend|backend|fullstack|library|monorepo)',
    'frontend',
  )
  .action(async (opts) => {
    const { runProfileInit } = await import('./tools/profile-init.js');
    await runProfileInit(['--id', opts.id, '--name', opts.name, '--type', opts.type]);
  });

// ── v2.0 team commands ────────────────────────────────────────────────────────

program
  .command('team:create')
  .description('Create a team profile')
  .requiredOption('--id <string>', 'Team ID')
  .requiredOption('--name <string>', 'Team name')
  .option('--description <string>', 'Team description')
  .action(async (opts) => {
    const { runTeamCreate } = await import('./tools/team-create.js');
    const args = ['--id', opts.id, '--name', opts.name];
    if (opts.description) args.push('--description', opts.description);
    await runTeamCreate(args);
  });

program
  .command('team:list')
  .description('List available teams')
  .action(async () => {
    const { runTeamList } = await import('./tools/team-list.js');
    await runTeamList([]);
  });

program
  .command('team:sync')
  .description('Sync a team to configured targets (.github/.claude)')
  .requiredOption('--team <id>', 'Team ID to sync')
  .option('--dry-run', 'Preview changes without writing files')
  .option('--no-diff', 'Skip diff in dry-run output')
  .option('--output <dir>', 'Custom output directory')
  .action(async (opts) => {
    const { runTeamSync } = await import('./tools/team-sync.js');
    const args = ['--team', opts.team];
    if (opts.dryRun) args.push('--dry-run');
    if (!opts.diff) args.push('--no-diff');
    if (opts.output) args.push('--output', opts.output);
    await runTeamSync(args);
  });

// ── v2.0 skills commands ─────────────────────────────────────────────────────

program
  .command('skills:list')
  .description('List all available skills')
  .option('--category <cat>', 'Filter by category')
  .option('--role <role>', 'Filter by role (worker|orchestrator|router)')
  .option('--security <level>', 'Filter by security level')
  .action(async (opts) => {
    const { runSkillsList } = await import('./tools/skills-commands.js');
    const args: string[] = [];
    if (opts.category) args.push(`--category=${opts.category}`);
    if (opts.role) args.push(`--role=${opts.role}`);
    if (opts.security) args.push(`--security=${opts.security}`);
    await runSkillsList(args);
  });

program
  .command('skills:show <skill-id>')
  .description('Show skill details')
  .action(async (skillId) => {
    const { runSkillsShow } = await import('./tools/skills-commands.js');
    await runSkillsShow([skillId]);
  });

program
  .command('skills:validate <agent-file>')
  .description('Validate agent skills')
  .action(async (agentFile) => {
    const { runSkillsValidate } = await import('./tools/skills-commands.js');
    await runSkillsValidate([agentFile]);
  });

program
  .command('skills:recommend')
  .description('Get skill recommendations')
  .requiredOption('--domain <domain>', 'Agent domain')
  .requiredOption('--role <role>', 'Agent role')
  .option('--tech <list>', 'Comma-separated technologies')
  .action(async (opts) => {
    const { runSkillsRecommend } = await import('./tools/skills-commands.js');
    const args = [`--domain=${opts.domain}`, `--role=${opts.role}`];
    if (opts.tech) args.push(`--tech=${opts.tech}`);
    await runSkillsRecommend(args);
  });

// ── catalog commands ──────────────────────────────────────────────────────────

program
  .command('skills:catalog:list')
  .description('List installed catalog skills in .agent-teams/skills/')
  .action(async () => {
    const { runSkillsCatalogList } = await import('./tools/skills-commands.js');
    runSkillsCatalogList([]);
  });

program
  .command('skills:catalog:add <id>')
  .description('Add a skill entry to .agent-teams/skills/{id}.yml')
  .requiredOption('--title <string>', 'Skill title')
  .requiredOption('--source-type <type>', 'Source type: skills-lc or git')
  .requiredOption('--ref <string>', 'Source reference (path or repo)')
  .requiredOption('--version <string>', 'Skill version')
  .option('--description <string>', 'Skill description')
  .option('--tags <list>', 'Comma-separated tags')
  .action(async (id, opts) => {
    const { runSkillsCatalogAdd } = await import('./tools/skills-commands.js');
    const args = [
      id,
      '--title',
      opts.title,
      '--source-type',
      opts.sourceType,
      '--ref',
      opts.ref,
      '--version',
      opts.version,
    ];
    if (opts.description) args.push('--description', opts.description);
    if (opts.tags) args.push('--tags', opts.tags);
    runSkillsCatalogAdd(args);
  });

program
  .command('skills:catalog:remove <id>')
  .description('Remove a skill entry from .agent-teams/skills/')
  .action(async (id) => {
    const { runSkillsCatalogRemove } = await import('./tools/skills-commands.js');
    runSkillsCatalogRemove([id]);
  });

program.parse();
