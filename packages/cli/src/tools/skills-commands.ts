#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  type AgentRole,
  type SkillCategory,
  type SkillDefinition,
  SkillsRegistry,
} from '@agent-teams/extension/skillsRegistry.js';
import * as yaml from 'js-yaml';

// Minimal logger compatible with SkillsRegistry (no vscode)
const consoleLogger = {
  debug: (msg: string) => process.env.DEBUG && console.debug(msg),
  info: (msg: string) => console.info(msg),
  warn: (msg: string) => console.warn(msg),
  error: (msg: string) => console.error(msg),
  show: () => {},
  clear: () => {},
  appendLine: (msg: string) => console.log(msg),
};

/**
 * skills:list - List all skills
 */
export async function runSkillsList(args: string[]) {
  const category = args.find((arg) => arg.startsWith('--category='))?.split('=')[1] as
    | SkillCategory
    | undefined;
  const role = args.find((arg) => arg.startsWith('--role='))?.split('=')[1] as
    | AgentRole
    | undefined;
  const securityLevel = args.find((arg) => arg.startsWith('--security='))?.split('=')[1];

  const logger = consoleLogger;
  const registry = new SkillsRegistry(logger as any);

  // Load registry
  const registryPath = path.join(process.cwd(), 'skills.registry.yml');
  if (!fs.existsSync(registryPath)) {
    console.error('❌ skills.registry.yml not found in current directory');
    process.exit(1);
  }

  await registry.load(registryPath);

  // Get skills
  let skills = registry.getAllSkills();

  // Apply filters
  skills = applySkillsFilters(skills, category, role, securityLevel);

  // Group by category
  const byCategory = groupSkillsByCategory(skills);

  // Display
  displaySkillsList(registry, skills, byCategory);
}

function applySkillsFilters(
  skills: SkillDefinition[],
  category: SkillCategory | undefined,
  role: AgentRole | undefined,
  securityLevel: string | undefined,
): SkillDefinition[] {
  let filtered = skills;

  if (category) {
    filtered = filtered.filter((s) => s.category === category);
  }

  if (role) {
    filtered = filtered.filter((s) => !s.requires_role || s.requires_role.includes(role));
  }

  if (securityLevel) {
    filtered = filtered.filter((s) => s.security_level === securityLevel);
  }

  return filtered;
}

function groupSkillsByCategory(skills: SkillDefinition[]): Record<string, SkillDefinition[]> {
  const byCategory: Record<string, SkillDefinition[]> = {};
  for (const skill of skills) {
    if (!byCategory[skill.category]) {
      byCategory[skill.category] = [];
    }
    byCategory[skill.category].push(skill);
  }
  return byCategory;
}

function displaySkillsList(
  registry: SkillsRegistry,
  skills: SkillDefinition[],
  byCategory: Record<string, SkillDefinition[]>,
): void {
  console.log(`\n📋 Skills Registry v${registry.getVersion()}`);
  console.log(`Found ${skills.length} skill(s)\n`);

  for (const [cat, catSkills] of Object.entries(byCategory)) {
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  ${cat.toUpperCase().padEnd(60)} ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);

    for (const skill of catSkills) {
      displaySkillEntry(skill);
    }
  }

  console.log('');
}

function displaySkillEntry(skill: SkillDefinition): void {
  const securityIcon = getSecurityIcon(skill.security_level);
  const deprecatedIcon = skill.deprecated ? '⚠️  DEPRECATED' : '';

  console.log(`\n  ${securityIcon} ${skill.id}`);
  console.log(`     ${skill.name} ${deprecatedIcon}`);
  console.log(`     ${skill.description}`);

  if (skill.requires_role) {
    console.log(`     Roles: ${skill.requires_role.join(', ')}`);
  }

  if (skill.requires_technologies) {
    console.log(`     Requires: ${skill.requires_technologies.join(', ')}`);
  }
}

function getSecurityIcon(securityLevel: string): string {
  switch (securityLevel) {
    case 'critical':
      return '🔴';
    case 'elevated':
      return '🟡';
    case 'moderate':
      return '🟢';
    default:
      return '⚪';
  }
}

/**
 * skills:show - Show skill details
 */
export async function runSkillsShow(args: string[]) {
  const skillId = args[0];

  if (!skillId) {
    console.error('❌ Skill ID required');
    console.log('Usage: agent-teams skills:show <skill-id>');
    process.exit(1);
  }

  const logger = consoleLogger;
  const registry = new SkillsRegistry(logger as any);

  // Load registry
  const registryPath = path.join(process.cwd(), 'skills.registry.yml');
  if (!fs.existsSync(registryPath)) {
    console.error('❌ skills.registry.yml not found in current directory');
    process.exit(1);
  }

  await registry.load(registryPath);

  const skill = registry.getSkill(skillId);
  if (!skill) {
    console.error(`❌ Skill not found: ${skillId}`);
    process.exit(1);
  }

  // Display skill details
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  ${skill.name.toUpperCase().padEnd(60)} ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  console.log(`\nID: ${skill.id}`);
  console.log(`Category: ${skill.category}`);
  console.log(`Security Level: ${skill.security_level}`);
  console.log(`\nDescription:\n  ${skill.description}`);

  if (skill.requires_role) {
    console.log(`\nRequired Roles:\n  ${skill.requires_role.join(', ')}`);
  }

  if (skill.requires_technologies) {
    console.log(`\nRequired Technologies:\n  ${skill.requires_technologies.join(', ')}`);
  }

  if (skill.conflicts_with) {
    console.log(`\nConflicts With:\n  ${skill.conflicts_with.join(', ')}`);
  }

  if (skill.implies) {
    console.log(`\nImplies Skills:\n  ${skill.implies.join(', ')}`);
  }

  if (skill.examples && skill.examples.length > 0) {
    console.log(`\nExamples:`);
    for (const ex of skill.examples) {
      console.log(`  • ${ex}`);
    }
  }

  if (skill.deprecated) {
    console.log(`\n⚠️  DEPRECATED`);
    if (skill.deprecated_by) {
      console.log(`   Use '${skill.deprecated_by}' instead`);
    }
  }

  if (skill.documentation_url) {
    console.log(`\nDocumentation:\n  ${skill.documentation_url}`);
  }

  console.log('');
}

/**
 * skills:validate - Validate agent skills
 */
export async function runSkillsValidate(args: string[]) {
  const agentFile = extractAgentFile(args);
  if (!agentFile) process.exit(1);

  if (!fs.existsSync(agentFile)) {
    console.error(`❌ Agent file not found: ${agentFile}`);
    process.exit(1);
  }

  const registryPath = path.join(process.cwd(), 'skills.registry.yml');
  if (!fs.existsSync(registryPath)) {
    console.error('❌ skills.registry.yml not found in current directory');
    process.exit(1);
  }

  const logger = consoleLogger;
  const registry = new SkillsRegistry(logger as any);
  await registry.load(registryPath);

  const content = fs.readFileSync(agentFile, 'utf-8');
  const agent = yaml.load(content) as any;

  if (!agent || !agent._metadata) {
    console.error('❌ Invalid agent file format');
    process.exit(1);
  }

  const role = agent._metadata.role as AgentRole;
  const skills = agent._metadata.allowed_skills || [];
  const technologies = agent._metadata.technologies || [];

  console.log(`\n🔍 Validating agent: ${agent.name}`);
  console.log(`   Role: ${role}`);
  console.log(`   Skills: ${skills.length}`);

  const result = registry.validateSkills(skills, role, technologies);
  displayValidationResult(result);
  displayConflicts(registry.detectConflicts(skills));
  displayImpliedSkills(registry.getImpliedSkills(skills));

  console.log('');

  if (!result.valid) {
    process.exit(1);
  }
}

function extractAgentFile(args: string[]): string | undefined {
  const agentFile =
    args.find((arg) => !arg.startsWith('--')) ||
    args.find((arg) => arg.startsWith('--agent='))?.split('=')[1];

  if (!agentFile) {
    console.error('❌ Agent file required');
    console.log('Usage: agent-teams skills:validate <agent-file>');
  }

  return agentFile;
}

function displayValidationResult(result: ReturnType<SkillsRegistry['validateSkills']>): void {
  if (result.valid) {
    console.log(`\n✅ Validation passed!`);
  } else {
    console.log(`\n❌ Validation failed!`);
    console.log(`\nErrors:`);
    for (const err of result.errors) {
      console.log(`  • ${err}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`\nWarnings:`);
    for (const warn of result.warnings) {
      console.log(`  ⚠️  ${warn}`);
    }
  }
}

function displayConflicts(conflicts: string[]): void {
  if (conflicts.length > 0) {
    console.log(`\n⚠️  Conflicts detected:`);
    for (const conflict of conflicts) {
      console.log(`  • ${conflict}`);
    }
  }
}

function displayImpliedSkills(implied: string[]): void {
  if (implied.length > 0) {
    console.log(`\nℹ️  Suggested implied skills:`);
    for (const skill of implied) {
      console.log(`  • ${skill}`);
    }
  }
}

/**
 * skills:recommend - Get skill recommendations
 */
export async function runSkillsRecommend(args: string[]) {
  const domain = args.find((arg) => arg.startsWith('--domain='))?.split('=')[1];
  const role = args.find((arg) => arg.startsWith('--role='))?.split('=')[1] as AgentRole;
  const technologies =
    args
      .find((arg) => arg.startsWith('--tech='))
      ?.split('=')[1]
      ?.split(',') || [];

  if (!domain || !role) {
    console.error('❌ Domain and role required');
    console.log(
      'Usage: agent-teams skills:recommend --domain=<domain> --role=<role> [--tech=<tech1,tech2>]',
    );
    console.log(
      'Example: agent-teams skills:recommend --domain=testing --role=worker --tech=vitest,playwright',
    );
    process.exit(1);
  }

  const logger = consoleLogger;
  const registry = new SkillsRegistry(logger as any);

  // Load registry
  const registryPath = path.join(process.cwd(), 'skills.registry.yml');
  if (!fs.existsSync(registryPath)) {
    console.error('❌ skills.registry.yml not found in current directory');
    process.exit(1);
  }

  await registry.load(registryPath);

  // Get recommendations
  const recommendations = registry.getRecommendations(domain, role, technologies);

  console.log(`\n💡 Skill Recommendations`);
  console.log(`   Domain: ${domain}`);
  console.log(`   Role: ${role}`);
  if (technologies.length > 0) {
    console.log(`   Technologies: ${technologies.join(', ')}`);
  }
  console.log(`\nFound ${recommendations.length} recommendation(s):\n`);

  // Display recommendations
  displayRecommendations(registry, recommendations);
}

function displayRecommendations(
  registry: SkillsRegistry,
  recommendations: ReturnType<SkillsRegistry['getRecommendations']>,
): void {
  // Group by priority
  const byPriority: Record<string, typeof recommendations> = {
    high: [],
    medium: [],
    low: [],
  };

  for (const rec of recommendations) {
    byPriority[rec.priority].push(rec);
  }

  // Display
  for (const [priority, recs] of Object.entries(byPriority)) {
    if (recs.length === 0) continue;

    const icon = priority === 'high' ? '🔥' : priority === 'medium' ? '⭐' : '💡';
    console.log(`${icon} ${priority.toUpperCase()} PRIORITY:`);

    for (const rec of recs) {
      const skill = registry.getSkill(rec.skill_id);
      if (!skill) continue;

      console.log(`\n  • ${skill.id}`);
      console.log(`    ${skill.name} - ${skill.description}`);
      console.log(`    Reason: ${rec.reason}`);
    }

    console.log('');
  }
}
