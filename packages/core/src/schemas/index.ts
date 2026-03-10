/**
 * Schema paths for validation
 * Schema JSON files are bundled within the @agent-teams/core package
 * This module provides programmatic access to schema paths
 */

import { join } from 'node:path';

// Default: works for standalone core package (compiled to dist/schemas/index.js)
// Can be overridden at runtime via setSchemaBasePath() for bundled environments (e.g. esbuild).
let _schemasDir = join(__dirname, '../../schemas');

/**
 * Override the schemas directory path.
 * Must be called before any SCHEMA_PATHS access when the package is bundled
 * (e.g. esbuild), since __dirname in a bundle resolves to the output directory.
 */
export function setSchemaBasePath(dir: string): void {
  _schemasDir = dir;
}

export const SCHEMA_PATHS = {
  get agent() {
    return join(_schemasDir, 'agent.schema.json');
  },
  get kit() {
    return join(_schemasDir, 'kit.schema.json');
  },
  get team() {
    return join(_schemasDir, 'team.schema.json');
  },
  get projectProfile() {
    return join(_schemasDir, 'project.profile.schema.json');
  },
  get skillsRegistry() {
    return join(_schemasDir, 'skills.registry.schema.json');
  },
  get skillCatalogEntry() {
    return join(_schemasDir, 'skill-catalog-entry.schema.json');
  },
} as const;

export type SchemaName = keyof typeof SCHEMA_PATHS;
