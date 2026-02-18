/**
 * Dynamic Context Pack Processor
 * Supports: variables, conditionals, includes, loops, filters
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger } from './logger';

export interface ContextPackContext {
  project?: Record<string, any>;
  technologies?: Record<string, boolean>;
  paths?: Record<string, string>;
  commands?: Record<string, string>;
  env?: Record<string, string>;
  vars?: Record<string, any>;
  kit?: {
    id: string;
    version: string;
  };
}

export interface ProcessOptions {
  projectRoot?: string;
  kitsPath?: string;
  maxDepth?: number; // Max include depth
  cache?: boolean;
}

export class ContextPackProcessor {
  private logger: Logger;
  private cache: Map<string, string> = new Map();
  private includeDepth = 0;
  private maxDepth = 5;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Process a context pack with dynamic content
   */
  async process(
    packPath: string,
    context: ContextPackContext,
    options: ProcessOptions = {},
  ): Promise<string> {
    this.maxDepth = options.maxDepth || 5;
    const useCache = options.cache !== false;

    // Check cache
    const cacheKey = this.getCacheKey(packPath, context);
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Reset include depth
    this.includeDepth = 0;

    // Load pack content
    const content = await this.loadPack(packPath, options);

    // Process all directives
    let processed = content;
    processed = await this.processIncludes(processed, context, options);
    processed = this.processConditionals(processed, context);
    processed = this.processLoops(processed, context);
    processed = this.processVariables(processed, context);
    processed = this.processFilters(processed);

    // Cache result
    if (useCache) {
      this.cache.set(cacheKey, processed);
    }

    return processed;
  }

  /**
   * Process a string directly (useful for testing)
   */
  async processString(
    content: string,
    context: ContextPackContext,
    options: ProcessOptions = {},
  ): Promise<string> {
    this.maxDepth = options.maxDepth || 5;
    this.includeDepth = 0;

    // Process all directives
    let processed = content;
    processed = this.processConditionals(processed, context);
    processed = this.processLoops(processed, context);
    processed = this.processVariables(processed, context);
    processed = this.processFilters(processed);

    return processed;
  }

  /**
   * Load pack from file system
   */
  private async loadPack(packPath: string, options: ProcessOptions): Promise<string> {
    // Handle different pack path formats
    let fullPath: string;

    if (packPath.startsWith('kit:')) {
      // Kit context pack: kit:testing-patterns
      const packName = packPath.substring(4);
      const _kitId = options.kitsPath ? path.basename(options.kitsPath) : '';
      fullPath = path.join(options.kitsPath || '', 'context-packs', `${packName}.md`);
    } else if (packPath.startsWith('project:')) {
      // Project context pack: project:architecture
      const packName = packPath.substring(8);
      fullPath = path.join(
        options.projectRoot || '',
        '.agent-teams',
        'context-packs',
        `${packName}.md`,
      );
    } else if (packPath.startsWith('global:')) {
      // Global context pack: global:best-practices
      const packName = packPath.substring(7);
      fullPath = path.join(__dirname, '..', '..', 'context-packs', 'global', `${packName}.md`);
    } else {
      // Direct path
      fullPath = packPath;
    }

    if (!fs.existsSync(fullPath)) {
      this.logger.warn(`Context pack not found: ${fullPath}`);
      return `<!-- Context pack not found: ${packPath} -->`;
    }

    return fs.readFileSync(fullPath, 'utf-8');
  }

  /**
   * Process {{include:pack-name}} directives
   */
  private async processIncludes(
    content: string,
    context: ContextPackContext,
    options: ProcessOptions,
  ): Promise<string> {
    const includeRegex = /\{\{include:([^}]+)\}\}/g;
    let result = content;
    let match: RegExpExecArray | null = includeRegex.exec(result);

    while (match !== null) {
      const packPath = match[1].trim();

      // Check depth limit
      this.includeDepth++;
      if (this.includeDepth > this.maxDepth) {
        this.logger.warn(`Max include depth (${this.maxDepth}) exceeded for: ${packPath}`);
        result = result.replace(match[0], `<!-- Max include depth exceeded: ${packPath} -->`);
        continue;
      }

      try {
        const included = await this.process(packPath, context, { ...options, cache: false });
        result = result.replace(match[0], included);
      } catch (error) {
        this.logger.error(`Failed to include pack ${packPath}: ${error}`);
        result = result.replace(match[0], `<!-- Include failed: ${packPath} -->`);
      }

      this.includeDepth--;
      match = includeRegex.exec(result);
    }

    return result;
  }

  /**
   * Process {{#if condition}} and {{#unless condition}} blocks
   */
  private processConditionals(content: string, context: ContextPackContext): string {
    let result = content;

    // Process {{#if condition}}...{{/if}}
    const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    result = result.replace(ifRegex, (_match, condition, block) => {
      return this.evaluateCondition(condition.trim(), context) ? block : '';
    });

    // Process {{#unless condition}}...{{/unless}}
    const unlessRegex = /\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g;
    result = result.replace(unlessRegex, (_match, condition, block) => {
      return !this.evaluateCondition(condition.trim(), context) ? block : '';
    });

    // Process {{#if condition}}...{{else}}...{{/if}}
    const ifElseRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
    result = result.replace(ifElseRegex, (_match, condition, trueBlock, falseBlock) => {
      return this.evaluateCondition(condition.trim(), context) ? trueBlock : falseBlock;
    });

    return result;
  }

  /**
   * Evaluate conditional expression
   */
  private evaluateCondition(condition: string, context: ContextPackContext): boolean {
    // technology:react
    if (condition.startsWith('technology:')) {
      const tech = condition.substring(11);
      return context.technologies?.[tech] === true;
    }

    // env:production
    if (condition.startsWith('env:')) {
      const envVar = condition.substring(4);
      return context.env?.[envVar] === 'true' || context.env?.[envVar] === '1';
    }

    // var:name
    if (condition.startsWith('var:')) {
      const varName = condition.substring(4);
      return !!context.vars?.[varName];
    }

    // project:type=frontend
    if (condition.includes('=')) {
      const [key, value] = condition.split('=').map((s) => s.trim());
      const [namespace, prop] = key.split(':');

      if (namespace === 'project') {
        return context.project?.[prop] === value;
      }
    }

    return false;
  }

  /**
   * Process {{#each collection}}...{{/each}} loops
   */
  private processLoops(content: string, context: ContextPackContext): string {
    let result = content;

    // Process {{#each technologies}}...{{/each}}
    const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    result = result.replace(eachRegex, (_match, collection, block) => {
      const collectionName = collection.trim();

      if (collectionName === 'technologies') {
        const techs = context.technologies || {};
        return Object.keys(techs)
          .filter((tech) => techs[tech])
          .map((tech) => block.replace(/\{\{this\}\}/g, tech))
          .join('\n');
      }

      if (collectionName === 'paths') {
        const paths = context.paths || {};
        return Object.keys(paths)
          .map((key) => block.replace(/\{\{key\}\}/g, key).replace(/\{\{value\}\}/g, paths[key]))
          .join('\n');
      }

      return '';
    });

    return result;
  }

  /**
   * Process {{var:name}}, {{project:id}}, {{env:NODE_ENV}} variables
   */
  private processVariables(content: string, context: ContextPackContext): string {
    let result = content;

    // {{project:*}}
    const projectRegex = /\{\{project:([^}]+)\}\}/g;
    result = result.replace(projectRegex, (match, key) => {
      return context.project?.[key.trim()] || match;
    });

    // {{technology:*}}
    const techRegex = /\{\{technology:([^}]+)\}\}/g;
    result = result.replace(techRegex, (_match, key) => {
      return context.technologies?.[key.trim()] ? 'true' : 'false';
    });

    // {{path:*}}
    const pathRegex = /\{\{path:([^}]+)\}\}/g;
    result = result.replace(pathRegex, (match, key) => {
      return context.paths?.[key.trim()] || match;
    });

    // {{command:*}}
    const commandRegex = /\{\{command:([^}]+)\}\}/g;
    result = result.replace(commandRegex, (match, key) => {
      return context.commands?.[key.trim()] || match;
    });

    // {{env:*}}
    const envRegex = /\{\{env:([^}]+)\}\}/g;
    result = result.replace(envRegex, (match, key) => {
      return context.env?.[key.trim()] || process.env[key.trim()] || match;
    });

    // {{var:*}}
    const varRegex = /\{\{var:([^}]+)\}\}/g;
    result = result.replace(varRegex, (match, key) => {
      return context.vars?.[key.trim()] || match;
    });

    // {{kit:*}}
    const kitRegex = /\{\{kit:([^}]+)\}\}/g;
    result = result.replace(kitRegex, (match, key) => {
      return context.kit?.[key.trim() as keyof typeof context.kit] || match;
    });

    return result;
  }

  /**
   * Process {{filter:value}} filters
   */
  private processFilters(content: string): string {
    let result = content;

    // {{uppercase:text}}
    const uppercaseRegex = /\{\{uppercase:([^}]+)\}\}/g;
    result = result.replace(uppercaseRegex, (_match, text) => text.trim().toUpperCase());

    // {{lowercase:text}}
    const lowercaseRegex = /\{\{lowercase:([^}]+)\}\}/g;
    result = result.replace(lowercaseRegex, (_match, text) => text.trim().toLowerCase());

    // {{capitalize:text}}
    const capitalizeRegex = /\{\{capitalize:([^}]+)\}\}/g;
    result = result.replace(capitalizeRegex, (_match, text) => {
      const trimmed = text.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    });

    return result;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(packPath: string, context: ContextPackContext): string {
    return `${packPath}:${JSON.stringify(context)}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
