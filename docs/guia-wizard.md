# Guía del Wizard de Creación de Agentes

El wizard de creación de agentes se adapta al role seleccionado para proporcionar una experiencia optimizada.

---

## Acceso al Wizard

**Comando:** `Agent Team: Create New Agent`

```
1. Abrir VS Code
2. Cmd/Ctrl + Shift + P
3. "Agent Team: Create New Agent"
4. Seguir wizard (pasos variables según role)
5. Revisar resumen y confirmar
6. ✅ Spec generado → Agent generado → Sincronizado → Listo
```

---

## Pasos Comunes (1-3)

Todos los agentes comienzan con estos pasos:

1. **Nombre** - Nombre descriptivo del agente
2. **Descripción** - Explicación de funcionalidad
3. **Role** - `worker`, `orchestrator`, o `router`

> **Importante:** El wizard se adapta según el role seleccionado en el paso 3.

---

## 🎯 Router Wizard (6 pasos)

Flujo simplificado para routers que analizan y delegan requests.

### Pasos del Router

1. **Nombre** - Ej: "API Router", "Backend Router"
2. **Descripción** - Ej: "Routes backend API requests"
3. **Role** - Seleccionar `router`
4. **Domain** - `global` (recomendado para routers)
5. **Intents** - routing, intent_detection, agent_selection
6. **Keywords** - route, delegate, analyze, distribute

### Configuración Fixed (No Editable)

- ✅ **Skills:** `search_codebase` (solo, sin file editing)
- ✅ **Delegation:** `router_split`, max 1 handoff
- ✅ **Output:** `short+diff`
- ✅ **Context:** 8 files, 8K chars/file

### Resultado

Router listo para:
- Analizar requests del usuario
- Detectar intents y contexto
- Delegar al agente más apropiado
- **NO editar código directamente**

### Ejemplo de Uso

```
@api-router create a user authentication endpoint
→ Analiza: intent=api_design, paths=src/api/**
→ Delega a: @backend-api-agent
```

---

## 🎭 Orchestrator Wizard (8 pasos)

Flujo enfocado en delegación y coordinación de múltiples agentes.

### Pasos del Orchestrator

1. **Nombre** - Ej: "Test Orchestrator", "Deploy Coordinator"
2. **Descripción** - Ej: "Coordinates testing workflows"
3. **Role** - Seleccionar `orchestrator`
4. **Domain** - backend, frontend, testing, fullstack, global
5. **Subdomains** (opcional) - api, database, components, etc.
6. **Intents** - feature_implementation, refactoring_workflow, deployment_pipeline
7. **Path globs** (opcional) - Patrones de archivos a coordinar
8. **Keywords** - implement, refactor, workflow, pipeline, coordinate
9. **Delegation Config** (mandatory):
   - **Max handoffs** - 1-3 (recomendado: 2)
   - **Allowed subagents** - IDs específicos o `all`

### Configuración Fixed

- ✅ **Skills:** `[]` (orchestrators delegan, no ejecutan)
- ✅ **Delegation:** `router_split` con config personalizada
- ✅ **Output:** `short+diff`
- ✅ **Context:** 8 files, 8K chars/file

### Resultado

Orchestrator listo para:
- Coordinar múltiples workers
- Delegar subtareas complejas
- Agregar resultados
- **NO ejecutar código directamente**

### Ejemplo de Uso

```
@test-orchestrator create integration tests for the auth module
→ Coordina:
  1. @vitest-worker → unit tests
  2. @integration-tester → integration tests
  3. Agrega resultados y reporta
```

---

## 🔧 Worker Wizard (9 pasos + advanced)

Flujo completo para workers que ejecutan tareas específicas.

### Pasos del Worker

1. **Nombre** - Ej: "API Worker", "Component Creator"
2. **Descripción** - Ej: "Creates and edits API endpoints"
3. **Role** - Seleccionar `worker`
4. **Domain** - backend, frontend, testing, devops, documentation
5. **Subdomains** - api, database, auth, components, state, routing
6. **Intents** - Sugerencias automáticas del preset
7. **Path globs** - Sugerencias automáticas del preset
8. **Keywords** - Sugerencias automáticas del preset
9. **Skills Selection** (CRÍTICO):
   - `file_edit` - Editar archivos existentes
   - `file_create` - Crear nuevos archivos
   - `file_delete` - Eliminar archivos
   - `search_codebase` - Buscar en código
   - `run_terminal` - Ejecutar comandos
   - `browser_preview` - Preview de web
   - `database_query` - Consultas DB

### Advanced Settings (Opcional)

**Output Mode:**
- `short+diff` - Breve con diffs (default, eficiente)
- `diff` - Solo diffs
- `structured` - JSON estructurado
- `plan` - Plan de acción sin código

**Context Limits:**
- `max_files` - Máximo archivos en contexto (default: 8)
- `max_chars_per_file` - Máximo caracteres por archivo (default: 8000)

**Delegation (Advanced):**
- Habilitar si el worker necesita coordinar sub-tareas
- Max handoffs: 1-2
- Allowed subagents: IDs específicos

### Configuración

- ✅ **Skills:** Seleccionados por usuario (presets inteligentes)
- ✅ **Delegation:** Opcional (default: disabled)
- ✅ **Output:** Configurable (default: short+diff)
- ✅ **Context:** Configurable (default: 8 files, 8K chars/file)

### Resultado

Worker listo para:
- Ejecutar tareas específicas
- Editar/crear/eliminar archivos
- Buscar código
- Ejecutar comandos
- **Trabajar dentro de su dominio**

### Ejemplo de Uso

```
@backend-api-worker add a password reset endpoint
→ Ejecuta:
  1. Busca archivos relacionados
  2. Crea nuevo endpoint
  3. Actualiza routes
  4. Retorna diffs
```

---

## 🎯 Domain Presets

El wizard sugiere configuraciones inteligentes basadas en dominio y subdominio.

### Backend Presets

#### backend:api
```yaml
intents: ["api_contract", "endpoint_add", "auth_implementation"]
paths: ["src/api/**/*.ts", "src/routes/**/*.ts"]
keywords: ["REST", "endpoint", "middleware", "route"]
skills: ["file_edit", "file_create", "search_codebase"]
```

#### backend:database
```yaml
intents: ["schema_design", "query_optimization", "migration_create"]
paths: ["src/db/**/*.ts", "migrations/**/*.sql"]
keywords: ["SQL", "PostgreSQL", "migration", "schema"]
skills: ["file_edit", "file_create", "database_query"]
```

#### backend:auth
```yaml
intents: ["auth_implementation", "jwt_setup", "permissions"]
paths: ["src/auth/**/*.ts", "src/middleware/auth*.ts"]
keywords: ["JWT", "authentication", "authorization", "token"]
skills: ["file_edit", "file_create", "search_codebase"]
```

### Frontend Presets

#### frontend:components
```yaml
intents: ["component_creation", "props_interface", "state_management"]
paths: ["src/components/**/*.tsx", "src/components/**/*.vue"]
keywords: ["React", "Vue", "component", "props", "hook"]
skills: ["file_edit", "file_create", "browser_preview"]
```

#### frontend:state
```yaml
intents: ["state_management", "context_setup", "store_create"]
paths: ["src/store/**/*.ts", "src/context/**/*.tsx"]
keywords: ["Redux", "Zustand", "Context", "state"]
skills: ["file_edit", "file_create", "search_codebase"]
```

#### frontend:routing
```yaml
intents: ["route_configuration", "navigation_setup"]
paths: ["src/routes/**/*.tsx", "src/router/**/*.ts"]
keywords: ["React Router", "Vue Router", "navigation", "route"]
skills: ["file_edit", "file_create"]
```

### Testing Presets

#### testing (general)
```yaml
intents: ["unit_testing", "integration_testing", "e2e_testing"]
paths: ["**/*.test.ts", "**/*.spec.ts", "tests/**/*"]
keywords: ["test", "spec", "jest", "vitest", "assert", "expect"]
skills: ["file_edit", "file_create", "run_terminal"]
```

### DevOps Presets

#### devops:ci
```yaml
intents: ["pipeline_setup", "ci_configuration"]
paths: [".github/workflows/**/*.yml", ".gitlab-ci.yml"]
keywords: ["CI/CD", "pipeline", "workflow", "deploy"]
skills: ["file_edit", "file_create"]
```

#### devops:deployment
```yaml
intents: ["deployment_config", "infrastructure_setup"]
paths: ["infra/**/*", "terraform/**/*", "k8s/**/*"]
keywords: ["Docker", "Kubernetes", "Terraform", "deploy"]
skills: ["file_edit", "file_create", "run_terminal"]
```

---

## Flujo Completo de Ejemplo

### Crear un Worker de Testing

```
1. Cmd+Shift+P → Create New Agent

2. Nombre: "Vitest Worker"

3. Descripción: "Runs and creates Vitest tests"

4. Role: worker

5. Domain: testing
   → Preset aplicado automáticamente

6. Subdomains: (ninguno para testing general)

7. Intents: (sugeridos por preset)
   ✓ unit_testing
   ✓ integration_testing
   ✓ test_creation

8. Path globs: (sugeridos por preset)
   ✓ **/*.test.ts
   ✓ **/*.spec.ts
   ✓ tests/**/*

9. Keywords: (sugeridos por preset)
   ✓ test
   ✓ vitest
   ✓ expect
   ✓ describe

10. Skills: (sugeridos por preset)
    ✓ file_edit
    ✓ file_create
    ✓ run_terminal
    ✓ search_codebase

11. Advanced Settings: (opcional)
    Output mode: short+diff
    Context: 8 files, 8K chars
    Delegation: No

12. Resumen y Confirmación
    ✅ Confirmar

Resultado:
- ✅ specs/vitest-worker.yml created
- ✅ agents/vitest-worker.md generated
- ✅ .github/agents/vitest-worker.agent.md synced
- ✅ Ready to use: @vitest-worker
```

---

## Después del Wizard

### Resultado de la Generación

```
your-project/
├── specs/
│   └── vitest-worker.yml      # ← SOURCE OF TRUTH (editable)
├── agents/
│   └── vitest-worker.md       # ← DO NOT EDIT (generado)
└── .github/
    └── agents/
        └── vitest-worker.agent.md  # ← Para Copilot
```

### Uso Inmediato

```
@vitest-worker create tests for the Button component
@vitest-worker run all integration tests
@vitest-worker add unit test for validateEmail function
```

### Iteración

1. Editar `specs/vitest-worker.yml`
2. Click derecho → `Generate Agent from Spec`
3. ✅ Auto-sincronizado a `.github/agents/`
4. Listo para usar con cambios

---

## Mejores Prácticas

### Nombres Descriptivos
✅ "Backend API Worker"  
✅ "Test Orchestrator"  
❌ "Agent1"  
❌ "Worker"

### Descripciones Claras
✅ "Creates and edits REST API endpoints with authentication"  
❌ "Does backend stuff"

### Domain/Subdomain Apropiado
✅ backend:api para endpoints  
✅ frontend:components para componentes UI  
❌ global para workers específicos

### Skills Mínimos Necesarios
✅ Solo los skills que el agente realmente necesita  
❌ Seleccionar todos "por si acaso"

### Keywords Relevantes
✅ Términos que el usuario realmente usará  
❌ Keywords demasiado genéricos

---

## Recursos Adicionales

- [Especificación de Agentes](especificacion-agentes.md)
- [Flujo de Trabajo](flujo-de-trabajo.md)
- [Domain Presets](conventions.md#domain-presets)
- [Contract Discipline](architecture.md#contract-discipline)
