/**
 * Schema paths for validation
 * Schema JSON files are bundled within the @agent-teams/core package
 * This module provides programmatic access to schema paths
 */
export declare const SCHEMAS_DIR: string;
export declare const SCHEMA_PATHS: {
  readonly agent: string;
  readonly kit: string;
  readonly team: string;
  readonly projectProfile: string;
  readonly skillsRegistry: string;
};
export type SchemaName = keyof typeof SCHEMA_PATHS;
//# sourceMappingURL=index.d.ts.map
