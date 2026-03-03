/**
 * Schema paths for validation
 * Schema JSON files are bundled within the @agent-teams/core package
 * This module provides programmatic access to schema paths
 */

import { join } from 'node:path';

// Path to schemas directory (relative to compiled dist/schemas/)
export const SCHEMAS_DIR = join(__dirname, '../../schemas');

export const SCHEMA_PATHS = {
  agent: join(SCHEMAS_DIR, 'agent.schema.json'),
  kit: join(SCHEMAS_DIR, 'kit.schema.json'),
  team: join(SCHEMAS_DIR, 'team.schema.json'),
  projectProfile: join(SCHEMAS_DIR, 'project.profile.schema.json'),
  skillsRegistry: join(SCHEMAS_DIR, 'skills.registry.schema.json'),
  skillCatalogEntry: join(SCHEMAS_DIR, 'skill-catalog-entry.schema.json'),
} as const;

export type SchemaName = keyof typeof SCHEMA_PATHS;
