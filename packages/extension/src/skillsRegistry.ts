import * as fs from 'node:fs';
import { SCHEMA_PATHS } from '@agent-teams/core';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as YAML from 'yaml';
import type { Logger } from './logger';

/**
 * Security level for skills
 */
export type SecurityLevel = 'safe' | 'moderate' | 'elevated' | 'critical';

/**
 * Skill category
 */
export type SkillCategory =
  | 'file_operations'
  | 'code_analysis'
  | 'execution'
  | 'browser'
  | 'database'
  | 'testing'
  | 'documentation'
  | 'git'
  | 'deployment';

/**
 * Agent role
 */
export type AgentRole = 'worker' | 'orchestrator' | 'router';

/**
 * Complete skill definition
 */
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  requires_role?: AgentRole[];
  requires_technologies?: string[];
  conflicts_with?: string[];
  implies?: string[];
  examples?: string[];
  security_level: SecurityLevel;
  documentation_url?: string;
  deprecated?: boolean;
  deprecated_by?: string;
}

/**
 * Skills registry structure
 */
export interface SkillsRegistryData {
  version: string;
  skills: Record<string, SkillDefinition>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Skill recommendation
 */
export interface SkillRecommendation {
  skill_id: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * SkillsRegistry: Centralized skills validation and discovery
 */
export class SkillsRegistry {
  private registry: SkillsRegistryData | null = null;
  private logger: Logger;
  private ajv: Ajv;

  constructor(logger: Logger) {
    this.logger = logger;

    // Initialize Ajv validator
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  /**
   * Load skills registry from file
   */
  async load(registryPath: string): Promise<void> {
    try {
      this.logger.debug(`Loading skills registry from: ${registryPath}`);

      if (!fs.existsSync(registryPath)) {
        throw new Error(`Skills registry not found: ${registryPath}`);
      }

      // Load YAML
      const content = fs.readFileSync(registryPath, 'utf-8');
      const data = YAML.parse(content) as SkillsRegistryData;

      // Load and validate against schema (from @agent-teams/core)
      const schemaPath = SCHEMA_PATHS.skillsRegistry;

      if (fs.existsSync(schemaPath)) {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
        const validate = this.ajv.compile(schema);
        const isValid = validate(data);

        if (!isValid) {
          const errors = validate.errors?.map((e) => `${e.instancePath} ${e.message}`).join(', ');
          throw new Error(`Invalid skills registry: ${errors}`);
        }
      } else {
        this.logger.warn('Skills registry schema not found, skipping validation');
      }

      this.registry = data;
      this.logger.info(
        `Loaded ${Object.keys(data.skills).length} skills from registry v${data.version}`,
      );
    } catch (error) {
      this.logger.error('Failed to load skills registry', error);
      throw error;
    }
  }

  /**
   * Get skill definition by ID
   */
  getSkill(skillId: string): SkillDefinition | undefined {
    this.ensureLoaded();
    return this.registry?.skills[skillId];
  }

  /**
   * Get all skills
   */
  getAllSkills(): SkillDefinition[] {
    this.ensureLoaded();
    return Object.values(this.registry?.skills || {});
  }

  /**
   * Get skills by category
   */
  getByCategory(category: SkillCategory): SkillDefinition[] {
    this.ensureLoaded();
    return Object.values(this.registry?.skills || {}).filter(
      (skill) => skill.category === category,
    );
  }

  /**
   * Get skills by role
   */
  getByRole(role: AgentRole): SkillDefinition[] {
    this.ensureLoaded();
    return Object.values(this.registry?.skills || {}).filter(
      (skill) => !skill.requires_role || skill.requires_role.includes(role),
    );
  }

  /**
   * Get deprecated skills
   */
  getDeprecated(): SkillDefinition[] {
    this.ensureLoaded();
    return Object.values(this.registry?.skills || {}).filter((skill) => skill.deprecated);
  }

  /**
   * Validate a single skill
   */
  private validateSingleSkill(
    skillId: string,
    role: AgentRole,
    technologies: string[],
    errors: string[],
    warnings: string[],
  ): void {
    const skill = this.registry?.skills[skillId];

    if (!skill) {
      errors.push(`Unknown skill: ${skillId}`);
      return;
    }

    this.checkRoleRequirements(skillId, skill, role, errors);
    this.checkTechnologyRequirements(skillId, skill, technologies, errors);
    this.checkDeprecation(skillId, skill, warnings);
    this.checkSecurityLevel(skillId, skill, warnings);
  }

  /**
   * Check role requirements
   */
  private checkRoleRequirements(
    skillId: string,
    skill: SkillDefinition,
    role: AgentRole,
    errors: string[],
  ): void {
    if (skill.requires_role && !skill.requires_role.includes(role)) {
      errors.push(
        `Skill '${skillId}' requires role ${skill.requires_role.join(' or ')}, but agent has role '${role}'`,
      );
    }
  }

  /**
   * Check technology requirements
   */
  private checkTechnologyRequirements(
    skillId: string,
    skill: SkillDefinition,
    technologies: string[],
    errors: string[],
  ): void {
    if (skill.requires_technologies) {
      const missingTechs = skill.requires_technologies.filter(
        (tech) => !technologies.includes(tech),
      );
      if (missingTechs.length > 0) {
        errors.push(`Skill '${skillId}' requires technologies: ${missingTechs.join(', ')}`);
      }
    }
  }

  /**
   * Check deprecation
   */
  private checkDeprecation(skillId: string, skill: SkillDefinition, warnings: string[]): void {
    if (skill.deprecated) {
      const replacement = skill.deprecated_by ? ` Use '${skill.deprecated_by}' instead.` : '';
      warnings.push(`Skill '${skillId}' is deprecated.${replacement}`);
    }
  }

  /**
   * Check security level
   */
  private checkSecurityLevel(skillId: string, skill: SkillDefinition, warnings: string[]): void {
    if (skill.security_level === 'critical') {
      warnings.push(`Skill '${skillId}' has critical security level - use with caution`);
    } else if (skill.security_level === 'elevated') {
      warnings.push(`Skill '${skillId}' has elevated security level - requires careful monitoring`);
    }
  }

  /**
   * Validate skills for an agent
   */
  validateSkills(
    skillIds: string[],
    role: AgentRole,
    technologies: string[] = [],
  ): ValidationResult {
    this.ensureLoaded();

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check each skill
    for (const skillId of skillIds) {
      this.validateSingleSkill(skillId, role, technologies, errors, warnings);
    }

    // Check for conflicts
    const conflicts = this.detectConflicts(skillIds);
    if (conflicts.length > 0) {
      errors.push(...conflicts.map((c) => `Conflict: ${c}`));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect conflicts between skills
   */
  detectConflicts(skillIds: string[]): string[] {
    this.ensureLoaded();

    const conflicts: string[] = [];

    for (const skillId of skillIds) {
      const skill = this.registry?.skills[skillId];
      if (!skill || !skill.conflicts_with) continue;

      for (const conflictingSkillId of skill.conflicts_with) {
        if (skillIds.includes(conflictingSkillId)) {
          conflicts.push(`'${skillId}' conflicts with '${conflictingSkillId}'`);
        }
      }
    }

    return conflicts;
  }

  /**
   * Get implied skills (skills that should be automatically added)
   */
  getImpliedSkills(skillIds: string[]): string[] {
    this.ensureLoaded();

    const implied = new Set<string>();

    for (const skillId of skillIds) {
      const skill = this.registry?.skills[skillId];
      if (!skill || !skill.implies) continue;

      for (const impliedSkillId of skill.implies) {
        if (!skillIds.includes(impliedSkillId)) {
          implied.add(impliedSkillId);
        }
      }
    }

    return Array.from(implied);
  }

  /**
   * Get skill recommendations based on domain and role
   */
  getRecommendations(
    domain: string,
    role: AgentRole,
    technologies: string[] = [],
  ): SkillRecommendation[] {
    this.ensureLoaded();

    const recommendations: SkillRecommendation[] = [];

    // Domain-specific recommendations
    const domainKeywords = domain.toLowerCase();

    if (domainKeywords.includes('test')) {
      recommendations.push(
        {
          skill_id: 'run_tests',
          reason: 'Testing domain requires test execution',
          priority: 'high',
        },
        {
          skill_id: 'analyze_coverage',
          reason: 'Coverage analysis is essential for testing',
          priority: 'medium',
        },
      );
    }

    if (domainKeywords.includes('deploy') || domainKeywords.includes('devops')) {
      recommendations.push(
        {
          skill_id: 'deploy',
          reason: 'Deployment domain requires deploy capability',
          priority: 'high',
        },
        {
          skill_id: 'docker_build',
          reason: 'Docker is common in deployment workflows',
          priority: 'medium',
        },
      );
    }

    if (domainKeywords.includes('frontend') || domainKeywords.includes('ui')) {
      recommendations.push(
        {
          skill_id: 'browser_preview',
          reason: 'Frontend work benefits from browser preview',
          priority: 'high',
        },
        {
          skill_id: 'browser_test',
          reason: 'E2E testing is important for UI',
          priority: 'medium',
        },
      );
    }

    if (domainKeywords.includes('backend') || domainKeywords.includes('api')) {
      recommendations.push(
        {
          skill_id: 'api_design',
          reason: 'Backend work often involves API design',
          priority: 'high',
        },
        {
          skill_id: 'database_query',
          reason: 'Backend usually interacts with databases',
          priority: 'medium',
        },
      );
    }

    if (domainKeywords.includes('doc')) {
      recommendations.push(
        {
          skill_id: 'generate_docs',
          reason: 'Documentation domain requires doc generation',
          priority: 'high',
        },
        {
          skill_id: 'update_changelog',
          reason: 'Changelog updates are part of documentation',
          priority: 'medium',
        },
      );
    }

    // Technology-specific recommendations
    if (technologies.includes('docker')) {
      recommendations.push({
        skill_id: 'docker_build',
        reason: 'Project uses Docker',
        priority: 'medium',
      });
    }

    if (technologies.some((t) => ['vitest', 'jest', 'playwright', 'cypress'].includes(t))) {
      recommendations.push({
        skill_id: 'run_tests',
        reason: 'Project has testing framework',
        priority: 'high',
      });
    }

    // Role-specific recommendations
    if (role === 'worker') {
      recommendations.push(
        {
          skill_id: 'file_edit',
          reason: 'Workers typically need file editing',
          priority: 'high',
        },
        {
          skill_id: 'search_codebase',
          reason: 'Code search is essential for workers',
          priority: 'high',
        },
      );
    }

    if (role === 'orchestrator') {
      recommendations.push(
        {
          skill_id: 'search_codebase',
          reason: 'Orchestrators need code analysis',
          priority: 'high',
        },
        {
          skill_id: 'code_review',
          reason: 'Code review fits orchestrator role',
          priority: 'medium',
        },
      );
    }

    // Deduplicate and filter by role compatibility
    const seen = new Set<string>();
    return recommendations
      .filter((rec) => {
        if (seen.has(rec.skill_id)) return false;
        seen.add(rec.skill_id);

        const skill = this.registry?.skills[rec.skill_id];
        if (!skill) return false;

        // Check role compatibility
        if (skill.requires_role && !skill.requires_role.includes(role)) {
          return false;
        }

        // Check technology requirements
        if (skill.requires_technologies) {
          const hasAllTechs = skill.requires_technologies.every((tech) =>
            technologies.includes(tech),
          );
          if (!hasAllTechs) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  /**
   * Get registry version
   */
  getVersion(): string {
    this.ensureLoaded();
    return this.registry?.version ?? 'unknown';
  }

  /**
   * Check if skills registry is loaded
   */
  isLoaded(): boolean {
    return this.registry !== null;
  }

  /**
   * Ensure registry is loaded
   */
  private ensureLoaded(): void {
    if (!this.registry) {
      throw new Error('Skills registry not loaded. Call load() first.');
    }
  }
}
