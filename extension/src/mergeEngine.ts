/**
 * Advanced Merge Engine for Agent Composition
 * Handles deep merging with conflict resolution strategies
 */

import { AgentOverride, MergeStrategy, AgentMetadata } from './types';
import { Logger } from './logger';

/**
 * Merge conflict information
 */
export interface MergeConflict {
  path: string;
  kitValue: any;
  profileValue?: any;
  teamValue?: any;
  resolved: any;
  strategy: MergeStrategy;
}

/**
 * Merge result with metadata
 */
export interface MergeResult<T = any> {
  value: T;
  conflicts: MergeConflict[];
  applied: string[];  // Paths that were merged
}

/**
 * Merge options
 */
export interface MergeOptions {
  strategy?: MergeStrategy;
  arrayMergeStrategy?: 'replace' | 'concat' | 'union';  // How to merge arrays
  onConflict?: (conflict: MergeConflict) => void;  // Callback for conflicts
}

/**
 * Advanced merge engine for agent composition
 */
export class MergeEngine {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Merge agent metadata with overrides using specified strategy
   * Order of priority (depending on strategy):
   *   - kit: Values from kit agent spec
   *   - profile: Values from project profile overrides
   *   - team: Values from team profile overrides
   */
  mergeAgentMetadata(
    kitMetadata: AgentMetadata,
    profileOverrides?: AgentOverride,
    teamOverrides?: AgentOverride,
    options: MergeOptions = {}
  ): MergeResult<AgentMetadata> {
    const strategy = options.strategy || 'team-priority';
    const conflicts: MergeConflict[] = [];
    const applied: string[] = [];

    this.logger.debug(`Merging agent metadata with strategy: ${strategy}`);

    // Determine merge order based on strategy
    let layers: Array<{ name: string; data: any }>;
    switch (strategy) {
      case 'kit-priority':
        layers = [
          { name: 'team', data: teamOverrides },
          { name: 'profile', data: profileOverrides },
          { name: 'kit', data: kitMetadata }
        ];
        break;
      case 'profile-priority':
        layers = [
          { name: 'team', data: teamOverrides },
          { name: 'kit', data: kitMetadata },
          { name: 'profile', data: profileOverrides }
        ];
        break;
      case 'team-priority':
        layers = [
          { name: 'kit', data: kitMetadata },
          { name: 'profile', data: profileOverrides },
          { name: 'team', data: teamOverrides }
        ];
        break;
      case 'explicit-only':
        // Only use values that are explicitly set (non-default)
        layers = [
          { name: 'kit', data: kitMetadata },
          { name: 'profile', data: this.filterExplicit(profileOverrides) },
          { name: 'team', data: this.filterExplicit(teamOverrides) }
        ];
        break;
    }

    // Perform deep merge
    const result = this.deepMerge(
      layers,
      '',
      conflicts,
      applied,
      options
    ) as AgentMetadata;

    // Log conflicts if any
    if (conflicts.length > 0) {
      this.logger.info(`Resolved ${conflicts.length} merge conflicts`);
      conflicts.forEach(c => {
        this.logger.debug(`  ${c.path}: ${JSON.stringify(c.resolved)}`);
        if (options.onConflict) {
          options.onConflict(c);
        }
      });
    }

    return {
      value: result,
      conflicts,
      applied
    };
  }

  /**
   * Deep merge multiple layers with conflict tracking
   */
  private deepMerge(
    layers: Array<{ name: string; data: any }>,
    path: string,
    conflicts: MergeConflict[],
    applied: string[],
    options: MergeOptions
  ): any {
    // Filter out undefined/null layers
    const validLayers = layers.filter(l => l.data != null);
    if (validLayers.length === 0) return undefined;
    if (validLayers.length === 1) return this.clone(validLayers[0].data);

    // Get base layer (first)
    const base = this.clone(validLayers[0].data);
    const baseType = this.getType(base);

    // Merge each subsequent layer
    for (let i = 1; i < validLayers.length; i++) {
      const layer = validLayers[i];
      const override = layer.data;
      const overrideType = this.getType(override);

      // Type mismatch - use override based on strategy
      if (baseType !== overrideType) {
        conflicts.push({
          path: path || 'root',
          kitValue: validLayers[0].data,
          profileValue: layer.name === 'profile' ? override : undefined,
          teamValue: layer.name === 'team' ? override : undefined,
          resolved: override,
          strategy: options.strategy || 'team-priority'
        });
        return this.clone(override);
      }

      // Same type - merge based on type
      if (baseType === 'object') {
        this.mergeObjects(base, override, layer.name, path, conflicts, applied, options);
      } else if (baseType === 'array') {
        const merged = this.mergeArrays(base, override, options);
        if (JSON.stringify(base) !== JSON.stringify(merged)) {
          conflicts.push({
            path: path || 'root',
            kitValue: validLayers[0].data,
            profileValue: layer.name === 'profile' ? override : undefined,
            teamValue: layer.name === 'team' ? override : undefined,
            resolved: merged,
            strategy: options.strategy || 'team-priority'
          });
          applied.push(path || 'root');
        }
        return merged;
      } else {
        // Primitive - override wins
        if (base !== override) {
          conflicts.push({
            path: path || 'root',
            kitValue: validLayers[0].data,
            profileValue: layer.name === 'profile' ? override : undefined,
            teamValue: layer.name === 'team' ? override : undefined,
            resolved: override,
            strategy: options.strategy || 'team-priority'
          });
          applied.push(path || 'root');
        }
        return this.clone(override);
      }
    }

    return base;
  }

  /**
   * Merge two objects recursively
   */
  private mergeObjects(
    target: any,
    source: any,
    layerName: string,
    path: string,
    conflicts: MergeConflict[],
    applied: string[],
    options: MergeOptions
  ): void {
    for (const key in source) {
      if (!source.hasOwnProperty(key)) continue;

      const currentPath = path ? `${path}.${key}` : key;
      const sourceValue = source[key];
      const targetValue = target[key];

      if (targetValue === undefined) {
        // New property - just add it
        target[key] = this.clone(sourceValue);
        applied.push(currentPath);
        continue;
      }

      const sourceType = this.getType(sourceValue);
      const targetType = this.getType(targetValue);

      if (sourceType !== targetType) {
        // Type conflict - source wins
        conflicts.push({
          path: currentPath,
          kitValue: targetValue,
          profileValue: layerName === 'profile' ? sourceValue : undefined,
          teamValue: layerName === 'team' ? sourceValue : undefined,
          resolved: sourceValue,
          strategy: options.strategy || 'team-priority'
        });
        target[key] = this.clone(sourceValue);
        applied.push(currentPath);
      } else if (sourceType === 'object') {
        // Recursive merge
        this.mergeObjects(target[key], sourceValue, layerName, currentPath, conflicts, applied, options);
      } else if (sourceType === 'array') {
        // Array merge
        const merged = this.mergeArrays(targetValue, sourceValue, options);
        if (JSON.stringify(targetValue) !== JSON.stringify(merged)) {
          conflicts.push({
            path: currentPath,
            kitValue: targetValue,
            profileValue: layerName === 'profile' ? sourceValue : undefined,
            teamValue: layerName === 'team' ? sourceValue : undefined,
            resolved: merged,
            strategy: options.strategy || 'team-priority'
          });
          target[key] = merged;
          applied.push(currentPath);
        }
      } else {
        // Primitive - check if different
        if (targetValue !== sourceValue) {
          conflicts.push({
            path: currentPath,
            kitValue: targetValue,
            profileValue: layerName === 'profile' ? sourceValue : undefined,
            teamValue: layerName === 'team' ? sourceValue : undefined,
            resolved: sourceValue,
            strategy: options.strategy || 'team-priority'
          });
          target[key] = this.clone(sourceValue);
          applied.push(currentPath);
        }
      }
    }
  }

  /**
   * Merge arrays based on strategy
   */
  private mergeArrays(base: any[], override: any[], options: MergeOptions): any[] {
    const strategy = options.arrayMergeStrategy || 'replace';

    switch (strategy) {
      case 'concat':
        return [...base, ...override];
      case 'union':
        return Array.from(new Set([...base, ...override]));
      case 'replace':
      default:
        return [...override];
    }
  }

  /**
   * Get type of value
   */
  private getType(value: any): 'object' | 'array' | 'primitive' {
    if (value === null || value === undefined) return 'primitive';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'primitive';
  }

  /**
   * Deep clone object
   */
  private clone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.clone(item));
    
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.clone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Filter object to only include explicitly set values
   * (Remove undefined, null, empty objects, empty arrays)
   */
  private filterExplicit(obj: any): any {
    if (obj == null) return undefined;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.length > 0 ? obj : undefined;
    }

    const filtered: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = this.filterExplicit(obj[key]);
        if (value !== undefined) {
          filtered[key] = value;
        }
      }
    }

    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }

  /**
   * Create a diff report for two objects
   */
  createDiff(
    before: any,
    after: any,
    path: string = ''
  ): Array<{ path: string; before: any; after: any; action: 'added' | 'removed' | 'changed' }> {
    const diffs: Array<{ path: string; before: any; after: any; action: 'added' | 'removed' | 'changed' }> = [];

    // Check removed keys
    if (typeof before === 'object' && before !== null && !Array.isArray(before)) {
      for (const key in before) {
        if (before.hasOwnProperty(key)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (!(key in (after || {}))) {
            diffs.push({
              path: currentPath,
              before: before[key],
              after: undefined,
              action: 'removed'
            });
          }
        }
      }
    }

    // Check added/changed keys
    if (typeof after === 'object' && after !== null && !Array.isArray(after)) {
      for (const key in after) {
        if (after.hasOwnProperty(key)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (!(key in (before || {}))) {
            diffs.push({
              path: currentPath,
              before: undefined,
              after: after[key],
              action: 'added'
            });
          } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            if (typeof after[key] === 'object' && after[key] !== null && !Array.isArray(after[key])) {
              // Recurse for nested objects
              diffs.push(...this.createDiff(before[key], after[key], currentPath));
            } else {
              diffs.push({
                path: currentPath,
                before: before[key],
                after: after[key],
                action: 'changed'
              });
            }
          }
        }
      }
    } else if (JSON.stringify(before) !== JSON.stringify(after)) {
      diffs.push({
        path: path || 'root',
        before,
        after,
        action: 'changed'
      });
    }

    return diffs;
  }

  /**
   * Format diff for display
   */
  formatDiff(
    diffs: Array<{ path: string; before: any; after: any; action: 'added' | 'removed' | 'changed' }>
  ): string {
    if (diffs.length === 0) {
      return 'No changes';
    }

    const lines: string[] = [];
    lines.push(`\n${'='.repeat(60)}`);
    lines.push(`CHANGES (${diffs.length} total)`);
    lines.push('='.repeat(60));

    for (const diff of diffs) {
      lines.push('');
      
      if (diff.action === 'added') {
        lines.push(`+ ${diff.path}`);
        lines.push(`  Value: ${this.formatValue(diff.after)}`);
      } else if (diff.action === 'removed') {
        lines.push(`- ${diff.path}`);
        lines.push(`  Was: ${this.formatValue(diff.before)}`);
      } else {
        lines.push(`~ ${diff.path}`);
        lines.push(`  Before: ${this.formatValue(diff.before)}`);
        lines.push(`  After:  ${this.formatValue(diff.after)}`);
      }
    }

    lines.push('\n' + '='.repeat(60));
    return lines.join('\n');
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): string {
    if (value === undefined) return '<undefined>';
    if (value === null) return '<null>';
    if (typeof value === 'string') return `"${value}"`;
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return `{${Object.keys(value).length} keys}`;
    return String(value);
  }
}
