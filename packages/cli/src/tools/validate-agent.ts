import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { SCHEMA_PATHS } from '@agent-teams/core';
import { Ajv } from 'ajv';
import YAML from 'yaml';

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].replace(/^--/, '');
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
      out[key] = val;
      if (val) i++;
    }
  }
  return out;
}

function findFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...findFiles(full, exts));
    else if (e.isFile() && exts.some((ext) => e.name.endsWith(ext))) results.push(full);
  }
  return results;
}

function extractFrontmatter(content: string): string | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

function parseFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.yml' || ext === '.yaml') return YAML.parse(raw);
  if (ext === '.json') return JSON.parse(raw);
  // Markdown: extract and parse frontmatter
  const fm = extractFrontmatter(raw);
  if (!fm) return null;
  return YAML.parse(fm);
}

export async function runValidate(argv: string[]) {
  const args = parseArgs(argv);
  const agentsDir = args.agents || 'agents';
  const schemaPath = args.schema || SCHEMA_PATHS.agent;

  if (!fs.existsSync(agentsDir)) {
    throw new Error(`Agents dir not found: ${agentsDir}`);
  }
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const clean: Record<string, unknown> = { ...schema };
  delete clean.$schema;
  delete clean.$id;

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(clean);

  // Validate both YAML spec files and MD files (via frontmatter)
  const files = findFiles(agentsDir, ['.yml', '.yaml', '.md', '.markdown']).filter(
    (f) => !f.includes('_templates'),
  );

  let hadError = false;
  let totalChecked = 0;

  for (const f of files) {
    let data: unknown;
    try {
      data = parseFile(f);
    } catch (err) {
      console.error('[ERROR] Parse error in', f, err);
      hadError = true;
      continue;
    }

    if (!data) {
      console.warn('[WARN] No parseable content found:', f);
      continue;
    }

    const valid = validate(data);
    if (!valid) {
      console.error('❌ Validation failed for', f);
      console.error(ajv.errorsText(validate.errors, { separator: '\n  ' }));
      hadError = true;
    } else {
      console.log('✓ OK:', f);
      totalChecked++;
    }
  }

  if (hadError) throw new Error('Validation failed for some agents');
  console.log(`✅ Validation complete: ${totalChecked} agent(s) valid`);
}

// Entry point para CLI directo
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidate(process.argv.slice(2)).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
