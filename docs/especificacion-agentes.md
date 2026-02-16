# Especificación de Agentes

Esta guía documenta el formato completo de las especificaciones de agentes en YAML.

---

## Formato Completo

```yaml
# REQUIRED: VS Code compatible frontmatter
name: "Nombre del Agente"
description: "Descripción breve"

# METADATA: Configuración extendida (para tooling interno)
# Nota: Copilot consume .github/agents/*.agent.md
# _metadata se transpila al frontmatter final
_metadata:
  # Identity
  id: "agent-slug"  # Sin @, usado para paths
  role: "worker" | "orchestrator" | "router"
  domain: "backend" | "frontend" | "testing" | "devops" | "docs"
  subdomains: ["api", "auth"]  # Opcional
  
  # Invocation
  invocation:
    aliases: ["@agent-slug"]  # Como lo invoca el usuario
    entrypoint: "agent:agent-slug"  # Identificador Copilot
  
  # Routing
  intents:
    - "api_design"
    - "endpoint_add"
  path_globs:
    - "src/api/**/*.ts"
  keywords:
    - "REST"
    - "endpoint"
  
  # Context Discipline
  context:
    packs: []  # Context packs opcionales
    max_files: 8
    max_chars_per_file: 8000  # ~2K tokens
  
  # Output Control
  output:
    mode_default: "short+diff" | "diff" | "plan" | "structured"
    max_bullets: 10
    schema: ["steps", "code", "explanation"]  # Para structured
    never_include:
      - "disclaimers"
      - "placeholders"
      - "apologies"
  
  # Delegation (solo orchestrators/routers)
  delegation:
    strategy: "router_split" | "agent_handoff" | "disabled"
    max_handoffs: 2
    allowed_subagents: ["backend-agent", "frontend-agent"]  # IDs sin @
  
  # Skills Whitelist
  skills:
    allowed:
      - "file_edit"
      - "file_create"
      - "search_codebase"
```

---

## Roles

### Worker
Agente especializado en tareas específicas dentro de un dominio.

**Características:**
- Ejecuta tareas concretas (crear, editar, eliminar archivos)
- Tiene skills específicos habilitados
- Trabaja dentro de path_globs definidos
- Puede delegar (opcional) pero usualmente no lo hace

**Ejemplo:**
```yaml
_metadata:
  role: worker
  domain: backend
  subdomains: ["api"]
  skills:
    allowed: ["file_edit", "file_create", "search_codebase"]
```

### Orchestrator
Coordina múltiples agentes para completar workflows complejos.

**Características:**
- Delega a otros agentes (workers principalmente)
- NO tiene skills de edición (no ejecuta, coordina)
- Agregación de respuestas de múltiples agentes
- Debe tener delegation configurado

**Ejemplo:**
```yaml
_metadata:
  role: orchestrator
  domain: testing
  delegation:
    strategy: router_split
    max_handoffs: 2
    allowed_subagents: ["vitest-worker", "integration-tester"]
  skills:
    allowed: []  # Sin skills, solo coordinación
```

### Router
Analiza requests y delega al agente más apropiado.

**Características:**
- Solo puede usar `search_codebase` skill
- Debe usar delegation strategy `router_split`
- Max handoffs: 1 (no re-routing)
- Domain: preferiblemente `global`

**Ejemplo:**
```yaml
_metadata:
  role: router
  domain: global
  delegation:
    strategy: router_split
    max_handoffs: 1
    allowed_subagents: all
  skills:
    allowed: ["search_codebase"]
```

---

## Dominios y Subdominios

### Backend

**Domain:** `backend`

**Subdominios disponibles:**
- `api` - Diseño de APIs, endpoints REST/GraphQL
- `database` - Modelos, queries, migraciones, optimización
- `auth` - Autenticación, autorización, JWT, OAuth

**Ejemplo:**
```yaml
_metadata:
  domain: backend
  subdomains: ["api", "auth"]
  intents:
    - "api_design"
    - "auth_implementation"
  path_globs:
    - "src/api/**/*.ts"
    - "src/auth/**/*.ts"
```

### Frontend

**Domain:** `frontend`

**Subdominios disponibles:**
- `components` - Componentes UI, props, composition
- `ui` - Estilos, layouts, themes, design system
- `state` - State management (Redux, Zustand, Context)
- `routing` - Navegación, routes, guards

**Ejemplo:**
```yaml
_metadata:
  domain: frontend
  subdomains: ["components", "state"]
  intents:
    - "component_creation"
    - "state_management"
  path_globs:
    - "src/components/**/*.tsx"
    - "src/store/**/*.ts"
```

### Testing

**Domain:** `testing`

**Subdominios disponibles:**
- `unit` - Tests unitarios
- `integration` - Tests de integración
- `e2e` - Tests end-to-end

**Ejemplo:**
```yaml
_metadata:
  domain: testing
  subdomains: ["unit", "integration"]
  intents:
    - "unit_testing"
    - "integration_testing"
  path_globs:
    - "**/*.test.ts"
    - "**/*.spec.ts"
```

### DevOps

**Domain:** `devops`

**Subdominios disponibles:**
- `ci` - CI/CD pipelines, workflows
- `deployment` - Despliegue, infraestructura
- `monitoring` - Logging, métricas, alertas

**Ejemplo:**
```yaml
_metadata:
  domain: devops
  subdomains: ["ci", "deployment"]
  intents:
    - "pipeline_setup"
    - "deployment_config"
  path_globs:
    - ".github/workflows/**/*.yml"
    - "infra/**/*"
```

### Docs

**Domain:** `docs`

**Subdominios disponibles:**
- `api` - Documentación de APIs (OpenAPI, JSDoc)
- `user` - Documentación de usuario, guías
- `technical` - Documentación técnica, arquitectura

**Ejemplo:**
```yaml
_metadata:
  domain: docs
  subdomains: ["api", "technical"]
  intents:
    - "api_documentation"
    - "technical_guide"
  path_globs:
    - "docs/**/*.md"
    - "**/*.openapi.yml"
```

### Global

**Domain:** `global`

**Uso:** Agentes que trabajan cross-domain (routers principalmente)

**Ejemplo:**
```yaml
_metadata:
  domain: global
  role: router
  intents:
    - "routing"
    - "intent_detection"
```

---

## Context Discipline

### Context Packs

```yaml
context:
  packs:
    - "project:testing-guidelines"
    - "kit:vitest-best-practices"
    - "global:coding-standards"
```

**Tipos de packs:**
- `project:` - Context packs del proyecto (.agent-teams/context-packs/)
- `kit:` - Context packs de kits (kits/{kit-id}/context-packs/)
- `global:` - Context packs globales

### Context Limits

```yaml
context:
  max_files: 8              # Máximo archivos en contexto
  max_chars_per_file: 8000  # ~2K tokens por archivo
```

**Recomendaciones:**
- **Workers:** 8 files, 8K chars (default)
- **Orchestrators:** 8 files, 8K chars (solo para análisis)
- **Routers:** 8 files, 8K chars (para search_codebase)

---

## Output Control

### Output Modes

#### short+diff (Recomendado)
Respuesta breve con diffs de cambios.

```yaml
output:
  mode_default: "short+diff"
  max_bullets: 10
  never_include:
    - "disclaimers"
    - "placeholders"
```

**Resultado:**
```
✅ Added password reset endpoint

Changes:
- src/api/auth.ts:
  + Added resetPassword() function
  + Added /reset-password route

Next: Test with POST request to /api/reset-password
```

#### diff
Solo muestra diffs, sin narrativa.

```yaml
output:
  mode_default: "diff"
```

#### plan
Plan de acción sin código.

```yaml
output:
  mode_default: "plan"
  max_bullets: 10
```

**Resultado:**
```
Plan to add password reset:
1. Create resetPassword() in auth service
2. Add /reset-password route
3. Validate email input
4. Send reset email
5. Update tests
```

#### structured
Output JSON estructurado.

```yaml
output:
  mode_default: "structured"
  schema: ["steps", "code", "explanation"]
```

### Never Include

```yaml
output:
  never_include:
    - "disclaimers"      # Sin "Note that..." innecesarios
    - "placeholders"     # Sin "// ... existing code ..."
    - "apologies"        # Sin "Sorry for the confusion"
    - "suggestions"      # Sin sugerencias no solicitadas
```

---

## Delegation

### Strategies

#### router_split
Router analiza y delega (routers y orchestrators).

```yaml
delegation:
  strategy: "router_split"
  max_handoffs: 1  # Routers: siempre 1
  allowed_subagents: all
```

#### agent_handoff
Worker delega una subtarea específica.

```yaml
delegation:
  strategy: "agent_handoff"
  max_handoffs: 1
  allowed_subagents: ["database-agent"]
```

#### disabled
Sin delegación (workers típicamente).

```yaml
delegation:
  strategy: "disabled"
```

### Allowed Subagents

```yaml
delegation:
  allowed_subagents: 
    - "backend-agent"      # IDs sin @
    - "frontend-agent"
    - "database-agent"
```

**Especial:**
```yaml
delegation:
  allowed_subagents: all  # Cualquier agente
```

### Loop Protection

El sistema automáticamente previene:
- **handoffDepth** tracking - Cuenta delegaciones encadenadas
- **visitedAgents** Set - Previene ciclos (A→B→A)
- **max_handoffs** enforcement - Límite por agente

---

## Skills

### Skills Disponibles

```yaml
skills:
  allowed:
    - "file_edit"         # Editar archivos existentes
    - "file_create"       # Crear nuevos archivos
    - "file_delete"       # Eliminar archivos
    - "search_codebase"   # Buscar en código
    - "run_terminal"      # Ejecutar comandos shell
    - "browser_preview"   # Preview de web apps
    - "database_query"    # Consultas a base de datos
```

### Skills por Role

**Workers:**
```yaml
skills:
  allowed:
    - "file_edit"
    - "file_create"
    - "search_codebase"
    # + otros según necesidad
```

**Orchestrators:**
```yaml
skills:
  allowed: []  # Sin skills, solo delegación
```

**Routers:**
```yaml
skills:
  allowed:
    - "search_codebase"  # Solo search, sin edición
```

---

## Intents

Los intents describen qué tipo de tareas puede manejar el agente.

### Backend Intents

```yaml
intents:
  - "api_design"
  - "endpoint_add"
  - "endpoint_modify"
  - "auth_implementation"
  - "jwt_setup"
  - "middleware_create"
  - "schema_design"
  - "query_optimization"
  - "migration_create"
```

### Frontend Intents

```yaml
intents:
  - "component_creation"
  - "component_modify"
  - "props_interface"
  - "state_management"
  - "context_setup"
  - "routing_setup"
  - "style_implementation"
```

### Testing Intents

```yaml
intents:
  - "unit_testing"
  - "integration_testing"
  - "e2e_testing"
  - "test_creation"
  - "test_debugging"
```

### DevOps Intents

```yaml
intents:
  - "pipeline_setup"
  - "ci_configuration"
  - "deployment_config"
  - "infrastructure_setup"
  - "monitoring_setup"
```

---

## Path Globs

Patrones de archivos donde el agente trabaja.

### Sintaxis

```yaml
path_globs:
  - "src/api/**/*.ts"           # Todos los .ts en src/api/
  - "src/components/**/*.tsx"   # Todos los .tsx en src/components/
  - "**/*.test.ts"              # Todos los .test.ts en cualquier lugar
  - "!**/*.spec.ts"             # Excluir .spec.ts
```

### Ejemplos por Domain

**Backend API:**
```yaml
path_globs:
  - "src/api/**/*.ts"
  - "src/routes/**/*.ts"
  - "src/middleware/**/*.ts"
```

**Frontend Components:**
```yaml
path_globs:
  - "src/components/**/*.tsx"
  - "src/components/**/*.vue"
```

**Testing:**
```yaml
path_globs:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "tests/**/*"
```

---

## Keywords

Términos que ayudan al router a identificar requests relevantes.

### Ejemplos por Domain

**Backend:**
```yaml
keywords:
  - "REST"
  - "API"
  - "endpoint"
  - "route"
  - "middleware"
  - "JWT"
  - "auth"
```

**Frontend:**
```yaml
keywords:
  - "React"
  - "component"
  - "props"
  - "state"
  - "hook"
  - "UI"
```

**Testing:**
```yaml
keywords:
  - "test"
  - "spec"
  - "vitest"
  - "jest"
  - "expect"
  - "describe"
```

---

## Ejemplo Completo: Backend API Worker

```yaml
name: "Backend API Worker"
description: "Creates and manages REST API endpoints with authentication"

_metadata:
  id: "backend-api-worker"
  role: worker
  domain: backend
  subdomains: ["api", "auth"]
  
  invocation:
    aliases: ["@backend-api-worker", "@api-worker"]
    entrypoint: "agent:backend-api-worker"
  
  intents:
    - "api_design"
    - "endpoint_add"
    - "endpoint_modify"
    - "auth_implementation"
  
  path_globs:
    - "src/api/**/*.ts"
    - "src/routes/**/*.ts"
    - "src/middleware/auth*.ts"
  
  keywords:
    - "REST"
    - "API"
    - "endpoint"
    - "route"
    - "JWT"
    - "authentication"
  
  context:
    packs:
      - "project:api-guidelines"
    max_files: 8
    max_chars_per_file: 8000
  
  output:
    mode_default: "short+diff"
    max_bullets: 10
    never_include:
      - "disclaimers"
      - "placeholders"
      - "apologies"
  
  delegation:
    strategy: "agent_handoff"
    max_handoffs: 1
    allowed_subagents: ["database-agent"]
  
  skills:
    allowed:
      - "file_edit"
      - "file_create"
      - "search_codebase"
      - "run_terminal"
```

---

## Recursos Adicionales

- [Guía del Wizard](guia-wizard.md)
- [Flujo de Trabajo](flujo-de-trabajo.md)
- [Architecture](architecture.md)
- [Conventions](conventions.md)
