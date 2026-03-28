/**
 * Predefined output templates for agents.
 *
 * A template defines how the agent structures every response.
 * The `structure` string is rendered verbatim into the Output section of the
 * generated agent MD so the LLM has a literal example to follow.
 */
import type { OutputTemplateId } from './types';

export type { OutputTemplateId };

export interface OutputTemplate {
  id: OutputTemplateId;
  name: string;
  description: string;
  /** Literal format example rendered into the MD Output section */
  structure: string;
}

export const OUTPUT_TEMPLATES: Record<OutputTemplateId, OutputTemplate> = {
  diff: {
    id: 'diff',
    name: 'Minimal diff',
    description: 'Only the changed code with a one-line justification per change.',
    structure: `\`<file path>\` — <what changed and why>
\`\`\`diff
- old line
+ new line
\`\`\``,
  },

  'code-review': {
    id: 'code-review',
    name: 'Code review',
    description: 'Structured findings grouped by severity.',
    structure: `### Critical
- \`<file>:<line>\` — <issue> → <recommendation>

### Suggestions
- \`<file>:<line>\` — <issue> → <recommendation>

### Positives
- <what is done well>`,
  },

  planning: {
    id: 'planning',
    name: 'Implementation plan',
    description: 'Step-by-step plan with dependencies, risks, and done criteria.',
    structure: `**Context:** <one sentence>

**Steps:**
1. <step> *(depends on: —)*
2. <step> *(depends on: step 1)*

**Risks:** <risk and mitigation>

**Done when:** <acceptance criteria>`,
  },

  analysis: {
    id: 'analysis',
    name: 'Technical analysis',
    description: 'Summary, key findings, implications, and recommendations.',
    structure: `**Summary:** <one sentence>

**Findings:**
- <finding>

**Implications:**
- <implication>

**Recommendations:**
- <recommendation>`,
  },

  'step-by-step': {
    id: 'step-by-step',
    name: 'Step-by-step guide',
    description: 'Numbered, imperative, verifiable steps.',
    structure: `1. <do this> — verify: <how to confirm it worked>
2. <do this> — verify: <how to confirm it worked>`,
  },

  'structured-qa': {
    id: 'structured-qa',
    name: 'Structured Q&A',
    description: 'Direct question → answer, no narrative prose.',
    structure: `**Q: <question>**
A: <direct answer>

**Q: <question>**
A: <direct answer>`,
  },

  summary: {
    id: 'summary',
    name: 'Executive summary',
    description: 'TL;DR, key points, and a suggested next action.',
    structure: `**TL;DR:** <one sentence>

**Key points:**
- <point>

**Suggested action:** <concrete next step>`,
  },

  'routing-decision': {
    id: 'routing-decision',
    name: 'Routing decision',
    description: 'Documents the routing outcome for transparency.',
    structure: `**Request received:** <intent identified>
**Assigned to:** \`<agent-id>\`
**Reason:** <why this agent>
**Context forwarded:** <what was passed>`,
  },

  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Free-form format defined in format_instructions.',
    structure: '',
  },
};

/**
 * Return the structure string for a given template.
 */
export function resolveOutputStructure(output: {
  template: OutputTemplateId;
  format_instructions?: string;
}): string {
  if (output.template === 'custom' && output.format_instructions) {
    return output.format_instructions;
  }

  const base = OUTPUT_TEMPLATES[output.template] ?? OUTPUT_TEMPLATES.diff;
  return base.structure;
}
