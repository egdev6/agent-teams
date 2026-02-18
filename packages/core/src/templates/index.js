/**
 * Template paths bundled within the @agent-teams/core package
 * This module provides programmatic access to default template paths
 */
import { join } from 'node:path';
// Path to templates directory (relative to compiled dist/templates/)
export const TEMPLATES_DIR = join(__dirname, '../../templates');
export const TEMPLATE_PATHS = {
    agent: join(TEMPLATES_DIR, 'agent.template.md'),
};
