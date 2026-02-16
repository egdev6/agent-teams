import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import { AgentSpec, AgentMetadata } from './types';
import { Logger } from './logger';

export class AgentLoader {
  private agents: Map<string, AgentSpec> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Load all agents from the workspace .github/agents directory
   */
  async loadAgents(workspaceRoot: string, agentsPath: string): Promise<void> {
    this.agents.clear();
    
    const agentsDir = path.join(workspaceRoot, agentsPath);
    
    if (!fs.existsSync(agentsDir)) {
      this.logger.warn(`Agents directory not found: ${agentsDir}`);
      return;
    }

    const files = fs.readdirSync(agentsDir);
    const agentFiles = files.filter((f: string) => f.endsWith('.agent.md') || f.endsWith('.md'));

    for (const file of agentFiles) {
      try {
        const filePath = path.join(agentsDir, file);
        const agent = await this.parseAgentFile(filePath);
        
        if (agent && agent._metadata?.id) {
          this.agents.set(agent._metadata.id, agent);
          this.logger.info(`Loaded agent: ${agent._metadata.id} (${agent.name})`);
        }
      } catch (error) {
        this.logger.error(`Failed to load agent ${file}:`, error);
      }
    }

    this.logger.info(`Loaded ${this.agents.size} agents`);
  }

  /**
   * Parse an agent markdown file with frontmatter
   */
  private async parseAgentFile(filePath: string): Promise<AgentSpec | null> {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      this.logger.warn(`No frontmatter found in ${path.basename(filePath)}`);
      return null;
    }

    const frontmatter = YAML.parse(frontmatterMatch[1]);
    
    // Extract metadata from HTML comments
    const metadataMatch = content.match(/<!--[\s\S]*?Metadata for agent-teams tooling:([\s\S]*?)-->/);
    let metadata: Partial<AgentMetadata> = {};
    
    if (metadataMatch) {
      const metadataText = metadataMatch[1];
      const idMatch = metadataText.match(/- ID:\s*(\S+)/);
      const domainMatch = metadataText.match(/- Domain:\s*(\S+)/);
      const roleMatch = metadataText.match(/- Role:\s*(\S+)/);
      const intentsMatch = metadataText.match(/- Intents:\s*(.+)/);
      
      if (idMatch) metadata.id = idMatch[1];
      if (domainMatch) metadata.domain = domainMatch[1];
      if (roleMatch) metadata.role = roleMatch[1] as any;
      if (intentsMatch) {
        metadata.intents = intentsMatch[1].split(',').map((s: string) => s.trim());
      }
    }

    // Try to load from _spec directory
    const specPath = path.join(path.dirname(filePath), '_spec', `${metadata.id}.yml`);
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const spec = YAML.parse(specContent);
      if (spec._metadata) {
        metadata = { ...metadata, ...spec._metadata };
      }
    }

    // Extract instructions (everything after frontmatter)
    const instructions = content.substring(frontmatterMatch[0].length).trim();

    return {
      name: frontmatter.name || 'Unknown Agent',
      description: frontmatter.description || '',
      _metadata: metadata as AgentMetadata,
      instructions
    };
  }

  /**
   * Get an agent by ID
   */
  getAgent(id: string): AgentSpec | undefined {
    return this.agents.get(id);
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
    return this.getAllAgents().filter(a => a._metadata.domain === domain);
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role: 'worker' | 'orchestrator' | 'router'): AgentSpec[] {
    return this.getAllAgents().filter(a => a._metadata.role === role);
  }
}
