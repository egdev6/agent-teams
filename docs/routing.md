# Enrutamiento

**Tabla de Contenido**
- [Lista de intents y prioridad](#lista-de-intents-y-prioridad)
- [Comportamiento del Router](#comportamiento-del-router)
- [Formato de handoff](#formato-de-handoff)

---

## Lista de intents y prioridad

Los **intents** son categorias de tareas que cada agente puede manejar:

### Intents comunes

#### Backend
- `api_design` - Diseño de APIs REST/GraphQL
- `db_migration` - Migraciones de base de datos
- `auth_implementation` - Autenticacion y autorizacion
- `api_testing` - Testing de APIs
- `performance_optimization` - Optimizacion de rendimiento

#### Frontend
- `component_creation` - Creacion de componentes
- `state_management` - Gestion de estado
- `ui_styling` - Estilos y diseño UI
- `routing_setup` - Configuracion de rutas
- `form_validation` - Validacion de formularios

#### General
- `code_review` - Revision de codigo
- `bug_fix` - Correccion de bugs
- `refactoring` - Refactorizacion
- `documentation` - Documentacion
- `testing` - Testing general

### Prioridad de matching

Cuando multiples agentes coinciden con un intent, el Router usa este orden:

1. **Exactitud del intent**: Agente con el intent exacto
2. **Dominio**: Agente del mismo dominio
3. **Path matching**: Agente con `path_globs` que coincidan
4. **Keywords**: Agente con keywords relevantes
5. **Default**: Agente general o router

**Ejemplo**:

```yaml
# backend-agent.yml
match:
  intents:
    - "api_design"
    - "db_migration"
  path_globs:
    - "src/api/**"
    - "src/models/**"
  keywords:
    - "express"
    - "fastapi"
    - "postgresql"
```

Solicitud: "Create a new REST endpoint"
- Intent detectado: `api_design`
- Path: `src/api/users.ts`
- Keyword: "REST"

→ **Match**: `backend-agent` (3 coincidencias)

## Comportamiento del Router

El agente router (`role: "router"`) es el punto de entrada:

### 1. Recepcion de solicitud

```
Usuario → "Crea un endpoint para usuarios"
         ↓
      Router
```

### 2. Analisis de intent

El Router analiza:
- **Palabras clave**: "endpoint" → `api_design`
- **Contexto**: Archivo actual (`src/api/...`)
- **Historia**: Conversacion previa

### 3. Matching de agentes

Consulta agentes disponibles:

```yaml
# .github/agents/
backend-agent.agent.md  # intents: [api_design, db_migration]
frontend-agent.agent.md # intents: [component_creation, ui_styling]
database-agent.agent.md # intents: [db_migration, schema_design]
```

Calcular scores:
- `backend-agent`: 100 (intent exacto + path match)
- `database-agent`: 30 (intent relacionado)
- `frontend-agent`: 0 (sin match)

### 4. Seleccion y delegacion

```yaml
# Router delega a backend-agent
delegation:
  target: "backend-agent"
  reason: "Intent api_design matched (score: 100)"
```

### 5. Respuesta

El router recibe el resultado y:
- Lo valida
- Lo formatea segun `output.schema`
- Lo retorna al usuario

## Formato de handoff

Cuando un agente delega a otro, usa este formato:

### Handoff simple

```yaml
handoff:
  target_agent: "backend-agent"
  reason: "API design expertise required"
  context:
    original_request: "Create user endpoint"
    files:
      - "src/api/users.ts"
      - "src/models/user.ts"
    constraints:
      - "Use Express.js"
      - "Follow REST conventions"
```

### Handoff con agregacion

```yaml
handoff:
  strategy: "parallel"
  tasks:
    - target: "backend-agent"
      subtask: "Create API endpoint"
      files: ["src/api/users.ts"]
    - target: "database-agent"
      subtask: "Create migration"
      files: ["migrations/001_users.sql"]
    - target: "frontend-agent"
      subtask: "Create form component"
      files: ["src/components/UserForm.tsx"]
  aggregation: "combine_results"
```

### Respuesta de handoff

```yaml
handoff_result:
  status: "success"
  agent: "backend-agent"
  output:
    summary: "Created user endpoint"
    changes:
      - file: "src/api/users.ts"
        action: "created"
      - file: "src/models/user.ts"
        action: "modified"
  metadata:
    duration_ms: 1250
    tokens_used: 450
```

### Manejo de errores

```yaml
handoff_result:
  status: "error"
  agent: "backend-agent"
  error:
    code: "VALIDATION_FAILED"
    message: "Schema validation failed"
    details:
      - "Missing required field: email"
  fallback: "router"  # Volver al router para reintento
```
