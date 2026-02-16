# Convenciones

**Tabla de Contenido**
- [Estructura de archivos](#estructura-de-archivos)
- [Nomenclatura](#nomenclatura)
- [Reglas de frontmatter](#reglas-de-frontmatter)

---

## Estructura de archivos

### Especificaciones (specs/)

```
specs/
├── backend-agent.yml
├── frontend-agent.yml
└── router-agent.yml
```

**Reglas**:
- Un archivo YAML por agente
- Nombre en formato `<dominio>-agent.yml`
- Debe cumplir con `schemas/agent.schema.json`

### Agentes generados (agents/)

```
agents/
├── _templates/
│   └── agent.template.md
├── _spec/              # Generado automaticamente
│   └── backend-agent.yml
├── backend-agent.md
└── frontend-agent.md
```

**Reglas**:
- Archivos `.md` con frontmatter YAML
- Mantener `_templates/` bajo control de versiones
- `_spec/` es generado, no editar manualmente

### Context Packs (context-packs/)

```
context-packs/
├── backend/
│   ├── api-patterns.md
│   └── database.md
└── shared/
    └── code-style.md
```

**Reglas**:
- Organizar por dominio
- Archivos markdown pequenos y enfocados
- Referencias relativas en especificaciones

## Nomenclatura

### IDs de agentes

- **Formato**: `kebab-case`
- **Longitud**: 3-64 caracteres
- **Caracteres**: Minusculas, numeros, guiones
- **Ejemplos**: 
  - Validos: `backend-agent`, `api-gateway`, `db-migrations`
  - Invalidos: `BackendAgent`, `backend_agent`, `backend agent`

### Dominios

- **Formato**: `lowercase`
- **Ejemplos**: `backend`, `frontend`, `devops`, `analytics`
- **Subdominios**: Separados por coma en YAML: `api,database,cache`

### Intents

- **Formato**: `snake_case`
- **Ejemplos**: `api_design`, `code_review`, `bug_fix`, `db_migration`
- **Minimo**: 1 intent por agente

### Entrypoints

- **Formato**: `agent:<id>`
- **Ejemplo**: `agent:backend-agent`
- **Auto-generado**: Basado en el ID del agente

## Reglas de frontmatter

### Estructura minima

```yaml
---
id: "backend-agent"
role: "worker"
domain: "backend"
name: "Backend Agent"
description: "Especialista en desarrollo backend"

invocation:
  entrypoint: "agent:backend-agent"
  mode: "llm"

match:
  intents:
    - "api_design"

context:
  max_files: 8
  max_chars_per_file: 4000

output:
  mode_default: "short+diff"
  schema:
    - "Resumen"
    - "Cambios"

delegation:
  role: "solo"
  strategy: "disabled"

verification:
  required: true
---
```

### Campos obligatorios

- `id`, `role`, `domain`, `name`, `description`
- `invocation.entrypoint`, `invocation.mode`
- `match.intents` (minimo 1)
- `context.max_files`, `context.max_chars_per_file`
- `output.mode_default`, `output.schema`
- `delegation.role`, `delegation.strategy`
- `verification.required`

### Valores permitidos

- **role**: `worker`, `orchestrator`, `router`
- **invocation.mode**: `llm`
- **delegation.role**: `solo`, `orchestrator`
- **delegation.strategy**: `disabled`, `agent_handoff`, `router_split`
- **output.mode_default**: `short+diff`, `detailed`, `minimal`
