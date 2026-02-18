/**
 * Common utility functions
 */

import { readFile } from 'node:fs/promises';
import { load as loadYaml } from 'js-yaml';
import { parse as parseYaml } from 'yaml';

/**
 * Load and parse a YAML file
 */
export async function loadYamlFile<T = any>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8');
  return loadYaml(content) as T;
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
