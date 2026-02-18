/**
 * Common utility functions
 */
/**
 * Load and parse a YAML file
 */
export declare function loadYamlFile<T = any>(filePath: string): Promise<T>;
/**
 * Parse YAML string content
 */
export declare function parseYamlString<T = any>(content: string): T;
/**
 * Check if a value is a plain object
 */
export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
/**
 * Deep merge two objects
 */
export declare function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T;
/**
 * Normalize path separators to forward slashes
 */
export declare function normalizePath(path: string): string;
//# sourceMappingURL=index.d.ts.map
