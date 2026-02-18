import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { SCHEMA_PATHS, TEMPLATE_PATHS } from '@agent-teams/core';
import Ajv from 'ajv';
import YAML from 'yaml';

type ProjectConfig = {
  githubDir?: string;
  agents?: {
    specsDir?: string;
    template?: string;
    schema?: string;
    outDir?: string;
    extension?: string;
  };
  skills?: {
    sourceDir?: string;
    outDir?: string;
  };
  instructions?: {
    sourceFile?: string;
    sourceDir?: string;
    outFile?: string;
    outDir?: string;
  };
};

type Args = {
  project: string;
  config?: string;
  clean?: boolean;
};

function _usage() {
  console.log(
    'Usage: ts-node tools/sync-agents.ts --project <project_dir> [--config <path>] [--clean]',
  );
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const hasFlag = (flag: string) => argv.includes(flag);

  const project = get('--project');
  if (!project) throw new Error('Missing --project <project_dir>');

  return {
    project,
    config: get('--config'),
    clean: hasFlag('--clean'),
  };
}

function resolvePath(baseDir: string, value?: string): string | undefined {
  if (!value) return undefined;
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

function readConfig(configPath: string): ProjectConfig {
  if (!fs.existsSync(configPath)) return {};
  const raw = fs.readFileSync(configPath, 'utf8');
  const ext = path.extname(configPath).toLowerCase();
  if (ext === '.yml' || ext === '.yaml') return YAML.parse(raw) ?? {};
  if (ext === '.json') return JSON.parse(raw) ?? {};
  throw new Error(`Unsupported config extension: ${ext} (use .yml/.yaml/.json)`);
}

function readSpec(specPath: string): any {
  const raw = fs.readFileSync(specPath, 'utf8');
  const ext = path.extname(specPath).toLowerCase();
  if (ext === '.yml' || ext === '.yaml') return YAML.parse(raw);
  if (ext === '.json') return JSON.parse(raw);
  throw new Error(`Unsupported spec extension: ${ext} (use .yml/.yaml/.json)`);
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function _renderTemplate(template: string, vars: Record<string, string>): string {
  let out: string = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

function initializeMetadata(meta: any, name: string): void {
  // Generate ID from name if not provided
  if (!meta.id) {
    meta.id = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  // Set defaults
  if (!meta.role) meta.role = 'worker';
  if (!meta.domain) meta.domain = 'backend';
  if (!Array.isArray(meta.subdomains)) meta.subdomains = [];
  if (!Array.isArray(meta.intents)) meta.intents = [];
  if (!Array.isArray(meta.path_globs)) meta.path_globs = [];
  if (!Array.isArray(meta.keywords)) meta.keywords = [];
}

function initializeOutputDefaults(meta: any): void {
  // Output defaults
  if (!meta.output) meta.output = {};
  if (!meta.output.mode_default) meta.output.mode_default = 'short+diff';
  if (typeof meta.output.max_bullets !== 'number') meta.output.max_bullets = 7;
  if (!Array.isArray(meta.output.schema)) {
    meta.output.schema = ['Resumen', 'Cambios', 'Verificacion'];
  }
  if (!Array.isArray(meta.output.never_include)) {
    meta.output.never_include = [
      'theory',
      'full_files',
      'duplicate_code',
      'unbounded_lists',
      'verbose_explanations',
    ];
  }
}

function normalize(spec: any): any {
  const s = { ...spec };

  // New format: name and description at top level
  if (!s.name) throw new Error('Missing required field: name');
  if (!s.description) s.description = '';

  // Metadata section (optional, used by tooling)
  if (!s._metadata) s._metadata = {};
  const meta = s._metadata;

  initializeMetadata(meta, s.name);
  initializeOutputDefaults(meta);

  // Verification defaults
  if (!meta.verification) meta.verification = true;

  return s;
}

function validateAgainstSchema(schemaPath: string, data: any) {
  const schema = readJson(schemaPath);
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
    loadSchema: undefined, // Disable loading external schemas
  });
  // Remove $schema and $id to avoid external reference issues
  const cleanSchema = { ...schema };
  delete cleanSchema.$schema;
  delete cleanSchema.$id;

  const validate = ajv.compile(cleanSchema);
  const ok = validate(data);
  if (!ok) {
    const msg = ajv.errorsText(validate.errors, { separator: '\n' });
    throw new Error(`Agent spec does not match schema:\n${msg}`);
  }
}

function listSpecFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSpecFiles(full));
    else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.yml' || ext === '.yaml' || ext === '.json') out.push(full);
    }
  }
  return out;
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  fs.cpSync(src, dest, { recursive: true });
}

function cleanDir(dir: string) {
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir);
  let count = 0;
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    fs.rmSync(fullPath, { recursive: true, force: true });
    count++;
  }
  return count;
}

function renderAgentTemplate(templateRaw: string, spec: any, meta: any): string {
  const intentsFormatted = (meta.intents || []).map((i: string) => `- ${i}`).join('\n');
  const subdomainsFormatted = (meta.subdomains || []).map((s: string) => `- ${s}`).join('\n');
  const pathGlobsFormatted = (meta.path_globs || []).map((p: string) => `- \`${p}\``).join('\n');
  const keywordsFormatted = (meta.keywords || []).map((k: string) => `- ${k}`).join('\n');
  const neverIncludeFormatted = (meta.output?.never_include || [])
    .map((n: string) => `- ${n}`)
    .join('\n');
  const schemaFormatted = (meta.output?.schema || []).map((s: string) => `### ${s}\n\n`).join('');

  return templateRaw
    .replace(/\{\{name\}\}/g, spec.name)
    .replace(/\{\{description\}\}/g, spec.description)
    .replace(/\{\{_metadata\.id\}\}/g, meta.id || '')
    .replace(/\{\{_metadata\.domain\}\}/g, meta.domain || '')
    .replace(/\{\{_metadata\.role\}\}/g, meta.role || 'worker')
    .replace(/\{\{_metadata\.intents\}\}/g, (meta.intents || []).join(', '))
    .replace(/\{\{#each _metadata\.intents\}\}[\s\S]*?\{\{\/each\}\}/g, intentsFormatted)
    .replace(
      /\{\{#if _metadata\.subdomains\}\}[\s\S]*?\{\{\/if\}\}/g,
      meta.subdomains?.length ? `### Subdomains\n\n${subdomainsFormatted}\n` : '',
    )
    .replace(
      /\{\{#if _metadata\.path_globs\}\}[\s\S]*?\{\{\/if\}\}/g,
      meta.path_globs?.length
        ? `## Relevant Files\n\nThis agent primarily works with files matching:\n\n${pathGlobsFormatted}\n`
        : '',
    )
    .replace(
      /\{\{#if _metadata\.keywords\}\}[\s\S]*?\{\{\/if\}\}/g,
      meta.keywords?.length
        ? `## Keywords\n\nLook for these keywords in requests:\n\n${keywordsFormatted}\n`
        : '',
    )
    .replace(/\{\{#each _metadata\.output\.schema\}\}[\s\S]*?\{\{\/each\}\}/g, schemaFormatted)
    .replace(
      /\{\{#each _metadata\.output\.never_include\}\}[\s\S]*?\{\{\/each\}\}/g,
      neverIncludeFormatted,
    )
    .replace(/\{\{_metadata\.output\.max_bullets\}\}/g, String(meta.output?.max_bullets || 7))
    .replace(
      /\{\{#if _metadata\.verification\}\}[\s\S]*?\{\{\/if\}\}/g,
      meta.verification
        ? '### Verification Steps\n\nAlways verify changes by:\n- Checking syntax and imports\n- Ensuring compatibility with existing code\n- Testing in relevant environment when possible\n'
        : '',
    );
}

function processAgentSpec(
  specFile: string,
  schemaPath: string,
  templateRaw: string,
  agentsOutDir: string,
  agentsExtension: string,
): boolean {
  try {
    const specRaw = readSpec(specFile);
    const spec = normalize(specRaw);
    validateAgainstSchema(schemaPath, spec);

    const meta = spec._metadata;
    const rendered = renderAgentTemplate(templateRaw, spec, meta);

    const ext = agentsExtension.startsWith('.') ? agentsExtension : `.${agentsExtension}`;
    const outPath = path.join(agentsOutDir, `${meta.id}${ext}`);
    fs.writeFileSync(outPath, rendered, 'utf8');

    const specOutDir = path.join(agentsOutDir, '_spec');
    ensureDir(specOutDir);
    fs.writeFileSync(path.join(specOutDir, `${meta.id}.yml`), YAML.stringify(spec), 'utf8');

    return true;
  } catch (err) {
    console.warn(`⚠️  Spec incompleto o inválido (ignorado): ${path.basename(specFile)}`);
    if (err instanceof Error) console.warn(`   Detalle: ${err.message.split('\n')[0]}`);
    return false;
  }
}

function syncSkills(skillsSourceDir: string | undefined, skillsOutDir: string): void {
  if (!skillsSourceDir) return;
  if (fs.existsSync(skillsSourceDir)) {
    copyDir(skillsSourceDir, skillsOutDir);
    console.log(`✓ Skills sincronizados: ${skillsSourceDir} -> ${skillsOutDir}`);
  } else {
    console.warn(`Skills source not found: ${skillsSourceDir}`);
  }
}

function syncInstructionsFile(
  instructionsSourceFile: string | undefined,
  instructionsOutFile: string,
): void {
  if (!instructionsSourceFile) return;
  if (fs.existsSync(instructionsSourceFile)) {
    ensureDir(path.dirname(instructionsOutFile));
    fs.copyFileSync(instructionsSourceFile, instructionsOutFile);
    console.log(
      `✓ Instrucciones sincronizadas: ${instructionsSourceFile} -> ${instructionsOutFile}`,
    );
  } else {
    console.warn(`Instructions file not found: ${instructionsSourceFile}`);
  }
}

function syncInstructionsDir(
  instructionsSourceDir: string | undefined,
  instructionsOutDir: string,
): void {
  if (!instructionsSourceDir) return;
  if (fs.existsSync(instructionsSourceDir)) {
    copyDir(instructionsSourceDir, instructionsOutDir);
    console.log(
      `✓ Carpeta de instrucciones sincronizada: ${instructionsSourceDir} -> ${instructionsOutDir}`,
    );
  } else {
    console.warn(`Instructions dir not found: ${instructionsSourceDir}`);
  }
}

type ResolvedPaths = {
  projectDir: string;
  configDir: string;
  githubDir: string;
  specsDir: string;
  templatePath: string;
  schemaPath: string;
  agentsOutDir: string;
  agentsExtension: string;
  skillsSourceDir: string | undefined;
  skillsOutDir: string;
  instructionsSourceFile: string | undefined;
  instructionsSourceDir: string | undefined;
  instructionsOutFile: string;
  instructionsOutDir: string;
};

function resolvePaths(args: Args, projectDir: string): ResolvedPaths {
  const defaultConfigPath = path.join(projectDir, 'project.config.yml');
  const configPath = args.config ? path.resolve(args.config) : defaultConfigPath;
  const configDir = path.dirname(configPath);
  const config = readConfig(configPath);

  const githubDir = resolvePath(configDir, config.githubDir) ?? path.join(projectDir, '.github');

  const specsDir =
    resolvePath(configDir, config.agents?.specsDir) ?? path.join(projectDir, 'specs');
  const templatePath = resolvePath(configDir, config.agents?.template) ?? TEMPLATE_PATHS.agent;
  const schemaPath = resolvePath(configDir, config.agents?.schema) ?? SCHEMA_PATHS.agent;
  const agentsOutDir =
    resolvePath(configDir, config.agents?.outDir) ?? path.join(githubDir, 'agents');
  const agentsExtension = config.agents?.extension ?? '.agent.md';

  const skillsSourceDir = resolvePath(configDir, config.skills?.sourceDir);
  const skillsOutDir =
    resolvePath(configDir, config.skills?.outDir) ?? path.join(githubDir, 'skills');

  const instructionsSourceFile = resolvePath(configDir, config.instructions?.sourceFile);
  const instructionsSourceDir = resolvePath(configDir, config.instructions?.sourceDir);
  const instructionsOutFile =
    resolvePath(configDir, config.instructions?.outFile) ??
    path.join(githubDir, 'copilot-instructions.md');
  const instructionsOutDir =
    resolvePath(configDir, config.instructions?.outDir) ?? path.join(githubDir, 'instructions');

  return {
    projectDir,
    configDir,
    githubDir,
    specsDir,
    templatePath,
    schemaPath,
    agentsOutDir,
    agentsExtension,
    skillsSourceDir,
    skillsOutDir,
    instructionsSourceFile,
    instructionsSourceDir,
    instructionsOutFile,
    instructionsOutDir,
  };
}

function validateRequiredPaths(paths: ResolvedPaths): void {
  if (!fs.existsSync(paths.specsDir)) throw new Error(`Specs dir not found: ${paths.specsDir}`);
  if (!fs.existsSync(paths.templatePath))
    throw new Error(`Template not found: ${paths.templatePath}`);
  if (!fs.existsSync(paths.schemaPath)) throw new Error(`Schema not found: ${paths.schemaPath}`);
}

function processCleaning(paths: ResolvedPaths, shouldClean: boolean): void {
  if (!shouldClean) return;
  const cleaned = cleanDir(paths.agentsOutDir);
  if (cleaned > 0) {
    console.log(`🗑️  Limpiados ${cleaned} archivo(s) de ${paths.agentsOutDir}`);
  }
}

function processAllAgents(paths: ResolvedPaths, templateRaw: string): number {
  const specFiles = listSpecFiles(paths.specsDir);
  let created = 0;

  for (const specFile of specFiles) {
    if (
      processAgentSpec(
        specFile,
        paths.schemaPath,
        templateRaw,
        paths.agentsOutDir,
        paths.agentsExtension,
      )
    ) {
      created++;
    }
  }

  return created;
}

export async function runSync(argv: string[]) {
  const args = parseArgs(argv);

  const projectDir = path.resolve(args.project);
  if (!fs.existsSync(projectDir)) {
    throw new Error(`Project dir not found: ${projectDir}`);
  }

  const paths = resolvePaths(args, projectDir);
  validateRequiredPaths(paths);

  ensureDir(paths.agentsOutDir);
  processCleaning(paths, args.clean ?? false);

  const templateRaw = fs.readFileSync(paths.templatePath, 'utf8');
  const created = processAllAgents(paths, templateRaw);

  syncSkills(paths.skillsSourceDir, paths.skillsOutDir);
  syncInstructionsFile(paths.instructionsSourceFile, paths.instructionsOutFile);
  syncInstructionsDir(paths.instructionsSourceDir, paths.instructionsOutDir);

  console.log(`✅ Agentes sincronizados: ${created}`);
}

// Entry point para CLI directo
if (import.meta.url === `file://${process.argv[1]}`) {
  runSync(process.argv.slice(2)).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
