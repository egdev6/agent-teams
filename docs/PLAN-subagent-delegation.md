# Plan: Copilot Sub-Agent Delegation & Multi-Target Engram Integration

> **Estado**: Fase 4 implementada ✅, runtime portable validado ✅, prueba end-to-end diferida a release  
> **Última actualización**: 2026-03-13

## TL;DR

Implementar el patrón **Router(chat) → Orchestrator(nuevo chat) → Workers(sub-agentes)** para Copilot, usando Engram como bus de comunicación inter-sesión, y adaptar la generación de agentes para Claude con instrucciones de sub-tareas vía Engram. La extensión actúa como coordinador background (fan-out/fan-in).

## Contexto del problema

### Limitación de Copilot
- Los sub-agentes en Copilot (`.agent.md` referenciados como `tools` en frontmatter) **no pueden anidar**: un sub-agente no puede invocar otro sub-agente.
- Esto impide la cadena `Router → Orchestrator → Worker` si todos son sub-agentes.

### Solución propuesta
Aplanar la jerarquía de 3 niveles a 2 para Copilot:

```
YAML (3 niveles)                 Copilot generado (2 niveles)
─────────────────                ──────────────────────────────
Router (chat principal)     →    Router (chat A)
  └─ Orchestrator                  ├─ escribe assessment en Engram
       ├─ Worker A                 └─ abre nuevo chat B con Orchestrator
       └─ Worker B
                                 Orchestrator (chat B, proceso principal)
                                   ├─ Worker A (sub-agente, tools en frontmatter)
                                   └─ Worker B (sub-agente, tools en frontmatter)
```

- **Router** vive en el chat del usuario, analiza y escribe valoración en Engram, luego hace handoff a un nuevo chat.
- **Orchestrator** es el proceso principal del nuevo chat, con workers como sub-agentes (tools en frontmatter).
- **Workers** son sub-agentes con contexto aislado.
- **Engram** actúa como bus de comunicación entre sesiones de chat.

### Paralelización (fan-out / fan-in)
El Router puede despachar a múltiples Orchestrators en paralelo (ej: frontend + backend), cada uno en su propio chat. La extensión monitorea Engram para detectar cuando todas las sub-tareas completan y abre un chat Aggregator.

```
Router (Chat A):
  → analiza tarea: "crear feature de pagos"
  → divide: frontend + backend
  → escribe assessments en Engram
  → abre Chat B (frontend-orchestrator) + Chat C (backend-orchestrator)

Extension (background):
  → observa Engram para resultados
  → cuando ambos completan → abre Chat D (Aggregator)

Aggregator (Chat D):
  → lee resultados parciales de Engram
  → detecta conflictos
  → genera resultado unificado
```

---

## Viabilidad

| Aspecto | Viable | Nota |
|---------|--------|------|
| Tools en frontmatter Copilot | **Sí** | ✅ Implementado en Fase 1 |
| LanguageModelTool para handoff | **Sí** | `vscode.lm.registerTool()` disponible |
| Abrir nuevo chat con agente | **Sí** | ✅ Confirmado — `workbench.action.chat.open` con `{ query }` auto-ejecuta. `isPartialQuery: true` disponible para modo supervisado |
| Engram como bus inter-sesión | **Sí** | Ya configurado como MCP server, solo instruccional hoy |
| MCP tool portable (Claude) | **Sí** | Nuevo MCP server propio |
| Coordinación paralela (fan-out) | **Sí** | Extensión como observer de Engram |

**Mayor riesgo técnico**: la API de VS Code para abrir un chat apuntando a un agente específico. El Spike 0 confirma esto.

---

## Decisiones tomadas

| Decisión | Detalle |
|----------|---------|
| Aplanamiento 3→2 para Copilot | Router abre nuevo chat, Orchestrator usa workers como sub-agentes. YAML mantiene 3 niveles. |
| Engram obligatorio | Sin Engram configurado → bloquear generación de tools/handoff (no degradación graceful) |
| Dual tool | LanguageModelTool (Copilot-nativo) + MCP (portable para Claude) |
| Coordinación en extensión | TaskCoordinator vive en background en la extensión, no en los agentes |
| Formato Engram | JSON para estado/metadata de coordinación, Markdown para assessments/resultados (consumidos por LLMs) |
| Spike primero | Confirmar API de chat targeting antes de Fase 2 |
| CompleteSubtaskTool como LM Tool | Fan-in no depende del MCP server — funciona en Extension Development Host sin instalar `.vsix` |
| Engram result persistence instruccional | Orchestrators escriben `task:{id}:result` (handoff) o `task:{id}:subtask:{agentId}:result` (paralelo) — sin tool adicional |
| `isPartialQuery: false` en aggregator | Abre chat nuevo y auto-ejecuta — mismo comportamiento que fan-out |

---

## Spike 0: Confirmar Chat Targeting API

> **Estado**: ✅ Completado — Camino A confirmado (2026-03-12)

**Objetivo**: confirmar que `workbench.action.chat.open` acepta `{ query: '@agent-name prompt' }` para abrir chat con agente específico.

### Implementación (ya hecha)
- Comando `agent-teams.spikeChat` en `packages/extension/src/extension.ts`
- Registrado en `packages/extension/package.json` como "Agent Teams: [Spike] Test Chat Targeting API"

### Cómo probar
1. `F5` → Launch Extension Development Host
2. Command Palette → "Agent Teams: [Spike] Test Chat Targeting API"
3. Observar: ¿se abre chat con `@router` y el mensaje? ¿se auto-ejecuta o solo rellena?

### Evaluación de resultados

| Resultado | Siguiente paso |
|-----------|---------------|
| Query se pre-rellena Y se auto-ejecuta | ✅ Camino A — implementar directamente |
| Query se pre-rellena pero NO se ejecuta | Investigar flag `submit: true` o `autoSend` |
| Query no acepta parámetros | Probar `workbench.action.chat.newChat` + `workbench.action.chat.sendMessage` |
| Nada funciona programáticamente | Camino C — `stream.button()` en respuesta del router (semi-automático) |

### Resultado (2026-03-12)

- **Camino A confirmado**: `workbench.action.chat.open({ query: '@router ...' })` abre el chat, rellena el query y lo auto-ejecuta.
- **Modo supervisado disponible**: `isPartialQuery: true` rellena sin ejecutar — el usuario puede elegir modelo, editar el prompt y enviar manualmente.
- **Decisión para Fase 2**: el `HandoffTool` expondrá ambos modos. Por defecto usará `isPartialQuery: true` (supervisado) para dar control al usuario.

---

## Fase 1: Tools en Frontmatter de Copilot

> **Estado**: ✅ Completada

### Cambios realizados

#### 1. `mdFrontmatter()` — Tools en frontmatter
**Archivo**: `packages/extension/src/teamManager.ts`

Cuando target es `copilot`:
- Si Engram está configurado: inyecta `handoffs.delegates_to` como `tools:` en frontmatter YAML
- Siempre: incluye `agent.tools` regulares (codebase, fetch, etc.)

Ejemplo de output:
```yaml
---
name: Backend Orchestrator
description: Coordinates backend tasks
tools:
  - api-worker
  - db-worker
  - codebase
---
```

#### 2. `validateDelegateReferences()` — Validación en sync
**Archivo**: `packages/extension/src/teamManager.ts`

Durante sync, emite warning si un `delegates_to` referencia un agente que no existe o no tiene target `copilot`.

#### 3. `mdCopilotDelegateInstructions()` — Handoffs enriquecidos
**Archivo**: `packages/extension/src/teamManager.ts`

Cuando target es `copilot` + Engram, la sección `## Handoffs` genera instrucciones explícitas de invocación de sub-agentes:
```markdown
**Delegates to (sub-agents):**

- `api-worker` — invoke as a tool to delegate a sub-task. The sub-agent runs with its own context window. Provide all necessary context in the tool invocation; do not assume shared state.
```

#### 4. Refactoring de `mdHandoffsAndOutput()`
Dividido en `mdHandoffs()`, `mdOutput()` y `mdCopilotDelegateInstructions()` para cumplir el límite de complejidad ciclomática (max: 15).

---

## Fase 2: Handoff Tool (LanguageModelTool + MCP)

> **Estado**: ✅ Completada

**Objetivo**: Registrar una herramienta `agent-teams-handoff` que el Router pueda usar para transferir una tarea a un Orchestrator en un nuevo chat, con contexto vía Engram.

### Pasos

| # | Paso | Depende de | Archivo(s) |
|---|------|-----------|------------|
| 4 | Crear `HandoffTool` implementando `vscode.LanguageModelTool` | Fase 1 | `packages/extension/src/tools/HandoffTool.ts` (nuevo) |
| 5 | Registrar tool en extensión + `package.json` | Paso 4 | `packages/extension/src/extension.ts`, `packages/extension/package.json` |
| 6 | Crear MCP server equivalente con `dispatch_task` | Paralelo | `packages/cli/src/mcp/` (nuevo) |
| 7 | Inyectar `agent-teams-handoff` en frontmatter de Routers | Paso 5 | `packages/extension/src/teamManager.ts` |
| 8 | Actualizar `buildMemorySection()` con instrucciones handoff | Paso 4 | `packages/extension/src/memoryInstructions.ts` |

### Detalle del HandoffTool

```typescript
// packages/extension/src/tools/HandoffTool.ts
interface HandoffInput {
  targetAgentId: string;  // ID del orchestrator destino
  assessment: string;     // Valoración del router
  context: Record<string, unknown>; // Contexto adicional
}

// Acción:
// 1. Escribe assessment en Engram con key `handoff:{taskId}`
// 2. Abre nuevo chat con `@{targetAgentId}` + referencia al task
// 3. Retorna confirmación
```

### Instrucciones de memoria actualizadas

**Router** (nuevo):
```
After routing, write assessment to Engram with `engram_remember` using key `handoff:{taskId}`.
Then invoke the `agent-teams-handoff` tool to transfer the task.
```

**Orchestrator** (nuevo):
```
At session start, recall `handoff:*` from Engram for pending task context.
Use this assessment as the basis for task decomposition.
```

### Verificación
1. `@router` en Copilot Chat con una tarea → router usa handoff tool
2. Se abre nuevo chat con orchestrator correcto
3. Orchestrator lee assessment desde Engram
4. MCP tool `dispatch_task` funciona desde Claude Code

---

## Spike 1: Verificación pre-Fase 3

> **Estado**: 🔄 En progreso — Spike 1B ✅ completo · Spike 1A ✅ completo (2026-03-12)

Confirmar dos supuestos críticos de los que depende el diseño de fan-out.

---

### Spike 1A — LM Tool invocable desde agente `.agent.md`

**Hipótesis**: un agente Copilot con `agent-teams-handoff` en su frontmatter `tools:` puede invocar ese `LanguageModelTool` durante una conversación.

**Precondiciones**:
- Extensión instalada / `F5` activo
- Engram configurado en `.vscode/mcp.json` del workspace de prueba
- Un team synced con al menos un agente `role: router` y `delegates_to` apuntando a un orchestrator

#### Pasos

**Setup (una vez)**

- [x] S1. `F5` → Launch Extension Development Host
- [x] S2. Workspace de prueba: verificar que `.vscode/mcp.json` tiene la entrada `engram`
- [x] S3. Correr `agent-teams team:sync --team <id>` o comando `Agent Teams: Sync Team` desde la paleta
- [x] S4. Abrir el `.agent.md` del router generado (ej. `.github/agents/router.agent.md`) y confirmar que contiene:
  ```yaml
  tools:
    - agent-teams-handoff
    - <orchestrator-id>
    - codebase  # u otros tools declarados
  ```
  **✅ PASA** — `agent-teams-handoff` aparece correctamente en el frontmatter. La advertencia "Unknown tool" en el editor principal es el linter estático de VS Code (no sabe de tools de extensiones en desarrollo); en el Extension Development Host el tool está registrado y disponible.

**Invocación en chat**

- [x] S5. Abrir Copilot Chat → `@router analiza esta tarea: crear un endpoint REST para listar usuarios`
- [x] S6. Observar si el modelo propone invocar `agent-teams-handoff` como tool call
  **✅ PASA** — el router invoca al orchestrator como sub-agente tool call. El orchestrator a su vez invoca al worker como sub-agente anidado. La cadena de 3 niveles (router → orchestrator → worker) funciona sin `agent-teams-handoff`. Confirmado con `@router` → `frontend` → `component-creator` → 4 archivos creados.
  **Nota**: la jerarquía directa sub-agente a sub-agente funciona en Copilot sin necesidad de abrir nuevo chat. `agent-teams-handoff` sigue siendo necesario para el patrón fan-out (múltiples orchestrators en paralelo).

- [x] S7. Si el tool se invoca: confirmar que se abre un nuevo chat pre-filled con `@<orchestrator-id> [Handoff:task-xxxxx] …`
  **N/A para jerarquía directa** — el sub-agente anidado no necesita nuevo chat. Para fan-out paralelo sigue pendiente.

#### Tabla de resultados

| Resultado | Consecuencia para Fase 3 |
|-----------|--------------------------|
| S4 ✅ + S6 ✅ + S7 ✅ | Fase 3 sin cambios, continuar |
| S6 ❌ (A) — model ignora tool | Agregar instrucción explícita de handoff en `buildMemorySection(router)` antes de Fase 3 |
| S6 ❌ (B) — error en invocación | Fix en `HandoffTool.invoke()` antes de Fase 3 |
| S7 ❌ — no abre chat | Investigar `workbench.action.chat.open` API en ExtDevHost; posible fallback a `stream.button()` |

> **Resultado (2026-03-12)**: S4 ✅ + S6 ✅. Cadena 3 niveles confirmada: router → orchestrator (sub-agente) → worker (sub-agente anidado). Instrucciones imperativas en `mdCopilotDelegateInstructions` fueron clave. Fan-out paralelo (S7 con nuevo chat) sigue siendo el objetivo de Fase 3.

---

### Spike 1B — MCP `dispatch_task` crea registro y es legible

**Hipótesis**: el servidor MCP stdio funciona con el protocolo JSON-RPC 2.0 estándar y escribe el registro de coordinación correctamente.

**Precondiciones**:
- CLI buildeado: `pnpm --filter @agent-teams/cli build`
- Workspace con directorio `.agent-teams/` (o se crea automáticamente)

#### Pasos

- [x] B1. Build del CLI si no está al día:
  ```powershell
  pnpm --filter @agent-teams/cli build
  ```
  **✅ PASA** — `tsc --build --force` sin errores. `dist/mcp/dispatch-server.js` generado.

- [x] B2. Probar handshake initialize:
  ```powershell
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | node packages/cli/dist/mcp/dispatch-server.js
  ```
  **✅ PASA** — respuesta exacta: `{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"agent-teams-mcp","version":"1.0.0"}}}`

- [x] B3. Probar `tools/list`:
  ```powershell
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node packages/cli/dist/mcp/dispatch-server.js
  ```
  **✅ PASA** — responde con `dispatch_task` en el array `tools` con schema completo.

- [x] B4. Probar `tools/call` con `dispatch_task`:
  ```powershell
  echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"dispatch_task","arguments":{"agentId":"backend-orchestrator","taskId":"task-17417880","description":"Implement REST endpoint for user listing"}}}' | node packages/cli/dist/mcp/dispatch-server.js
  ```
  **✅ PASA** — responde con texto de confirmación y crea `.agent-teams/coordination/task-17417880-backend-orchestrator.json`

- [x] B5. Verificar el JSON creado:
  ```powershell
  Get-Content .agent-teams/coordination/task-17417880-backend-orchestrator.json
  ```
  **✅ PASA** — contiene todos los campos requeridos: `taskId`, `agentId`, `status: "pending"`, `engramKey: "task:task-17417880:subtask:backend-orchestrator"`, `dispatchedAt`.

#### Tabla de resultados

| Resultado | Consecuencia para Fase 3 |
|-----------|--------------------------|
| B2-B5 todos ✅ | `TaskCoordinator` puede usar file-watching sobre `.agent-teams/coordination/` directamente |
| B2 ❌ | Fix en servidor antes de continuar — el `TaskCoordinator` depende de este protocolo |
| B4-B5 ❌ path incorrecto | Fix en `handleDispatchTask()` usando `process.cwd()` vs workspace root |

> **Resultado (2026-03-12)**: B2-B5 todos ✅. `TaskCoordinator` puede implementarse sobre file-watching directamente.

---

### Criterio de entrada a Fase 3

| Spike | Estado mínimo requerido | Resultado |
|-------|------------------------|-----------|
| 1A — S4 (frontmatter) | ✅ obligatorio | ✅ |
| 1A — S6-S7 (invocación) | ✅ o workaround documentado | ✅ |
| 1B — B2-B5 | ✅ obligatorio | ✅ |

---


## Fase 3: Coordinación Paralela (Fan-out / Fan-in)

> **Estado**: ✅ Completada (2026-03-13) — incluye MCP auto-install vía `contributes.mcpServers`

**Objetivo**: Permitir que el Router despache tareas a múltiples Orchestrators en paralelo, con la extensión monitoreando la completitud.

### Pasos

| # | Paso | Depende de | Archivo(s) |
|---|------|-----------|------------|
| 9 | Crear `TaskCoordinator` | Fase 2 | `packages/extension/src/coordination/TaskCoordinator.ts` ✅ |
| 10 | Crear tool `agent-teams-dispatch-parallel` | Paso 9 | `packages/extension/src/tools/DispatchParallelTool.ts` ✅ |
| 11 | Registrar tool + frontmatter del Router | Paso 10 | `extension.ts`, `teamManager.ts` ✅ |
| 12 | Declarar tool en `package.json` + `memoryInstructions` | Paso 9 | `package.json`, `memoryInstructions.ts` ✅ |
| 13 | `complete_subtask` MCP tool | Paralelo | `packages/cli/src/mcp/dispatch-server.ts` ✅ |
| 14 | Auto-instalar MCP server con la extensión (`contributes.mcpServers`) | Paso 13 | `extension/package.json`, `extension/scripts/copy-mcp-server.cjs` ✅ |
| 15 | `CompleteSubtaskTool` (LM Tool) para fan-in sin MCP server | Paso 9 | `extension/src/tools/CompleteSubtaskTool.ts` ✅ |
| 16 | Engram result persistence en orchestrators (ambos flujos) | Paso 15 | `extension/src/memoryInstructions.ts` ✅ |

### Protocolo de coordinación Engram

```
Keys:
  task:{id}:assessment          → Valoración inicial del router (Markdown)
  task:{id}:subtask:{agentId}:result → Resultado de cada orchestrator (Markdown)
  task:{id}:status              → Estado de coordinación (JSON)

Status JSON:
{
  "id": "task-123",
  "subtasks": [
    { "agentId": "frontend-orchestrator", "status": "completed" },
    { "agentId": "backend-orchestrator", "status": "in-progress" }
  ],
  "createdAt": "2026-03-12T10:00:00Z"
}
```

### TaskCoordinator

```typescript
// packages/extension/src/coordination/TaskCoordinator.ts
interface CoordinatedTask {
  id: string;
  subtasks: { agentId: string; status: 'pending' | 'in-progress' | 'completed' }[];
  createdAt: Date;
}

// Responsabilidades:
// 1. Registrar tareas con subtasks pendientes
// 2. Observar Engram/archivos para detectar resultados
// 3. Cuando todas completan → abrir chat de agregación
```

### QA Bloques A–C ✅ / D–E pendientes

**Bloque A — MCP terminal** ✅
- `initialize` handshake ✅
- `tools/list` devuelve `dispatch_task` + `complete_subtask` ✅
- Ciclo `dispatch_task` → JSON creado, `complete_subtask` → JSON actualizado a `completed` ✅

**Bloque B — Frontmatter** ✅
- `router.agent.md` tiene `agent-teams-handoff` + `agent-teams-dispatch-parallel` ✅
- Orchestrators **no** tienen tools de handoff ✅
- Alias `codebase`→`search/codebase` normalizado vía `VSCODE_TOOL_ALIASES` ✅

**Bloque C — Live extension** ✅
- Extensión activa, ambas LM tools registradas en log ✅
- `@router` invoca `agent-teams-dispatch-parallel` ✅
- 2 chats encolados (frontend + backend) con prompts correctos ✅
- Archivos de coordinación creados en `.agent-teams/coordination/` ✅
- Frontend orchestrator completó 8/8 todos de payments UI ✅
- Comportamiento encolado (secuencial) aceptado como válido ✅

**Bloque D — Fan-in / TaskCoordinator** ✅
- `CompleteSubtaskTool` (LM Tool) implementado — orchestrators lo invocan vía `#agent-teams-complete-subtask` ✅
- Frontmatter de orchestrators incluye `agent-teams-complete-subtask` ✅
- `TaskCoordinator.notifyCompleted()` llamado directamente (sin dependencia del file watcher) ✅
- Frontend llamó al tool con `taskId` y `agentId` correctos ✅
- Backend llamó al tool al terminar ✅
- Coordination JSON actualizado a `status: completed` para ambos subtasks ✅

**Bloque E — Aggregator** ✅
- `TaskCoordinator` detectó ambos subtasks completados ✅
- Chat `@aggregator` abierto automáticamente con prompt correcto ✅
- Prompt incluye claves Engram: `task:{id}:subtask:backend:result` + `task:{id}:subtask:frontend:result` ✅
- Fix: `isPartialQuery: true` → `false` (pre-rellenaba chat activo; ahora abre chat nuevo y auto-ejecuta) ✅

### MCP auto-install (paso 14)

`contributes.mcpServers` declarado en `package.json`:
```json
"mcpServers": {
  "agent-teams": {
    "type": "stdio",
    "command": "node",
    "args": ["${extensionPath}/dist/mcp/dispatch-server.js"]
  }
}
```

`postcompile` actualizado: `copy-webviews && copy-schemas && copy-mcp-server`  
`dist/mcp/dispatch-server.js` incluido en el `.vsix` ✅ (verificado con `ZipFile`)  
`copy-mcp-server` ahora escribe también `dist/mcp/package.json` con `{"type":"module"}` para que Node cargue el MCP server ESM correctamente dentro del paquete CommonJS de la extensión.  
`dispatch-server.js` usa `process.cwd()` como workspace root → VS Code lo lanza con `cwd` = workspace folder activo → funciona sin cambios adicionales.

---

## Fase 4: Adaptación Claude con Engram

> **Estado**: ✅ Implementada (2026-03-13) — build OK, runtime portable validado, validación end-to-end diferida a release

**Objetivo**: En Claude Code, usar Engram como mecanismo de delegación entre agentes. El MCP tool `dispatch_task` (auto-instalado vía `contributes.mcpServers`) permite la delegación.

### Pasos

| # | Paso | Depende de | Archivo(s) |
|---|------|-----------|------------|
| 17 | Enriquecer `buildMemorySection()` para Claude | Fase 3 completa | `packages/extension/src/memoryInstructions.ts` ✅ |
| 18 | Modificar `mdWorkflowAndTools()` para Claude orchestrators | Paso 17 | `packages/extension/src/teamManager.ts` ✅ |
| 19 | Actualizar generación de `AGENTS.md` con protocolo Engram | Paso 17 | `packages/extension/src/teamManager.ts` ✅ |

### Cambios realizados

- `buildMemorySection()` ahora distingue `target === 'claude'` y emite instrucciones portables basadas en Engram + MCP:
  - router: escribe sub-assessments en Engram y llama `dispatch_task`
  - orchestrator: delega vía `dispatch_task` y cierra subtareas paralelas con `complete_subtask`
  - aggregator: documenta dependencia del fan-in vía `complete_subtask`
- `mdWorkflowAndTools()` ahora añade una sección `Claude Delegation` cuando el target es Claude y Engram está configurado.
- `mdHandoffs()` añade instrucciones explícitas de delegación vía Engram + MCP para agentes Claude con `delegates_to`.
- La generación raíz de `AGENTS.md` ya no trata Claude y Codex como idénticos:
  - Claude recibe un protocolo `Delegation via Engram`
  - Claude lista los agentes sincronizados en `.claude/agents/`
  - Codex mantiene el comportamiento anterior de contexto raíz sin instrucciones específicas de Claude
- Fix de coexistencia Claude + Codex: cuando ambos targets comparten el `AGENTS.md` raíz, la generación ya no permite que Codex sobrescriba el protocolo Claude con contenido vacío.
- Fix runtime: el MCP server empaquetado por la extensión ahora arranca correctamente bajo Node gracias a `dist/mcp/package.json` con `type: module`.
- Fix de tooling: la task `Dev: Build Once` ahora usa el filtro correcto `pnpm --filter agent-teams build` para compilar la extensión desde la raíz.

### Instrucciones Claude para Orchestrator

```markdown
## Delegation via Engram

When delegating a sub-task:
1. Write the sub-task context to Engram: `engram_remember` with key `task:{id}:subtask:{agentId}`
2. Invoke `dispatch_task` MCP tool with `{ agentId, taskId }`
3. The target agent will read the context from Engram at startup
```

### Verificación
1. Build TypeScript / esbuild de `packages/extension` ✅
2. Inspección estática: agentes Claude generados ahora contienen protocolo Engram + MCP ✅
3. Runtime portable validado: `dispatch_task` y `complete_subtask` responden correctamente desde el MCP server empaquetado ✅
4. Diferido a release: prueba end-to-end en Claude Code delegando con `dispatch_task`
5. Pendiente: medir reducción de tokens vs generación anterior

---

## Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code Extension                        │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  Router   │  │ HandoffTool  │  │   TaskCoordinator         │ │
│  │ (ChatPart)│→ │ (LM Tool)   │→ │   (Background Observer)   │ │
│  └──────────┘  └──────────────┘  └───────────────────────────┘ │
│       │               │                    │                    │
│       │               ▼                    ▼                    │
│       │         ┌──────────┐        ┌──────────────┐           │
│       │         │  Engram  │◄──────►│ Aggregator   │           │
│       │         │  (MCP)   │        │ (new chat)   │           │
│       │         └──────────┘        └──────────────┘           │
│       │               ▲                                        │
│       ▼               │                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │              New Chat Sessions                    │          │
│  │  ┌─────────────┐        ┌─────────────┐          │          │
│  │  │ Orchestrator │        │ Orchestrator │          │          │
│  │  │ (frontend)   │        │ (backend)    │          │          │
│  │  │  tools:      │        │  tools:      │          │          │
│  │  │  - react-dev │        │  - api-dev   │          │          │
│  │  │  - css-dev   │        │  - db-dev    │          │          │
│  │  └─────────────┘        └─────────────┘          │          │
│  │        │                        │                 │          │
│  │        ▼                        ▼                 │          │
│  │  ┌──────────┐            ┌──────────┐             │          │
│  │  │ Workers  │            │ Workers  │             │          │
│  │  │(sub-agent│            │(sub-agent│             │          │
│  │  │ context) │            │ context) │             │          │
│  │  └──────────┘            └──────────┘             │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Orden de ejecución

```
Spike 0 ──→ Fase 1 ──→ Fase 2 ──→ Fase 3 ──→ Fase 4
  │          (hecho)      │           │           │
  │                       │           │           │
  ▼                       ▼           ▼           ▼
confirmar              handoff     fan-out      Claude
chat API               tool      coordinación   Engram
```

- **Spike 0** y **Fase 1** son independientes (Fase 1 ya completada)
- **Fase 2** depende del resultado del Spike 0
- **Fase 3** depende de Fase 2
- **Fase 4** depende del MCP server creado en Fase 2 (paso 6)

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `packages/extension/src/teamManager.ts` | Generación de agent MD, frontmatter, handoffs |
| `packages/extension/src/extension.ts` | Registro de commands, chat participant, tools |
| `packages/extension/src/memoryInstructions.ts` | Instrucciones de Engram por rol |
| `packages/extension/src/orchestrator.ts` | Delegación LLM-based actual (a evolucionar) |
| `packages/extension/package.json` | Declaraciones de commands, tools, chat participants |
| `packages/core/src/types/index.ts` | Tipos: AgentSpec, AgentHandoffs, AgentTool |
| `packages/extension/src/tools/HandoffTool.ts` | **Nuevo** — Fase 2 |
| `packages/extension/src/tools/CompleteSubtaskTool.ts` | **Nuevo** — Fase 3 (paso 15) |
| `packages/extension/src/coordination/TaskCoordinator.ts` | **Nuevo** — Fase 3 |
| `packages/extension/scripts/copy-mcp-server.cjs` | **Nuevo** — Fase 3 (paso 14) |
| `packages/cli/src/mcp/` | **Nuevo** — MCP server para Claude (Fase 2) |
