import { parse as parseYaml } from 'yaml';
import type { ContextPackMeta, ContextPackPriority } from '../types/index.js';

export const DEFAULT_AGENTS_MD_BUDGET = 8000;

const VALID_PRIORITIES: ContextPackPriority[] = ['essential', 'standard', 'reference'];

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Parses YAML frontmatter from a context pack's raw content.
 * Returns a partial ContextPackMeta (name and filePath must be injected by the caller).
 * If frontmatter is absent or malformed, returns {} (caller defaults to 'standard').
 */
export function parseContextPackFrontmatter(raw: string): Partial<ContextPackMeta> {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) return {};

  let parsed: Record<string, unknown>;
  try {
    parsed = (parseYaml(match[1]) as Record<string, unknown>) ?? {};
  } catch {
    console.warn('[contextPackMeta] Malformed YAML frontmatter, defaulting to standard priority');
    return {};
  }

  const priority =
    typeof parsed.priority === 'string' &&
    VALID_PRIORITIES.includes(parsed.priority as ContextPackPriority)
      ? (parsed.priority as ContextPackPriority)
      : 'standard';

  const description =
    typeof parsed.description === 'string' && parsed.description.trim().length > 0
      ? parsed.description.trim()
      : undefined;

  return { priority, description };
}

/**
 * Removes the leading YAML frontmatter block (---...---) from raw content.
 * Returns the content unchanged if no frontmatter is present.
 */
export function stripFrontmatter(raw: string): string {
  return raw.replace(FRONTMATTER_RE, '');
}
