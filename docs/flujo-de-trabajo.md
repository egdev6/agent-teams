# Flujo de Trabajo

Esta guía detalla el flujo completo de trabajo con Agent Teams, desde la creación hasta el uso y mantenimiento de agentes.

---

## 1. Crear un Agente

### Opción A: Via Extensión (Recomendado)

```
1. Abrir VS Code en tu proyecto
2. Cmd/Ctrl + Shift + P
3. "Agent Team: Create New Agent"
4. Completar wizard (pasos variables según role)
5. Revisar resumen
6. ✅ Confirmar
```

**Resultado:**
- ✅ `specs/{id}.yml` - Source of truth (editable)
- ✅ `agents/{id}.md` - Generado con banner DO NOT EDIT
- ✅ `.github/agents/{id}.agent.md` - Sincronizado para Copilot

### Opción B: Via Spec Manual

**1. Crear el spec:**

```yaml
# specs/mi-agente-backend.yml
name: "Mi Agente Backend"
description: "Especialista en APIs REST y autenticación"

_metadata:
  id: mi-agente-backend
  role: worker
  domain: backend
  subdomains: ["api", "auth"]
  
  invocation:
    aliases: ["@mi-agente-backend"]
    entrypoint: "agent:mi-agente-backend"
  
  intents:
    - "api_design"
    - "auth_implementation"
    - "endpoint_add"
  
  path_globs:
    - "src/api/**/*.ts"
    - "src/auth/**/*.ts"
  
  keywords:
    - "REST"
    - "JWT"
    - "authentication"
    - "endpoint"
  
  context:
    max_files: 8
    max_chars_per_file: 8000
  
  output:
    mode_default: "short+diff"
    never_include: ["disclaimers", "placeholders"]
  
  skills:
    allowed:
      - "file_edit"
      - "file_create"
      - "search_codebase"
```

**2. Generar el agente:**

```
Click derecho en specs/mi-agente-backend.yml
→ "Agent Team: Generate Agent from Spec"
```

---

## 2. Usar el Agente

### Routing Automático

Usa el router para que analice y delegue automáticamente:

```
@router implement user authentication with JWT
```

**Proceso:**
1. Router analiza el request
2. Detecta intents: `auth_implementation`, `api_design`
3. Match paths: `src/auth/**`, `src/api/**`
4. Detecta keywords: `authentication`, `JWT`
5. Calcula scores normalizados
6. Delega a: `@mi-agente-backend`

### Invocación Directa

Invoca directamente si sabes qué agente necesitas:

```
@mi-agente-backend add password reset endpoint
@mi-agente-backend implement JWT refresh token logic
```

### Ejemplo de Conversación

```
Usuario:
@mi-agente-backend create an endpoint to update user profiles

Agente:
✅ Added user profile update endpoint

Changes:
- src/api/users.ts:
  + Added updateProfile() controller
  + Added validation middleware
  
- src/routes/users.ts:
  + Added PUT /users/:id route
  + Added auth middleware

Next: Test with PUT request to /api/users/:id
```

---

## 3. Iterar y Mejorar

### Editar Source of Truth

```yaml
# specs/mi-agente-backend.yml

# Añadir nuevo intent
intents:
  - "api_design"
  - "auth_implementation"
  - "endpoint_add"
  - "password_reset"  # ← Nuevo

# Añadir path glob
path_globs:
  - "src/api/**/*.ts"
  - "src/auth/**/*.ts"
  - "src/email/**/*.ts"  # ← Nuevo

# Añadir keyword
keywords:
  - "REST"
  - "JWT"
  - "authentication"
  - "password reset"  # ← Nuevo
```

### Regenerar

```
Click derecho en specs/mi-agente-backend.yml
→ "Generate Agent from Spec"
```

**Auto-sincronización:**
1. `agents/mi-agente-backend.md` actualizado
2. `.github/agents/mi-agente-backend.agent.md` sincronizado
3. Copilot detecta cambios

### Recargar (si es necesario)

```
Cmd/Ctrl + Shift + P
→ "Agent Team: Reload Agents"
```

O simplemente recarga la ventana de VS Code.

---

## 4. Ejemplo de Flujo Completo

### Escenario: Crear agente para gestión de base de datos

#### Paso 1: CREAR

```
1. Cmd/Shift+P → "Create New Agent"

2. Wizard:
   - Name: "Database Agent"
   - Description: "Manages database schemas, queries, and migrations"
   - Role: worker
   - Domain: backend
   - Subdomain: database
   
   ✅ Preset aplicado automáticamente:
   - intents: [schema_design, query_optimization, migration_create]
   - paths: [src/db/**/*.ts, migrations/**/*.sql]
   - keywords: [SQL, PostgreSQL, migration, schema]

3. Skills:
   ✓ file_edit
   ✓ file_create
   ✓ database_query
   ✓ search_codebase

4. Advanced: (default)
   - Output: short+diff
   - Context: 8 files, 8K chars
   - Delegation: No

5. ✅ Confirmar
```

**Resultado:**
```
✅ specs/database-agent.yml
✅ agents/database-agent.md
✅ .github/agents/database-agent.agent.md
```

#### Paso 2: USAR

```
@database-agent optimize the users table query
```

**Respuesta:**
```
✅ Optimized users table query

Changes:
- src/db/queries/users.ts:
  + Added index on email column
  + Optimized JOIN with profiles
  
Performance: ~80% faster on 10K rows

Recommendation: Run migration to add index in production
```

#### Paso 3: ITERAR

```yaml
# Editar specs/database-agent.yml
intents:
  - "schema_design"
  - "query_optimization"
  - "migration_create"
  - "backup_strategy"  # ← Añadido

keywords:
  - "SQL"
  - "PostgreSQL"
  - "migration"
  - "schema"
  - "backup"  # ← Añadido
```

```
Click derecho → Generate Agent from Spec
✅ Auto-sincronizado
```

#### Paso 4: VERIFICAR

```
@database-agent create backup strategy for production database
```

**Respuesta:**
```
✅ Backup strategy created

Plan:
1. Daily automated backups at 2 AM
2. Retention: 30 days
3. Weekly full backups (90 days)
4. Point-in-time recovery enabled

Next: Configure backup schedule in cron
```

---

## 5. Workflows Avanzados

### Workflow con Orchestrator

#### Setup

```
1. Crear orchestrator:
   - Name: "Test Orchestrator"
   - Role: orchestrator
   - Domain: testing
   - Delegation: router_split, max 2 handoffs
   - Allowed subagents: ["vitest-worker", "integration-tester"]

2. Crear workers:
   - vitest-worker (unit tests)
   - integration-tester (integration tests)
```

#### Uso

```
@test-orchestrator create comprehensive tests for the auth module
```

**Flujo:**
```
1. Test Orchestrator analiza:
   - Detecta: unit y integration testing needed
   
2. Delega a vitest-worker:
   - Create unit tests for auth functions
   
3. Delega a integration-tester:
   - Create integration tests for auth flow
   
4. Agrega respuestas:
   ✅ Created 12 unit tests
   ✅ Created 4 integration tests
   
   Coverage: 95%
   All tests passing ✓
```

### Workflow con Router

#### Setup

```
1. Crear router:
   - Name: "Backend Router"
   - Role: router
   - Domain: global
   - Skills: search_codebase only
   - Delegation: router_split, max 1 handoff, all agents

2. Crear workers especializados:
   - backend-api-worker (domain: backend, subdomain: api)
   - database-agent (domain: backend, subdomain: database)
   - auth-agent (domain: backend, subdomain: auth)
```

#### Uso

```
@backend-router implement a complete user registration system
```

**Flujo:**
```
1. Backend Router analiza:
   - Intents: api_design, auth_implementation, schema_design
   - Complejidad: requiere múltiples dominios
   
2. Delega a backend-api-worker:
   - Create registration endpoint
   
3. Backend-api-worker sub-delega a auth-agent:
   - Implement password hashing
   
4. Backend-api-worker sub-delega a database-agent:
   - Create users table migration
   
5. Respuesta agregada:
   ✅ Registration system implemented
   
   Components:
   - POST /api/register endpoint
   - Password hashing with bcrypt
   - Users table with email uniqueness
   
   Next: Test registration flow
```

---

## 6. Mantenimiento

### Sincronización Manual

Si los agentes no están sincronizados:

```
Cmd/Ctrl + Shift + P
→ "Agent Team: Sync Agents to .github/"
→ Opción: Clean sync (borra agentes obsoletos)
```

### Validación

Validar specs antes de generar:

```
Cmd/Ctrl + Shift + P
→ "Agent Team: Validate Agent Spec"
→ Seleccionar spec file
```

### Recargar Agentes

Después de cambios externos:

```
Cmd/Ctrl + Shift + P
→ "Agent Team: Reload Agents"
```

### Listar Agentes

Ver todos los agentes disponibles:

```
Cmd/Ctrl + Shift + P
→ "Agent Team: Select Agent"
```

---

## 7. Best Practices

### Organización de Specs

```
your-project/
├── specs/
│   ├── backend/
│   │   ├── api-worker.yml
│   │   ├── database-agent.yml
│   │   └── auth-agent.yml
│   ├── frontend/
│   │   ├── component-creator.yml
│   │   └── state-manager.yml
│   ├── testing/
│   │   ├── vitest-worker.yml
│   │   └── test-orchestrator.yml
│   └── routers/
│       ├── backend-router.yml
│       └── main-router.yml
```

### Nomenclatura

**IDs:**
- `backend-api-worker` ✅
- `database-agent` ✅
- `test-orchestrator` ✅
- `agent1` ❌

**Names:**
- "Backend API Worker" ✅
- "Database Management Agent" ✅
- "Worker" ❌

### Intents y Keywords

**Específicos:**
```yaml
intents: ["api_design", "endpoint_add", "auth_implementation"]
keywords: ["REST", "API", "endpoint", "JWT"]
```

**Evitar genéricos:**
```yaml
intents: ["do_backend_stuff"]  # ❌
keywords: ["code", "work"]     # ❌
```

### Skills Mínimos

Solo habilitar skills necesarios:

```yaml
# Worker de solo lectura
skills:
  allowed:
    - "search_codebase"  # ✅ Solo lo necesario

# Worker de edición
skills:
  allowed:
    - "file_edit"
    - "file_create"
    - "search_codebase"  # ✅ Solo lo necesario
```

### Context Discipline

```yaml
context:
  max_files: 8              # ✅ Token-safe default
  max_chars_per_file: 8000  # ✅ ~2K tokens
```

No aumentar innecesariamente:
```yaml
context:
  max_files: 50             # ❌ Muy alto
  max_chars_per_file: 100000  # ❌ Peligroso
```

---

## 8. Troubleshooting

### Agent no responde

1. Verificar sincronización:
   ```
   Cmd+Shift+P → Sync Agents to .github/
   ```

2. Recargar agentes:
   ```
   Cmd+Shift+P → Reload Agents
   ```

3. Verificar spec válido:
   ```
   Cmd+Shift+P → Validate Agent Spec
   ```

### Router delega al agente incorrecto

1. Revisar intents del agente target
2. Ajustar keywords
3. Verificar path_globs
4. Re-generar agente

### Loops de delegación

El sistema previene loops automáticamente, pero si detectas comportamiento extraño:

1. Verificar `max_handoffs`
2. Revisar `allowed_subagents`
3. Evitar delegación circular (A→B→A)

### Performance lento

1. Reducir `max_files` si es muy alto
2. Reducir `max_chars_per_file`
3. Optimizar path_globs (ser más específico)

---

## Recursos Adicionales

- [Guía del Wizard](guia-wizard.md)
- [Especificación de Agentes](especificacion-agentes.md)
- [Guía de Kits y Teams](guia-kits-y-teams.md)
- [Architecture](architecture.md)
- [Routing](routing.md)
- [Delegation](delegation.md)
