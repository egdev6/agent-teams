import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import type { AgentSpec } from '@agent-teams/core';
import {
  resolveOutputStructure,
  resolveWorkflow,
  SCHEMA_PATHS,
  TEMPLATE_PATHS,
} from '@agent-teams/core';
import { Ajv } from 'ajv';
import YAML from 'yaml';

type Args = {
  spec: string;
  outDir: string;
  templatePath: string;
  schemaPath: string;
};

const ROLE_OPTIONS = new Set(['worker', 'orchestrator', 'router']);
const PRIORITY_OPTIONS = new Set(['high', 'medium', 'low']);
const OUTPUT_TEMPLATE_OPTIONS = new Set([
  'diff',
  'code-review',
  'planning',
  'analysis',
  'step-by-step',
  'structured-qa',
  'summary',
  'routing-decision',
  'custom',
]);
const OUTPUT_EXTENDS_OPTIONS = new Set([
  'diff',
  'code-review',
  'planning',
  'analysis',
  'step-by-step',
  'structured-qa',
  'summary',
  'routing-decision',
]);
const OUTPUT_MODE_OPTIONS = new Set(['short', 'detailed']);
const CONTEXT_RETRIEVAL_MODE_OPTIONS = new Set(['semantic', 'glob', 'explicit']);
const TARGET_OPTIONS = new Set(['copilot', 'claude']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertAllowedKeys(section: string, obj: Record<string, unknown>, keys: string[]): void {
  const allowed = new Set(keys);
  const unknown = Object.keys(obj).filter((k) => !allowed.has(k));
  if (unknown.length > 0) {
    throw new Error(`${section} has unknown options: ${unknown.join(', ')}`);
  }
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
}

function assertStringArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array of strings`);
  }
  const invalidIndex = value.findIndex((entry) => typeof entry !== 'string');
  if (invalidIndex >= 0) {
    throw new Error(`${field}[${invalidIndex}] must be a string`);
  }
}

function validateTopLevel(raw: Record<string, unknown>): void {
  assertAllowedKeys('spec', raw, [
    'id',
    'name',
    'version',
    'role',
    'domain',
    'subdomain',
    'description',
    'expertise',
    'intents',
    'scope',
    'workflow',
    'tools',
    'skills',
    'permissions',
    'constraints',
    'handoffs',
    'output',
    'context_packs',
    'context_strategy',
    'targets',
    '_legacy',
  ]);
}

function validateScope(scope: unknown): void {
  if (!isRecord(scope)) throw new Error('scope must be an object');
  assertAllowedKeys('scope', scope, ['topics', 'path_globs', 'excludes']);

  if (scope.topics !== undefined) {
    assertStringArray(scope.topics, 'scope.topics');
  }
  if (scope.excludes !== undefined) {
    assertStringArray(scope.excludes, 'scope.excludes');
  }
  if (scope.path_globs !== undefined) {
    if (!Array.isArray(scope.path_globs)) {
      throw new Error('scope.path_globs must be an array');
    }
    scope.path_globs.forEach((entry, index) => {
      if (typeof entry === 'string') return;
      if (!isRecord(entry)) {
        throw new Error(`scope.path_globs[${index}] must be a string or object`);
      }
      assertAllowedKeys(`scope.path_globs[${index}]`, entry, ['pattern', 'priority']);
      assertString(entry.pattern, `scope.path_globs[${index}].pattern`);
      if (entry.priority !== undefined) {
        if (typeof entry.priority !== 'string' || !PRIORITY_OPTIONS.has(entry.priority)) {
          throw new Error(
            `scope.path_globs[${index}].priority must be one of: ${[...PRIORITY_OPTIONS].join(', ')}`,
          );
        }
      }
    });
  }
}

function validateTools(tools: unknown): void {
  if (!Array.isArray(tools)) throw new Error('tools must be an array');
  tools.forEach((entry, index) => {
    if (!isRecord(entry)) throw new Error(`tools[${index}] must be an object`);
    assertAllowedKeys(`tools[${index}]`, entry, ['name', 'when']);
    assertString(entry.name, `tools[${index}].name`);
    if (entry.when !== undefined) assertString(entry.when, `tools[${index}].when`);
  });
}

function validateSkills(skills: unknown): void {
  if (!Array.isArray(skills)) throw new Error('skills must be an array');
  skills.forEach((entry, index) => {
    if (!isRecord(entry)) throw new Error(`skills[${index}] must be an object`);
    assertAllowedKeys(`skills[${index}]`, entry, ['id', 'when']);
    assertString(entry.id, `skills[${index}].id`);
    if (!/^[a-z0-9-]+$/.test(entry.id)) {
      throw new Error(`skills[${index}].id must match ^[a-z0-9-]+$`);
    }
    if (entry.when !== undefined) assertString(entry.when, `skills[${index}].when`);
  });
}

function validatePermissions(permissions: unknown): void {
  if (!isRecord(permissions)) throw new Error('permissions must be an object');
  assertAllowedKeys('permissions', permissions, [
    'can_create_files',
    'can_edit_files',
    'can_delete_files',
    'can_run_commands',
    'can_delegate',
    'can_modify_public_api',
    'can_touch_global_config',
  ]);
  for (const [key, value] of Object.entries(permissions)) {
    if (typeof value !== 'boolean') {
      throw new Error(`permissions.${key} must be a boolean`);
    }
  }
}

function validateConstraints(constraints: unknown): void {
  if (!isRecord(constraints)) throw new Error('constraints must be an object');
  assertAllowedKeys('constraints', constraints, ['always', 'never', 'escalate']);
  if (constraints.always !== undefined) assertStringArray(constraints.always, 'constraints.always');
  if (constraints.never !== undefined) assertStringArray(constraints.never, 'constraints.never');
  if (constraints.escalate !== undefined) {
    assertStringArray(constraints.escalate, 'constraints.escalate');
  }
}

function validateHandoffs(handoffs: unknown): void {
  if (!isRecord(handoffs)) throw new Error('handoffs must be an object');
  assertAllowedKeys('handoffs', handoffs, ['receives_from', 'delegates_to', 'escalates_to']);
  if (handoffs.receives_from !== undefined) {
    assertStringArray(handoffs.receives_from, 'handoffs.receives_from');
  }
  if (handoffs.delegates_to !== undefined) {
    assertStringArray(handoffs.delegates_to, 'handoffs.delegates_to');
  }
  if (handoffs.escalates_to !== undefined) {
    assertStringArray(handoffs.escalates_to, 'handoffs.escalates_to');
  }
}

function validateOutputTemplate(template: unknown): void {
  if (typeof template !== 'string' || !OUTPUT_TEMPLATE_OPTIONS.has(template)) {
    throw new Error(`output.template must be one of: ${[...OUTPUT_TEMPLATE_OPTIONS].join(', ')}`);
  }
}

function validateOutputExtends(ext: unknown): void {
  if (typeof ext !== 'string' || !OUTPUT_EXTENDS_OPTIONS.has(ext)) {
    throw new Error(`output.extends must be one of: ${[...OUTPUT_EXTENDS_OPTIONS].join(', ')}`);
  }
}

function validateOutputMode(mode: unknown): void {
  if (typeof mode !== 'string' || !OUTPUT_MODE_OPTIONS.has(mode)) {
    throw new Error(`output.mode must be one of: ${[...OUTPUT_MODE_OPTIONS].join(', ')}`);
  }
}

function validateOutputMaxItems(maxItems: unknown): void {
  if (typeof maxItems !== 'number' || !Number.isInteger(maxItems) || maxItems < 1) {
    throw new Error('output.max_items must be an integer >= 1');
  }
}

function validateOutput(output: unknown): void {
  if (!isRecord(output)) throw new Error('output must be an object');
  assertAllowedKeys('output', output, [
    'template',
    'extends',
    'sections',
    'format_instructions',
    'mode',
    'max_items',
    'never_include',
  ]);

  if (output.template !== undefined) {
    validateOutputTemplate(output.template);
  }

  if (output.extends !== undefined) {
    validateOutputExtends(output.extends);
  }

  if (output.sections !== undefined) assertStringArray(output.sections, 'output.sections');
  if (output.format_instructions !== undefined) {
    assertString(output.format_instructions, 'output.format_instructions');
  }

  if (output.mode !== undefined) {
    validateOutputMode(output.mode);
  }

  if (output.max_items !== undefined) {
    validateOutputMaxItems(output.max_items);
  }

  if (output.never_include !== undefined) {
    assertStringArray(output.never_include, 'output.never_include');
  }
}

function validateContextStrategy(contextStrategy: unknown): void {
  if (!isRecord(contextStrategy)) throw new Error('context_strategy must be an object');
  assertAllowedKeys('context_strategy', contextStrategy, [
    'max_files',
    'max_chars_per_file',
    'retrieval_mode',
  ]);

  if (contextStrategy.max_files !== undefined) {
    const maxFiles = contextStrategy.max_files;
    if (typeof maxFiles !== 'number' || !Number.isInteger(maxFiles) || maxFiles < 1) {
      throw new Error('context_strategy.max_files must be an integer >= 1');
    }
  }
  if (contextStrategy.max_chars_per_file !== undefined) {
    const maxCharsPerFile = contextStrategy.max_chars_per_file;
    if (
      typeof maxCharsPerFile !== 'number' ||
      !Number.isInteger(maxCharsPerFile) ||
      maxCharsPerFile < 100
    ) {
      throw new Error('context_strategy.max_chars_per_file must be an integer >= 100');
    }
  }
  if (contextStrategy.retrieval_mode !== undefined) {
    if (
      typeof contextStrategy.retrieval_mode !== 'string' ||
      !CONTEXT_RETRIEVAL_MODE_OPTIONS.has(contextStrategy.retrieval_mode)
    ) {
      throw new Error(
        `context_strategy.retrieval_mode must be one of: ${[...CONTEXT_RETRIEVAL_MODE_OPTIONS].join(', ')}`,
      );
    }
  }
}

function validateIntents(intents: unknown): void {
  assertStringArray(intents, 'intents');
  const arr = intents as string[];
  arr.forEach((intent, index) => {
    if (!/^[a-z0-9_]+$/.test(intent)) {
      throw new Error(`intents[${index}] must match ^[a-z0-9_]+$`);
    }
  });
}

function validateContextPacks(contextPacks: unknown): void {
  assertStringArray(contextPacks, 'context_packs');
  const arr = contextPacks as string[];
  arr.forEach((pack, index) => {
    if (!/^[a-z0-9:_-]+$/.test(pack)) {
      throw new Error(`context_packs[${index}] must match ^[a-z0-9:_-]+$`);
    }
  });
}

function validateTargets(targets: unknown): void {
  if (!Array.isArray(targets)) {
    throw new Error('targets must be an array');
  }
  if (targets.length < 1) {
    throw new Error('targets must have at least 1 value');
  }
  const seen = new Set<string>();
  targets.forEach((target, index) => {
    if (typeof target !== 'string' || !TARGET_OPTIONS.has(target)) {
      throw new Error(`targets[${index}] must be one of: ${[...TARGET_OPTIONS].join(', ')}`);
    }
    if (seen.has(target)) {
      throw new Error(`targets has duplicated value: ${target}`);
    }
    seen.add(target);
  });
}

function validateId(id: unknown): void {
  if (id === undefined) return;
  assertString(id, 'id');
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error('id must match ^[a-z0-9-]+$');
  }
}

function validateVersion(version: unknown): void {
  if (version === undefined) return;
  assertString(version, 'version');
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)) {
    throw new Error('version must use semver format: x.y.z');
  }
}

function validateRequiredFields(raw: Record<string, unknown>): void {
  if (!raw.name || typeof raw.name !== 'string') throw new Error('Missing required field: name');
  if (!raw.description || typeof raw.description !== 'string') {
    throw new Error('Missing required field: description');
  }
  if (!raw.role || typeof raw.role !== 'string') throw new Error('Missing required field: role');
  if (!ROLE_OPTIONS.has(raw.role)) {
    throw new Error(`role must be one of: ${[...ROLE_OPTIONS].join(', ')}`);
  }
}

function validateOptionalFields(raw: Record<string, unknown>): void {
  validateId(raw.id);
  validateVersion(raw.version);
  if (raw.domain !== undefined) assertString(raw.domain, 'domain');
  if (raw.subdomain !== undefined) assertString(raw.subdomain, 'subdomain');
  if (raw.expertise !== undefined) assertStringArray(raw.expertise, 'expertise');
}

function validateComplexFields(raw: Record<string, unknown>): void {
  if (raw.intents !== undefined) validateIntents(raw.intents);
  if (raw.scope !== undefined) validateScope(raw.scope);
  if (raw.workflow !== undefined) assertStringArray(raw.workflow, 'workflow');
  if (raw.tools !== undefined) validateTools(raw.tools);
  if (raw.skills !== undefined) validateSkills(raw.skills);
  if (raw.permissions !== undefined) validatePermissions(raw.permissions);
  if (raw.constraints !== undefined) validateConstraints(raw.constraints);
  if (raw.handoffs !== undefined) validateHandoffs(raw.handoffs);
  if (raw.output !== undefined) validateOutput(raw.output);
  if (raw.context_packs !== undefined) validateContextPacks(raw.context_packs);
  if (raw.context_strategy !== undefined) validateContextStrategy(raw.context_strategy);
  if (raw.targets !== undefined) validateTargets(raw.targets);
}

function validateRawSpec(raw: unknown): void {
  if (!isRecord(raw)) throw new Error('Spec must be a YAML/JSON object at top-level');

  validateTopLevel(raw);
  validateRequiredFields(raw);
  validateOptionalFields(raw);
  validateComplexFields(raw);
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const spec = get('--spec');
  if (!spec) throw new Error('Missing --spec <path-to-agent-spec.yml>');
  return {
    spec,
    outDir: get('--out') ?? 'agents',
    templatePath: get('--template') ?? TEMPLATE_PATHS.agent,
    schemaPath: get('--schema') ?? SCHEMA_PATHS.agent,
  };
}

function readSpec(specPath: string): unknown {
  const raw = fs.readFileSync(specPath, 'utf8');
  const ext = path.extname(specPath).toLowerCase();
  if (ext === '.yml' || ext === '.yaml') return YAML.parse(raw);
  if (ext === '.json') return JSON.parse(raw);
  throw new Error(`Unsupported spec extension: ${ext}`);
}

function validateAgainstSchema(schemaPath: string, data: unknown): void {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const clean: Record<string, unknown> = { ...schema };
  delete clean.$schema;
  delete clean.$id;
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(clean);
  if (!validate(data)) {
    throw new Error(
      `Spec does not match schema:\n${ajv.errorsText(validate.errors, { separator: '\n' })}`,
    );
  }
}

function toId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function coerceRequiredString(s: Record<string, unknown>, field: string): string {
  const value = s[field];
  if (!value || typeof value !== 'string') throw new Error(`Missing required field: ${field}`);
  return value;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

function asToolsArray(value: unknown): AgentSpec['tools'] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === 'string') return { name: entry };
    if (isRecord(entry) && typeof entry.name === 'string') {
      return {
        name: entry.name,
        ...(typeof entry.when === 'string' ? { when: entry.when } : {}),
      };
    }
    return { name: '' };
  });
}

function asSkillsArray(value: unknown): AgentSpec['skills'] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === 'string') return { id: entry };
    if (isRecord(entry) && typeof entry.id === 'string') {
      return {
        id: entry.id,
        ...(typeof entry.when === 'string' ? { when: entry.when } : {}),
      };
    }
    return { id: '' };
  });
}

function asObjectOrEmpty<T>(value: unknown): T {
  return isRecord(value) ? (value as T) : ({} as T);
}

function asOutputOrDefault(value: unknown): AgentSpec['output'] {
  return isRecord(value) ? (value as AgentSpec['output']) : { template: 'diff', mode: 'short' };
}

function normalizeSpec(raw: unknown): AgentSpec {
  const s = raw as Record<string, unknown>;
  const name = coerceRequiredString(s, 'name');
  const description = coerceRequiredString(s, 'description');
  const role = coerceRequiredString(s, 'role');

  return {
    id: typeof s.id === 'string' ? s.id : toId(name),
    name,
    version: typeof s.version === 'string' ? s.version : '1.0.0',
    role: role as AgentSpec['role'],
    domain: typeof s.domain === 'string' ? s.domain : 'general',
    subdomain: typeof s.subdomain === 'string' ? s.subdomain : undefined,
    description,
    expertise: asStringArray(s.expertise),
    intents: asStringArray(s.intents),
    scope: asObjectOrEmpty<AgentSpec['scope']>(s.scope),
    workflow: asStringArray(s.workflow),
    tools: asToolsArray(s.tools),
    skills: asSkillsArray(s.skills),
    permissions: asObjectOrEmpty<AgentSpec['permissions']>(s.permissions),
    constraints: asObjectOrEmpty<AgentSpec['constraints']>(s.constraints),
    handoffs: asObjectOrEmpty<AgentSpec['handoffs']>(s.handoffs),
    output: asOutputOrDefault(s.output),
    context_packs: asStringArray(s.context_packs),
    targets:
      asStringArray(s.targets).length > 0
        ? (s.targets as AgentSpec['targets'])
        : ['copilot', 'claude'],
  };
}

const permIcon = (v?: boolean) => (v ? '✅' : '❌');

function buildSections(
  expertise: string[],
  intents: string[],
  scopeGlobs: string[],
  scope: AgentSpec['scope'],
  tools: AgentSpec['tools'],
  skills: AgentSpec['skills'],
  constraints: AgentSpec['constraints'],
  handoffs: AgentSpec['handoffs'],
  spec: AgentSpec,
  out: AgentSpec['output'],
): Record<string, boolean> {
  return {
    expertise: expertise.length > 0,
    intents: intents.length > 0,
    scope_topics: (scope?.topics ?? []).length > 0,
    scope_globs: scopeGlobs.length > 0,
    scope_excludes: (scope?.excludes ?? []).length > 0,
    tools: (tools && tools.length > 0) ?? false,
    skills: (skills && skills.length > 0) ?? false,
    constraints_always: (constraints?.always ?? []).length > 0,
    constraints_never: (constraints?.never ?? []).length > 0,
    constraints_escalate: (constraints?.escalate ?? []).length > 0,
    receives_from: (handoffs?.receives_from ?? []).length > 0,
    delegates_to: (handoffs?.delegates_to ?? []).length > 0,
    escalates_to: (handoffs?.escalates_to ?? []).length > 0,
    subdomain: !!spec.subdomain,
    domain: !!spec.domain,
    output_mode: !!out?.mode,
  };
}

function buildValues(
  spec: AgentSpec,
  expertise: string[],
  intents: string[],
  tools: AgentSpec['tools'],
  skills: AgentSpec['skills'],
  scope: AgentSpec['scope'],
  scopeGlobs: string[],
  constraints: AgentSpec['constraints'],
  handoffs: AgentSpec['handoffs'],
  perms: AgentSpec['permissions'],
  out: AgentSpec['output'],
  workflowSteps: string,
  outputStructure: string,
): Record<string, string> {
  return {
    id: spec.id,
    name: spec.name,
    role: spec.role,
    domain: spec.domain ?? 'general',
    subdomain: spec.subdomain ?? '',
    version: spec.version ?? '1.0.0',
    description: spec.description,
    expertise_inline: expertise.join(', '),
    intents_inline: intents.map((i) => `\`${i}\``).join(' '),
    scope_topics_list: (scope?.topics ?? []).map((t) => `- ${t}`).join('\n'),
    scope_globs_list: scopeGlobs.join('\n'),
    scope_excludes_list: (scope?.excludes ?? []).map((e) => `- \`${e}\``).join('\n'),
    workflow_steps: workflowSteps,
    tools_rows: tools?.map((t) => `| \`${t.name}\` | ${t.when ?? '—'} |`).join('\n') ?? '',
    skills_rows: skills?.map((s) => `| \`${s.id}\` | ${s.when ?? '—'} |`).join('\n') ?? '',
    perm_create_files: permIcon(perms?.can_create_files),
    perm_edit_files: permIcon(perms?.can_edit_files),
    perm_delete_files: permIcon(perms?.can_delete_files),
    perm_run_commands: permIcon(perms?.can_run_commands),
    perm_delegate: permIcon(perms?.can_delegate),
    perm_modify_public_api: permIcon(perms?.can_modify_public_api),
    perm_touch_global_config: permIcon(perms?.can_touch_global_config),
    constraints_always_list: (constraints?.always ?? []).map((c) => `- ${c}`).join('\n'),
    constraints_never_list: (constraints?.never ?? []).map((c) => `- ${c}`).join('\n'),
    constraints_escalate_list: (constraints?.escalate ?? []).map((c) => `- ${c}`).join('\n'),
    receives_from_inline: (handoffs?.receives_from ?? []).map((a) => `\`${a}\``).join(', '),
    delegates_to_inline: (handoffs?.delegates_to ?? []).map((a) => `\`${a}\``).join(', '),
    escalates_to_inline: (handoffs?.escalates_to ?? []).map((a) => `\`${a}\``).join(', '),
    output_template: out?.template ?? 'diff',
    output_mode: out?.mode ?? '',
    output_structure: outputStructure,
  };
}

function renderTemplate(templateRaw: string, spec: AgentSpec): string {
  const workflow = resolveWorkflow(spec.role, spec.workflow);
  const workflowSteps = workflow.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const expertise = spec.expertise ?? [];
  const intents = spec.intents ?? [];
  const tools = spec.tools ?? [];
  const skills = spec.skills ?? [];
  const perms = spec.permissions ?? {};
  const constraints = spec.constraints ?? {};
  const handoffs = spec.handoffs ?? {};
  const scope = spec.scope ?? {};
  const out = spec.output ?? {};

  const scopeGlobs = (scope.path_globs ?? []).map((g) => {
    if (typeof g === 'string') return `- \`${g}\``;
    const pri = g.priority ? ` *(${g.priority} priority)*` : '';
    return `- \`${g.pattern}\`${pri}`;
  });

  const outputStructure = resolveOutputStructure({
    template: out.template ?? 'diff',
    extends: out.extends,
    sections: out.sections,
    format_instructions: out.format_instructions,
  });

  const sections = buildSections(
    expertise,
    intents,
    scopeGlobs,
    scope,
    tools,
    skills,
    constraints,
    handoffs,
    spec,
    out,
  );
  const values = buildValues(
    spec,
    expertise,
    intents,
    tools,
    skills,
    scope,
    scopeGlobs,
    constraints,
    handoffs,
    perms,
    out,
    workflowSteps,
    outputStructure,
  );

  let content = templateRaw;
  for (const [flag, show] of Object.entries(sections)) {
    const re = new RegExp(`\\{\\{#${flag}\\}\\}([\\s\\S]*?)\\{\\{/${flag}\\}\\}`, 'g');
    content = content.replace(re, show ? '$1' : '');
  }
  for (const [key, val] of Object.entries(values)) {
    content = content.replaceAll(`{{${key}}}`, val);
  }
  return content;
}

export async function runCreate(argv: string[]) {
  const args = parseArgs(argv);

  if (!fs.existsSync(args.templatePath)) {
    throw new Error(`Template not found: ${args.templatePath}`);
  }
  if (!fs.existsSync(args.spec)) {
    throw new Error(`Spec file not found: ${args.spec}`);
  }

  const raw = readSpec(args.spec);
  validateRawSpec(raw);
  const spec = normalizeSpec(raw);

  validateAgainstSchema(args.schemaPath, spec);
  console.log('✓ Spec validated against schema');

  fs.mkdirSync(args.outDir, { recursive: true });

  const templateRaw = fs.readFileSync(args.templatePath, 'utf8');
  const rendered = renderTemplate(templateRaw, spec);

  const outPath = path.join(args.outDir, `${spec.id}.md`);
  if (fs.existsSync(outPath)) {
    throw new Error(`Agent already exists: ${outPath}`);
  }
  fs.writeFileSync(outPath, rendered, 'utf8');

  // Also save normalised spec for tooling
  const specOutDir = path.join(args.outDir, '_spec');
  fs.mkdirSync(specOutDir, { recursive: true });
  fs.writeFileSync(path.join(specOutDir, `${spec.id}.yml`), YAML.stringify(spec), 'utf8');

  console.log(`✅ Agent created: ${outPath}`);
  console.log(`🧾 Spec stored: ${path.join(specOutDir, `${spec.id}.yml`)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCreate(process.argv.slice(2)).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
