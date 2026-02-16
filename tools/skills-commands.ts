#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import fs from "node:fs";
import * as yaml from "js-yaml";
import { SkillsRegistry, SkillDefinition, AgentRole, SkillCategory } from "../extension/src/skillsRegistry.js";
import { Logger } from "../extension/src/logger.js";

// Simple console logger for CLI
class ConsoleLogger extends Logger {
  constructor() {
    super();
  }
}

/**
 * skills:list - List all skills
 */
export async function runSkillsList(args: string[]) {
  const category = args.find(arg => arg.startsWith('--category='))?.split('=')[1] as SkillCategory | undefined;
  const role = args.find(arg => arg.startsWith('--role='))?.split('=')[1] as AgentRole | undefined;
  const securityLevel = args.find(arg => arg.startsWith('--security='))?.split('=')[1];

  const logger = new ConsoleLogger();
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
  if (category) {
    skills = skills.filter(s => s.category === category);
  }

  if (role) {
    skills = skills.filter(s => !s.requires_role || s.requires_role.includes(role));
  }

  if (securityLevel) {
    skills = skills.filter(s => s.security_level === securityLevel);
  }

  // Group by category
  const byCategory: Record<string, SkillDefinition[]> = {};
  for (const skill of skills) {
    if (!byCategory[skill.category]) {
      byCategory[skill.category] = [];
    }
    byCategory[skill.category].push(skill);
  }

  // Display
  console.log(`\n📋 Skills Registry v${registry.getVersion()}`);
  console.log(`Found ${skills.length} skill(s)\n`);

  for (const [cat, catSkills] of Object.entries(byCategory)) {
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  ${cat.toUpperCase().padEnd(60)} ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);

    for (const skill of catSkills) {
      const securityIcon = 
        skill.security_level === 'critical' ? '🔴' :
        skill.security_level === 'elevated' ? '🟡' :
        skill.security_level === 'moderate' ? '🟢' : '⚪';
      
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
  }

  console.log('');
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

  const logger = new ConsoleLogger();
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
    skill.examples.forEach(ex => console.log(`  • ${ex}`));
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
  const agentFile = args.find(arg => !arg.startsWith('--')) || args.find(arg => arg.startsWith('--agent='))?.split('=')[1];

  if (!agentFile) {
    console.error('❌ Agent file required');
    console.log('Usage: agent-teams skills:validate <agent-file>');
    process.exit(1);
  }

  if (!fs.existsSync(agentFile)) {
    console.error(`❌ Agent file not found: ${agentFile}`);
    process.exit(1);
  }

  const logger = new ConsoleLogger();
  const registry = new SkillsRegistry(logger as any);

  // Load registry
  const registryPath = path.join(process.cwd(), 'skills.registry.yml');
  if (!fs.existsSync(registryPath)) {
    console.error('❌ skills.registry.yml not found in current directory');
    process.exit(1);
  }

  await registry.load(registryPath);

  // Read agent file
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

  // Validate
  const result = registry.validateSkills(skills, role, technologies);

  if (result.valid) {
    console.log(`\n✅ Validation passed!`);
  } else {
    console.log(`\n❌ Validation failed!`);
    console.log(`\nErrors:`);
    result.errors.forEach(err => console.log(`  • ${err}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\nWarnings:`);
    result.warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
  }

  // Check conflicts
  const conflicts = registry.detectConflicts(skills);
  if (conflicts.length > 0) {
    console.log(`\n⚠️  Conflicts detected:`);
    conflicts.forEach(conflict => console.log(`  • ${conflict}`));
  }

  // Check implied skills
  const implied = registry.getImpliedSkills(skills);
  if (implied.length > 0) {
    console.log(`\nℹ️  Suggested implied skills:`);
    implied.forEach(skill => console.log(`  • ${skill}`));
  }

  console.log('');

  if (!result.valid) {
    process.exit(1);
  }
}

/**
 * skills:recommend - Get skill recommendations
 */
export async function runSkillsRecommend(args: string[]) {
  const domain = args.find(arg => arg.startsWith('--domain='))?.split('=')[1];
  const role = args.find(arg => arg.startsWith('--role='))?.split('=')[1] as AgentRole;
  const technologies = args.find(arg => arg.startsWith('--tech='))?.split('=')[1]?.split(',') || [];

  if (!domain || !role) {
    console.error('❌ Domain and role required');
    console.log('Usage: agent-teams skills:recommend --domain=<domain> --role=<role> [--tech=<tech1,tech2>]');
    console.log('Example: agent-teams skills:recommend --domain=testing --role=worker --tech=vitest,playwright');
    process.exit(1);
  }

  const logger = new ConsoleLogger();
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

  // Group by priority
  const byPriority: Record<string, typeof recommendations> = {
    high: [],
    medium: [],
    low: []
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
