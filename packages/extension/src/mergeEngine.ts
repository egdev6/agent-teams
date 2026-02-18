/**
 * Advanced Merge Engine for Agent Composition
 * Handles deep merging with conflict resolution strategies
 */

import type { Logger } from './logger';
import type { AgentMetadata, AgentOverride, MergeStrategy } from './types';

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
  applied: string[]; // Paths that were merged
}

/**
 * Merge options
 */
export interface MergeOptions {
  strategy?: MergeStrategy;
  arrayMergeStrategy?: 'replace' | 'concat' | 'union'; // How to merge arrays
  onConflict?: (conflict: MergeConflict) => void; // Callback for conflicts
}

/**
 * Type classification for merge operations
 */
type ValueType = 'object' | 'array' | 'primitive';

/**
 * Diff entry for change tracking
 */
export interface DiffEntry {
  path: string;
  before: any;
  after: any;
  action: 'added' | 'removed' | 'changed';
}

// Constants
const DEFAULT_STRATEGY: MergeStrategy = 'team-priority';
const DEFAULT_ARRAY_STRATEGY = 'replace' as const;
const SEPARATOR_LENGTH = 60;

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
    options: MergeOptions = {},
  ): MergeResult<AgentMetadata> {
    const strategy = options.strategy || DEFAULT_STRATEGY;
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
          { name: 'kit', data: kitMetadata },
        ];
        break;
      case 'profile-priority':
        layers = [
          { name: 'team', data: teamOverrides },
          { name: 'kit', data: kitMetadata },
          { name: 'profile', data: profileOverrides },
        ];
        break;
      case 'team-priority':
        layers = [
          { name: 'kit', data: kitMetadata },
          { name: 'profile', data: profileOverrides },
          { name: 'team', data: teamOverrides },
        ];
        break;
      case 'explicit-only':
        // Only use values that are explicitly set (non-default)
        layers = [
          { name: 'kit', data: kitMetadata },
          { name: 'profile', data: this.filterExplicit(profileOverrides) },
          { name: 'team', data: this.filterExplicit(teamOverrides) },
        ];
        break;
    }

    // Perform deep merge
    const result = this.deepMerge(layers, '', conflicts, applied, options) as AgentMetadata;

    // Log conflicts if any
    if (conflicts.length > 0) {
      this.logger.info(`Resolved ${conflicts.length} merge conflicts`);
      conflicts.forEach((c) => {
        this.logger.debug(`  ${c.path}: ${JSON.stringify(c.resolved)}`);
        if (options.onConflict) {
          options.onConflict(c);
        }
      });
    }

    return {
      value: result,
      conflicts,
      applied,
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
    options: MergeOptions,
  ): any {
    // Filter out undefined/null layers
    const validLayers = layers.filter((l) => l.data != null);
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
        this.addConflict(
          conflicts,
          applied,
          path,
          validLayers[0].data,
          override,
          layer.name,
          options,
        );
        return this.clone(override);
      }

      // Same type - merge based on type
      this.mergeByType(
        base,
        override,
        baseType,
        layer.name,
        path,
        validLayers[0].data,
        conflicts,
        applied,
        options,
      );
    }

    return base;
  }

  /**
   * Merge values based on their type (mutates base)
   */
  private mergeByType(
    base: any,
    override: any,
    baseType: ValueType,
    layerName: string,
    path: string,
    originalBase: any,
    conflicts: MergeConflict[],
    applied: string[],
    options: MergeOptions,
  ): void {
    if (baseType === 'object') {
      this.mergeObjects(base, override, layerName, path, conflicts, applied, options);
      return;
    }

    if (baseType === 'array') {
      const merged = this.mergeArrays(base, override, options);
      if (!this.areArraysEqual(base, merged)) {
        this.addConflict(conflicts, applied, path, originalBase, merged, layerName, options);
        Object.assign(base, merged);
      }
      return;
    }

    // Primitive - override wins
    if (base !== override) {
      this.addConflict(conflicts, applied, path, originalBase, override, layerName, options);
    }
  }

  /**
   * Add a merge conflict to tracking arrays
   */
  private addConflict(
    conflicts: MergeConflict[],
    applied: string[],
    path: string,
    kitValue: any,
    resolved: any,
    layerName: string,
    options: MergeOptions,
  ): void {
    const normalizedPath = path || 'root';
    const conflict: MergeConflict = {
      path: normalizedPath,
      kitValue,
      profileValue: layerName === 'profile' ? resolved : undefined,
      teamValue: layerName === 'team' ? resolved : undefined,
      resolved,
      strategy: options.strategy || DEFAULT_STRATEGY,
    };
    conflicts.push(conflict);
    applied.push(normalizedPath);
  }

  /**
   * Check if two arrays are equal
   */
  private areArraysEqual(arr1: any[], arr2: any[]): boolean {
    return JSON.stringify(arr1) === JSON.stringify(arr2);
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
    options: MergeOptions,
  ): void {
    for (const key in source) {
      if (!Object.hasOwn(source, key)) continue;

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
        this.mergeTypeConflict(
          target,
          key,
          targetValue,
          sourceValue,
          currentPath,
          layerName,
          conflicts,
          applied,
          options,
        );
      } else if (sourceType === 'object') {
        this.mergeObjects(
          target[key],
          sourceValue,
          layerName,
          currentPath,
          conflicts,
          applied,
          options,
        );
      } else if (sourceType === 'array') {
        this.mergeArrayProperty(
          target,
          key,
          targetValue,
          sourceValue,
          currentPath,
          layerName,
          conflicts,
          applied,
          options,
        );
      } else {
        this.mergePrimitiveProperty(
          target,
          key,
          targetValue,
          sourceValue,
          currentPath,
          layerName,
          conflicts,
          applied,
          options,
        );
      }
    }
  }

  /**
   * Handle type conflict during merge
   */
  private mergeTypeConflict(
    target: any,
    key: string,
    targetValue: any,
    sourceValue: any,
    path: string,
    layerName: string,
    conflicts: MergeConflict[],
    applied: string[],
    options: MergeOptions,
  ): void {
    this.addConflict(conflicts, applied, path, targetValue, sourceValue, layerName, options);
    target[key] = this.clone(sourceValue);
  }

  /**
   * Handle array property merge
   */
  private mergeArrayProperty(
    target: any,
    key: string,
    targetValue: any,
    sourceValue: any,
    path: string,
    layerName: string,
    conflicts: MergeConflict[],
    applied: string[],
    options: MergeOptions,
  ): void {
    const merged = this.mergeArrays(targetValue, sourceValue, options);
    if (!this.areArraysEqual(targetValue, merged)) {
      this.addConflict(conflicts, applied, path, targetValue, merged, layerName, options);
      target[key] = merged;
    }
  }

  /**
   * Handle primitive property merge
   */
  private mergePrimitiveProperty(
    target: any,
    key: string,
    targetValue: any,
    sourceValue: any,
    path: string,
    layerName: string,
    conflicts: MergeConflict[],
    applied: string[],
    options: MergeOptions,
  ): void {
    if (targetValue !== sourceValue) {
      this.addConflict(conflicts, applied, path, targetValue, sourceValue, layerName, options);
      target[key] = this.clone(sourceValue);
    }
  }

  /**
   * Merge arrays based on strategy
   */
  private mergeArrays(base: any[], override: any[], options: MergeOptions): any[] {
    const strategy = options.arrayMergeStrategy || DEFAULT_ARRAY_STRATEGY;

    switch (strategy) {
      case 'concat':
        return [...base, ...override];
      case 'union':
        return Array.from(new Set([...base, ...override]));
      default:
        return [...override];
    }
  }

  /**
   * Get type of value for merge operations
   */
  private getType(value: any): ValueType {
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
    if (Array.isArray(obj)) return obj.map((item) => this.clone(item));

    const cloned: any = {};
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
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
      if (Object.hasOwn(obj, key)) {
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
  createDiff(before: any, after: any, path: string = ''): DiffEntry[] {
    const diffs: DiffEntry[] = [];

    // Handle non-object values
    if (!this.isPlainObject(before) && !this.isPlainObject(after)) {
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        diffs.push({
          path: path || 'root',
          before,
          after,
          action: 'changed',
        });
      }
      return diffs;
    }

    // Check removed keys
    if (this.isPlainObject(before)) {
      this.findRemovedKeys(before, after, path, diffs);
    }

    // Check added/changed keys
    if (this.isPlainObject(after)) {
      this.findAddedOrChangedKeys(before, after, path, diffs);
    }

    return diffs;
  }

  /**
   * Check if value is a plain object (not array, not null)
   */
  private isPlainObject(value: any): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Find keys that were removed
   */
  private findRemovedKeys(
    before: Record<string, any>,
    after: any,
    basePath: string,
    diffs: DiffEntry[],
  ): void {
    for (const key in before) {
      if (!Object.hasOwn(before, key)) continue;

      const currentPath = this.buildPath(basePath, key);
      if (!(key in (after || {}))) {
        diffs.push({
          path: currentPath,
          before: before[key],
          after: undefined,
          action: 'removed',
        });
      }
    }
  }

  /**
   * Find keys that were added or changed
   */
  private findAddedOrChangedKeys(
    before: any,
    after: Record<string, any>,
    basePath: string,
    diffs: DiffEntry[],
  ): void {
    for (const key in after) {
      if (!Object.hasOwn(after, key)) continue;

      const currentPath = this.buildPath(basePath, key);

      if (!(key in (before || {}))) {
        this.addDiffEntry(diffs, currentPath, undefined, after[key], 'added');
      } else if (this.hasValueChanged(before[key], after[key])) {
        this.processChangedValue(before[key], after[key], currentPath, diffs);
      }
    }
  }

  /**
   * Build a path string from base and key
   */
  private buildPath(basePath: string, key: string): string {
    return basePath ? `${basePath}.${key}` : key;
  }

  /**
   * Check if a value has changed
   */
  private hasValueChanged(before: any, after: any): boolean {
    return JSON.stringify(before) !== JSON.stringify(after);
  }

  /**
   * Add a diff entry
   */
  private addDiffEntry(
    diffs: DiffEntry[],
    path: string,
    before: any,
    after: any,
    action: DiffEntry['action'],
  ): void {
    diffs.push({ path, before, after, action });
  }

  /**
   * Format diff for display
   */
  formatDiff(diffs: DiffEntry[]): string {
    if (diffs.length === 0) {
      return 'No changes';
    }

    const separator = '='.repeat(SEPARATOR_LENGTH);
    const lines: string[] = [`\n${separator}`, `CHANGES (${diffs.length} total)`, separator];

    for (const diff of diffs) {
      lines.push('', ...this.formatDiffEntry(diff));
    }

    lines.push(`\n${separator}`);
    return lines.join('\n');
  }

  /**
   * Format a single diff entry
   */
  private formatDiffEntry(diff: DiffEntry): string[] {
    switch (diff.action) {
      case 'added':
        return [`+ ${diff.path}`, `  Value: ${this.formatValue(diff.after)}`];
      case 'removed':
        return [`- ${diff.path}`, `  Was: ${this.formatValue(diff.before)}`];
      case 'changed':
        return [
          `~ ${diff.path}`,
          `  Before: ${this.formatValue(diff.before)}`,
          `  After:  ${this.formatValue(diff.after)}`,
        ];
    }
  }

  /**
   * Process a changed value, recursing into objects if needed
   */
  private processChangedValue(
    before: any,
    after: any,
    currentPath: string,
    diffs: DiffEntry[],
  ): void {
    if (this.isPlainObject(before) && this.isPlainObject(after)) {
      // Recursively diff nested objects
      const nestedDiffs = this.createDiff(before, after, currentPath);
      diffs.push(...nestedDiffs);
    } else if (Array.isArray(before) && Array.isArray(after)) {
      // For arrays, treat as changed
      this.addDiffEntry(diffs, currentPath, before, after, 'changed');
    } else {
      // For primitives or type mismatches, treat as changed
      this.addDiffEntry(diffs, currentPath, before, after, 'changed');
    }
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
