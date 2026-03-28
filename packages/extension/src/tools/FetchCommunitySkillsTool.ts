import * as https from 'node:https';
import * as vscode from 'vscode';

interface FetchCommunitySkillsInput {
  query: string;
  limit?: number;
}

interface SkillItem {
  id: string;
  title: string;
  description?: string;
  installs?: number;
  githubUrl?: string;
  tags: string[];
}

/**
 * LanguageModelTool that lets agents (consultant, agent-designer) search for
 * community skills on skills.lc when the local registry has no relevant matches.
 *
 * Flow:
 * 1. Agent calls this tool with a domain/intent query and optional result limit.
 * 2. Tool fetches the full public catalog from skills.lc and filters client-side.
 * 3. Results are ranked by installs descending and capped at `limit` (default 3).
 * 4. Tool returns a plain-text summary: id, title, description, installs, and
 *    a skills.lc install page URL for each hit.
 * 5. The agent presents suggestions as comments/notes — never in the `skills:`
 *    YAML block, since they are not yet installed locally.
 */
export class FetchCommunitySkillsTool
  implements vscode.LanguageModelTool<FetchCommunitySkillsInput>
{
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<FetchCommunitySkillsInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const { query, limit = 3 } = options.input;
    const normalizedQuery = query.trim().toLowerCase();
    const cap = Math.min(Math.max(1, limit), 10);

    let results: SkillItem[] = [];

    try {
      const raw = await FetchCommunitySkillsTool.fetchPublicCatalog();
      results = FetchCommunitySkillsTool.filterAndRank(raw, normalizedQuery, cap);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Could not reach skills.lc: ${String(error)}. Proceed without community skill suggestions.`,
        ),
      ]);
    }

    if (results.length === 0) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `No community skills found on skills.lc matching "${query}". Proceed without suggestions.`,
        ),
      ]);
    }

    const lines: string[] = [
      `Found ${results.length} community skill(s) on skills.lc matching "${query}".`,
      'These are NOT installed in the workspace. Present them as suggestions only — do NOT add them to the `skills:` YAML block.',
      'The user can install them via the Skills Browser panel.',
      '',
    ];

    for (const skill of results) {
      const installs =
        skill.installs != null ? ` (${skill.installs.toLocaleString()} installs)` : '';
      lines.push(`- **${skill.id}**${installs}: ${skill.title}`);
      if (skill.description) lines.push(`  ${skill.description}`);
      lines.push(`  Install page: https://skills.lc/${encodeURIComponent(skill.id)}`);
      if (skill.tags.length > 0) lines.push(`  Tags: ${skill.tags.join(', ')}`);
    }

    return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(lines.join('\n'))]);
  }

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<FetchCommunitySkillsInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation> {
    const { query, limit = 3 } = options.input;
    return {
      invocationMessage: `Searching skills.lc for "${query}" (up to ${limit} results)…`,
    };
  }

  private static fetchPublicCatalog(): Promise<SkillItem[]> {
    return new Promise((resolve, reject) => {
      const req = https.get(
        {
          hostname: 'skills.lc',
          path: '/api/skills?limit=500',
          headers: { Accept: 'application/json' },
        },
        (res) => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 400) {
            res.resume();
            reject(new Error(`HTTP ${res.statusCode ?? 'unknown'}`));
            return;
          }
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              const json = JSON.parse(body) as Record<string, unknown>;
              const raw = Array.isArray(json.data) ? (json.data as Record<string, unknown>[]) : [];
              resolve(raw.map(FetchCommunitySkillsTool.mapItem).filter((s) => s.id.length > 0));
            } catch {
              reject(new Error('Invalid JSON response from skills.lc'));
            }
          });
        },
      );
      req.setTimeout(10000, () => req.destroy(new Error('Request timed out')));
      req.on('error', reject);
    });
  }

  private static mapItem(item: Record<string, unknown>): SkillItem {
    return {
      id: String(item.skillId ?? item.id ?? ''),
      title: String(item.name ?? item.skillId ?? ''),
      description: typeof item.description === 'string' ? item.description : undefined,
      installs:
        typeof item.installs === 'number'
          ? item.installs
          : typeof item.stars === 'number'
            ? item.stars
            : undefined,
      githubUrl:
        typeof item.githubUrl === 'string'
          ? item.githubUrl
          : typeof item.source === 'string'
            ? `https://github.com/${item.source}`
            : undefined,
      tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
    };
  }

  private static filterAndRank(skills: SkillItem[], query: string, limit: number): SkillItem[] {
    const filtered = skills.filter(
      (s) =>
        s.id.toLowerCase().includes(query) ||
        s.title.toLowerCase().includes(query) ||
        (s.description?.toLowerCase().includes(query) ?? false) ||
        s.tags.some((t) => t.toLowerCase().includes(query)),
    );
    filtered.sort((a, b) => (b.installs ?? 0) - (a.installs ?? 0));
    return filtered.slice(0, limit);
  }
}
