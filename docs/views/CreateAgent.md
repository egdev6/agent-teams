# Create Agent

## ¿Qué es esta vista?

La vista **Create Agent** crea un spec de agente mediante un wizard adaptativo por rol.

Permite:

- capturar identidad (`name`, `description`, `role`),
- configurar metadata técnica (`domain`, `intents`, `path_globs`, `keywords`, `skills`, `delegation`, `output`, `context`),
- previsualizar el agente en tiempo real,
- y enviar `createAgent` al host.

## Arquitectura actual

- `CreateAgentPage.tsx`
  - layout principal (wizard + preview + acciones).
- `useCreateAgentLogic.ts`
  - estado, reglas por rol, navegación de pasos y envío.
- `agent-wizard/AgentWizardCard.tsx`
  - UI de pasos y campos.
- `agent-wizard/payload.ts`
  - normalización del formulario a payload de mensaje.
- `CreateAgentPreviewCard.tsx`
  - preview tipo `AgentCard`.
- `CreateAgentActions.tsx`
  - botón Create, Discard y manejo de `createError`.

## Wizard por rol

Todos los flujos comparten inicio:

1. `Name`
2. `Description`
3. `Role`

Desde `Role`, los pasos cambian.

### Router wizard (6 pasos)

1. `Name`
2. `Description`
3. `Role`
4. `Domain`
5. `Intents`
6. `Keywords`

Reglas fijas:

- `domain = global`
- `skills = ['search_codebase']`
- `output.mode_default = short+diff`
- `context.max_files = 8`
- `context.max_chars_per_file = 8000`
- `delegation.strategy = router_split`
- `delegation.max_handoffs = 1`
- `delegation.allowed_subagents = all`

### Orchestrator wizard (9 pasos)

1. `Name`
2. `Description`
3. `Role`
4. `Domain`
5. `Subdomains`
6. `Intents`
7. `Path Globs`
8. `Keywords`
9. `Delegation`

Reglas:

- `skills = []`
- `output.mode_default = short+diff`
- `context = 8 / 8000`
- `delegation.strategy = router_split`
- `max_handoffs` editable (1-3)
- `allowed_subagents` editable (`all` o lista)

### Worker wizard (10 pasos)

1. `Name`
2. `Description`
3. `Role`
4. `Domain`
5. `Subdomains`
6. `Intents`
7. `Path Globs`
8. `Keywords`
9. `Skills`
10. `Advanced`

`Advanced` incluye:

- `output.mode_default` (`short+diff`, `diff`, `plan`, `structured`)
- `context.max_files` (1-64)
- `context.max_chars_per_file` (500-40000)
- delegación opcional (`disabled`, o `agent_handoff/router_split` con límites 1-2)

## Campos del wizard

- `name`:
  - requerido para habilitar Create.
- `description`:
  - opcional.
- `role`:
  - requerido (`worker`, `router`, `orchestrator`).
- `domain`:
  - dominio funcional.
- `subdomains`:
  - texto multi-línea/coma, se normaliza a `string[]`.
- `intents`:
  - texto multi-línea/coma, se normaliza a `string[]`.
- `pathGlobs`:
  - texto multi-línea/coma, se normaliza a `string[]`.
- `keywords`:
  - texto multi-línea/coma, se normaliza a `string[]`.
- `skills`:
  - chips seleccionables + entrada libre, sin duplicados.
- `output.modeDefault`:
  - control de formato de respuesta.
- `context.maxFiles`, `context.maxCharsPerFile`:
  - límites de contexto.
- `delegation.strategy`, `delegation.maxHandoffs`, `delegation.allowedSubagents`:
  - política de delegación.

## Mensajería host <-> webview

### Webview -> Extension

- `createAgent` con payload expandido:
  - `name`, `description`, `role`
  - `domain`, `subdomains`, `intents`, `pathGlobs`, `keywords`
  - `skills`
  - `output.modeDefault`
  - `context.maxFiles`, `context.maxCharsPerFile`
  - `delegation.strategy`, `delegation.maxHandoffs`, `delegation.allowedSubagents`

### Extension -> Webview

- `createAgentResult`

## Resultado del flujo

1. Usuario confirma Create.
2. `useCreateAgentLogic` construye payload normalizado por rol.
3. Se envía `createAgent`.
4. Si `success = true`, navegación a `/`.
5. Si `success = false`, se muestra `createError`.
