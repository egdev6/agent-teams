/**
 * Common utility functions
 */

import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { SyncTarget } from '../types/index.js';

export * from './contextPackMeta.js';

/**
 * Load and parse a YAML file
 */
export async function loadYamlFile<T = any>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8');
  return parseYaml(content) as T;
}

/**
 * Parse YAML string content
 */
export function parseYamlString<T = any>(content: string): T {
  return parseYaml(content) as T;
}

/**
 * Check if a value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      (result as any)[key] = deepMerge(targetValue as any, sourceValue as any);
    } else if (sourceValue !== undefined) {
      (result as any)[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Normalize path separators to forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Alias kept for backwards compatibility. SyncTarget and ProfileSyncTarget are now the same:
 * schema names and runtime names are unified ('github_copilot', 'claude_code', 'codex', 'gemini', 'openai').
 */
export type ProfileSyncTarget = SyncTarget;

/**
 * Validates and normalises a raw string to a SyncTarget.
 * Previously converted short aliases ('copilot', 'claude') to internal names; those aliases are
 * now gone — schema names ARE the runtime names. Legacy aliases are still accepted for
 * compatibility with older profile files that may contain them.
 */
export function normalizeProfileSyncTarget(raw: string): SyncTarget | null {
  // Accept canonical names
  if (
    raw === 'github_copilot' ||
    raw === 'claude_code' ||
    raw === 'codex' ||
    raw === 'gemini' ||
    raw === 'openai'
  )
    return raw as SyncTarget;
  // Accept legacy short aliases from profile files written before this unification
  if (raw === 'copilot') return 'github_copilot';
  if (raw === 'claude') return 'claude_code';
  return null;
}

/**
 * Returns the canonical profile (schema) format for a SyncTarget.
 * Now a no-op since runtime and schema names are unified; kept to avoid churn at call sites.
 */
export function syncTargetToProfileFormat(target: SyncTarget): ProfileSyncTarget {
  return target;
}
