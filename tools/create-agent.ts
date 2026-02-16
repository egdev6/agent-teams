import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import YAML from "yaml";
import Ajv from "ajv";

type Args = {
  spec: string;
  outDir: string;
  template: string;
  schema: string;
};

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const spec = get("--spec");
  if (!spec) throw new Error("Missing --spec <path-to-agent-spec.(yml|yaml|json)>");

  return {
    spec,
    outDir: get("--out") ?? "agents",
    template: get("--template") ?? path.join("agents", "_templates", "agent.template.md"),
    schema: get("--schema") ?? path.join("schemas", "agent.schema.json")
  };
}

function readSpec(specPath: string): any {
  const raw = fs.readFileSync(specPath, "utf8");
  const ext = path.extname(specPath).toLowerCase();
  if (ext === ".yml" || ext === ".yaml") return YAML.parse(raw);
  if (ext === ".json") return JSON.parse(raw);
  throw new Error(`Unsupported spec extension: ${ext} (use .yml/.yaml/.json)`);
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

function normalize(spec: any): any {
  const s = { ...spec };

  // New format: name and description at top level
  if (!s.name) throw new Error("Missing required field: name");
  if (!s.description) s.description = "";

  // Metadata section (optional, used by tooling)
  if (!s._metadata) s._metadata = {};
  const meta = s._metadata;

  // Generate ID from name if not provided
  if (!meta.id) {
    meta.id = s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  // Set defaults
  if (!meta.role) meta.role = "worker";
  if (!meta.domain) meta.domain = "backend";
  if (!Array.isArray(meta.subdomains)) meta.subdomains = [];
  if (!Array.isArray(meta.intents)) meta.intents = [];
  if (!Array.isArray(meta.path_globs)) meta.path_globs = [];
  if (!Array.isArray(meta.keywords)) meta.keywords = [];

  // Output defaults
  if (!meta.output) meta.output = {};
  if (!meta.output.mode_default) meta.output.mode_default = "short+diff";
  if (typeof meta.output.max_bullets !== "number") meta.output.max_bullets = 7;
  if (!Array.isArray(meta.output.schema)) {
    meta.output.schema = ["Resumen", "Cambios", "Verificacion"];
  }
  if (!Array.isArray(meta.output.never_include)) {
    meta.output.never_include = ["theory", "full_files", "duplicate_code", "unbounded_lists", "verbose_explanations"];
  }

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
    loadSchema: undefined // Disable loading external schemas
  });
  // Remove $schema and $id to avoid external reference issues
  const cleanSchema = { ...schema };
  delete cleanSchema.$schema;
  delete cleanSchema.$id;
  
  const validate = ajv.compile(cleanSchema);
  const ok = validate(data);
  if (!ok) {
    const msg = ajv.errorsText(validate.errors, { separator: "\n" });
    throw new Error(`Agent spec does not match schema:\n${msg}`);
  }
}

export async function runCreate(argv: string[]) {
  const args = parseArgs(argv);

  if (!fs.existsSync(args.template)) {
    throw new Error(`Template not found: ${args.template}`);
  }
  if (!fs.existsSync(args.spec)) {
    throw new Error(`Spec file not found: ${args.spec}`);
  }
  if (!fs.existsSync(args.schema)) {
    throw new Error(`Schema file not found: ${args.schema}`);
  }

  const templateRaw = fs.readFileSync(args.template, "utf8");
  const specRaw = readSpec(args.spec);
  const spec = normalize(specRaw);

  // Validar automaticamente antes de crear
  validateAgainstSchema(args.schema, spec);
  console.log(`✓ Especificacion validada contra esquema`);

  ensureDir(args.outDir);

  // Build template variables for the new simplified format  
  const meta = spec._metadata;
  const intentsFormatted = (meta.intents || []).map((i: string) => `- ${i}`).join('\n');
  const subdomainsFormatted = (meta.subdomains || []).map((s: string) => `- ${s}`).join('\n');
  const pathGlobsFormatted = (meta.path_globs || []).map((p: string) => `- \`${p}\``).join('\n');
  const keywordsFormatted = (meta.keywords || []).map((k: string) => `- ${k}`).join('\n');
  const neverIncludeFormatted = (meta.output?.never_include || []).map((n: string) => `- ${n}`).join('\n');
  const schemaFormatted = (meta.output?.schema || []).map((s: string) => `### ${s}\n\n`).join('');

  // Simple string replacement for markdown template
  let rendered = templateRaw
    .replace(/\{\{name\}\}/g, spec.name)
    .replace(/\{\{description\}\}/g, spec.description)
    .replace(/\{\{_metadata\.id\}\}/g, meta.id || '')
    .replace(/\{\{_metadata\.domain\}\}/g, meta.domain || '')
    .replace(/\{\{_metadata\.role\}\}/g, meta.role || 'worker')
    .replace(/\{\{_metadata\.intents\}\}/g, (meta.intents || []).join(', '))
    .replace(/\{\{#each _metadata\.intents\}\}[\s\S]*?\{\{\/each\}\}/g, intentsFormatted)
    .replace(/\{\{#if _metadata\.subdomains\}\}[\s\S]*?\{\{\/if\}\}/g, 
      meta.subdomains?.length ? `### Subdomains\n\n${subdomainsFormatted}\n` : '')
    .replace(/\{\{#if _metadata\.path_globs\}\}[\s\S]*?\{\{\/if\}\}/g,
      meta.path_globs?.length ? `## Relevant Files\n\nThis agent primarily works with files matching:\n\n${pathGlobsFormatted}\n` : '')
    .replace(/\{\{#if _metadata\.keywords\}\}[\s\S]*?\{\{\/if\}\}/g,
      meta.keywords?.length ? `## Keywords\n\nLook for these keywords in requests:\n\n${keywordsFormatted}\n` : '')
    .replace(/\{\{#each _metadata\.output\.schema\}\}[\s\S]*?\{\{\/each\}\}/g, schemaFormatted)
    .replace(/\{\{#each _metadata\.output\.never_include\}\}[\s\S]*?\{\{\/each\}\}/g, neverIncludeFormatted)
    .replace(/\{\{_metadata\.output\.max_bullets\}\}/g, String(meta.output?.max_bullets || 7))
    .replace(/\{\{#if _metadata\.verification\}\}[\s\S]*?\{\{\/if\}\}/g,
      meta.verification ? '### Verification Steps\n\nAlways verify changes by:\n- Checking syntax and imports\n- Ensuring compatibility with existing code\n- Testing in relevant environment when possible\n' : '');

  const outPath = path.join(args.outDir, `${meta.id}.md`);
  if (fs.existsSync(outPath)) {
    throw new Error(`Agent already exists: ${outPath}`);
  }

  fs.writeFileSync(outPath, rendered, "utf8");

  // Store canonical normalized spec for tooling/debugging
  const specOutDir = path.join(args.outDir, "_spec");
  ensureDir(specOutDir);
  fs.writeFileSync(path.join(specOutDir, `${meta.id}.yml`), YAML.stringify(spec), "utf8");

  console.log(`✅ Agente creado: ${outPath}`);
  console.log(`🧾 Especificacion almacenada: ${path.join(specOutDir, `${meta.id}.yml`)}`);
}

// Entry point para CLI directo
if (import.meta.url === `file://${process.argv[1]}`) {
  runCreate(process.argv.slice(2)).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
