import * as fs from 'node:fs';
import * as path from 'node:path';

import YAML from 'yaml';
import type { Logger } from './logger';
import type { AgentSpec } from './types';

export class AgentLoader {
  private agents: Map<string, AgentSpec> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Load all agents from the workspace .agent-teams/agents directory.
   * Supports both YAML spec files (.yml/.yaml) and agent MD files with YAML frontmatter.
   */
  async loadAgents(workspaceRoot: string, agentsPath: string): Promise<void> {
    this.agents.clear();

    const agentsDir = path.join(workspaceRoot, agentsPath);

    if (!fs.existsSync(agentsDir)) {
      this.logger.warn(`Agents directory not found: ${agentsDir}`);
      return;
    }

    const files = fs.readdirSync(agentsDir);
    const agentFiles = files.filter(
      (f: string) =>
        f.endsWith('.agent.md') || f.endsWith('.md') || f.endsWith('.yml') || f.endsWith('.yaml'),
    );

    for (const file of agentFiles) {
      try {
        const filePath = path.join(agentsDir, file);
        const agent = await this.parseAgentFile(filePath);

        if (agent?.id) {
          this.agents.set(agent.id, agent);
          this.logger.info(`Loaded agent: ${agent.id} (${agent.name})`);
        }
      } catch (error) {
        this.logger.error(`Failed to load agent ${file}:`, error);
      }
    }

    this.logger.info(`Loaded ${this.agents.size} agents`);
  }

  /**
   * Parse an agent file. YAML files are parsed directly as AgentSpec.
   * Markdown files with YAML frontmatter have their frontmatter parsed as AgentSpec.
   */
  private async parseAgentFile(filePath: string): Promise<AgentSpec | null> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.yml' || ext === '.yaml') {
      const spec = YAML.parse(content) as AgentSpec;
      return spec?.id ? spec : null;
    }

    // Markdown: extract YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      this.logger.warn(`No frontmatter found in ${path.basename(filePath)}`);
      return null;
    }

    const spec = YAML.parse(frontmatterMatch[1]) as AgentSpec;
    if (!spec?.id) return null;

    return spec;
  }

  /**
   * Get an agent by ID
   */
  getAgent(id: string): AgentSpec | undefined {
    return this.agents.get(id);
  }

  /**
   * Register a single agent spec directly (without clearing the map).
   * Used to load bundled agents that serve as fallbacks when not present in the workspace.
   */
  registerAgent(spec: AgentSpec): void {
    if (spec?.id) {
      this.agents.set(spec.id, spec);
    }
  }

  /**
   * Get all loaded agents
   */
  getAllAgents(): AgentSpec[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by domain
   */
  getAgentsByDomain(domain: string): AgentSpec[] {
    return this.getAllAgents().filter((a) => a.domain === domain);
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role: 'worker' | 'orchestrator' | 'router'): AgentSpec[] {
    return this.getAllAgents().filter((a) => a.role === role);
  }
}
