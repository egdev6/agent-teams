import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
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

function findMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...findMarkdownFiles(full));
    else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.markdown')))
      results.push(full);
  }
  return results;
}

function extractFrontmatter(content: string): string | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

export async function runValidate(argv: string[]) {
  const args = parseArgs(argv);
  const agentsDir = args.agents || 'agents';
  const schemaPath = args.schema || path.join('schemas', 'agent.schema.json');

  if (!fs.existsSync(agentsDir)) {
    throw new Error(`Agents dir not found: ${agentsDir}`);
  }
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaRaw = fs.readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(schemaRaw);

  // Remove $schema and $id to avoid external reference issues
  const cleanSchema = { ...schema };
  delete cleanSchema.$schema;
  delete cleanSchema.$id;

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(cleanSchema as object);

  const mdFiles = findMarkdownFiles(agentsDir);
  let hadError = false;
  let totalChecked = 0;

  for (const f of mdFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const fm = extractFrontmatter(content);
    if (!fm) {
      console.warn('[WARN] No frontmatter found:', f);
      continue;
    }
    let data: any;
    try {
      data = YAML.parse(fm);
    } catch (err) {
      console.error('[ERROR] YAML parse error in', f, err);
      hadError = true;
      continue;
    }

    const valid = validate(data);
    if (!valid) {
      console.error('❌ Validation failed for', f);
      console.error(validate.errors);
      hadError = true;
    } else {
      console.log('✓ OK:', f);
      totalChecked++;
    }
  }

  if (hadError) {
    throw new Error(`Validation failed for some agents`);
  }
  console.log(`✅ Validacion completada: ${totalChecked} agentes validos`);
}

// Entry point para CLI directo
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidate(process.argv.slice(2)).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
