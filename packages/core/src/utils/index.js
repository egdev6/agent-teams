/**
 * Common utility functions
 */
import { readFile } from 'node:fs/promises';
import { load as loadYaml } from 'js-yaml';
import { parse as parseYaml } from 'yaml';
/**
 * Load and parse a YAML file
 */
export async function loadYamlFile(filePath) {
    const content = await readFile(filePath, 'utf-8');
    return loadYaml(content);
}
/**
 * Parse YAML string content
 */
export function parseYamlString(content) {
    return parseYaml(content);
}
/**
 * Check if a value is a plain object
 */
export function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Deep merge two objects
 */
export function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        const sourceValue = source[key];
        const targetValue = result[key];
        if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        }
        else if (sourceValue !== undefined) {
            result[key] = sourceValue;
        }
    }
    return result;
}
/**
 * Normalize path separators to forward slashes
 */
export function normalizePath(path) {
    return path.replace(/\\/g, '/');
}
