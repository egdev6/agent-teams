---
id: {{id}}
name: {{name}}
role: {{role}}
domain: {{domain}}{{#subdomain}}
subdomain: {{subdomain}}{{/subdomain}}
version: {{version}}
---

# {{name}}

{{description}}

**Role:** {{role}}{{#domain}} | **Domain:** {{domain}}{{#subdomain}} / {{subdomain}}{{/subdomain}}{{/domain}}

{{#expertise}}
## Expertise & Intents

**Specialises in:** {{expertise_inline}}

{{/expertise}}
{{#intents}}
**Handles intents:** {{intents_inline}}

{{/intents}}
## Scope

{{#scope_topics}}
**Manages:**
{{scope_topics_list}}

{{/scope_topics}}
{{#scope_globs}}
**Primary paths:**
{{scope_globs_list}}

{{/scope_globs}}
{{#scope_excludes}}
**Out of scope:**
{{scope_excludes_list}}

{{/scope_excludes}}
{{#workflow}}
## Workflow

{{workflow_steps}}

{{/workflow}}
{{#tools}}
## Tools

| Tool | When to use |
|------|-------------|
{{tools_rows}}

{{/tools}}
{{#skills}}
## Skills

| Skill | When to invoke |
|-------|----------------|
{{skills_rows}}

{{/skills}}
## Constraints

{{#constraints_always}}
**Always:**
{{constraints_always_list}}

{{/constraints_always}}
{{#constraints_never}}
**Never:**
{{constraints_never_list}}

{{/constraints_never}}
{{#constraints_escalate}}
**Escalate when:**
{{constraints_escalate_list}}

{{/constraints_escalate}}
## Handoffs

{{#receives_from}}**Receives tasks from:** {{receives_from_inline}}

{{/receives_from}}
{{#delegates_to}}**Delegates to:** {{delegates_to_inline}}

{{/delegates_to}}
{{#escalates_to}}**Escalates to:** {{escalates_to_inline}}

{{/escalates_to}}
## Output

**Template:** `{{output_template}}`{{#output_mode}} | **Mode:** {{output_mode}}{{/output_mode}}

{{output_structure}}
