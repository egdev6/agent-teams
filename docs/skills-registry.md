# Registro de Skills

**Skills Registry v2.0** proporciona gestión centralizada de skills con validación, detección de conflictos y recomendaciones inteligentes.

## Resumen

El Skills Registry es un sistema integral para:

- ✅ **Validar Skills** - Asegurar que los agentes solo usen skills apropiadas para su rol
- 🚫 **Detección de Conflictos** - Prevenir que skills incompatibles se combinen
- 🎯 **Recomendaciones Inteligentes** - Sugerir skills basadas en dominio y tecnologías
- 🔒 **Clasificación de Seguridad** - Rastrear niveles de riesgo para cada skill
- 📦 **Skills Implícitas** - Añadir automáticamente skills dependientes
- 📚 **Documentación Centralizada** - Fuente única de verdad para todas las skills

## Arquitectura

```
skills.registry.yml          # Base de datos central de skills
│
├── schemas/
│   └── skills.registry.schema.json  # JSON Schema para validación
│
├── extension/src/
│   └── skillsRegistry.ts    # Implementación TypeScript
│
└── tools/
    └── skills-commands.ts   # Comandos CLI
```

## Formato del Skills Registry

### Estructura del Registro

```yaml
version: 1.0.0

skills:
  skill_id:
    id: skill_id                    # Identificador único
    name: Nombre Legible            # Nombre a mostrar
    description: Descripción detallada
    category: file_operations       # Categoría de skill
    requires_role: [worker]         # Roles permitidos
    requires_technologies: [docker] # Dependencias tecnológicas
    conflicts_with: [read_only]     # Skills incompatibles
    implies: [file_edit]            # Skills auto-añadidas
    security_level: elevated        # Nivel de riesgo
    examples:                       # Ejemplos de uso
      - "Ejemplo de uso 1"
      - "Ejemplo de uso 2"
    documentation_url: https://...  # Link a docs
    deprecated: false               # Flag de deprecación
    deprecated_by: new_skill_id     # Skill de reemplazo
```

### Categorías

| Categoría | Descripción | Ejemplos |
|-----------|-------------|----------|
| `file_operations` | Manipulación del sistema de archivos | file_edit, file_create, file_delete |
| `code_analysis` | Inspección y búsqueda de código | search_codebase, code_review |
| `execution` | Ejecutar comandos/scripts | run_terminal |
| `browser` | Interacción con navegador | browser_preview, browser_test |
| `database` | Operaciones de base de datos | database_query, database_migrate |
| `testing` | Ejecución de tests | run_tests, analyze_coverage |
| `documentation` | Generación de documentación | generate_docs, update_changelog |
| `git` | Control de versiones | git_commit, git_branch, git_merge |
| `deployment` | Operaciones de deployment | deploy, docker_build, docker_run |

### Niveles de Seguridad

| Nivel | Icono | Descripción | Ejemplos |
|-------|------|-------------|----------|
| `safe` | ⚪ | Solo lectura, sin efectos secundarios | search_codebase, code_review |
| `moderate` | 🟢 | Operaciones de escritura limitadas | file_edit, file_create |
| `elevated` | 🟡 | Cambios significativos | file_delete, database_query |
| `critical` | 🔴 | Operaciones de alto impacto | run_terminal, deploy, database_migrate |

### Requerimientos de Rol

```yaml
requires_role: [worker, orchestrator, router]
```

- **worker** - Skills para ejecución de tareas
- **orchestrator** - Skills para delegación y coordinación
- **router** - Skills para detección de intención y enrutamiento

### Requerimientos de Tecnología

```yaml
requires_technologies: [vitest, jest, playwright]
```

Skills que dependen de tecnologías específicas. El wizard no sugerirá estas skills a menos que el proyecto incluya las tecnologías requeridas.

### Conflictos e Implicaciones

```yaml
# Conflictos - skills mutuamente excluyentes
conflicts_with: [file_delete, run_terminal]

# Implicaciones - añadir automáticamente skills dependientes
implies: [search_codebase, file_edit]
```

**Ejemplo:**
```yaml
run_tests:
  conflicts_with: [run_terminal]  # Usar run_tests, no terminal genérico
  implies: [analyze_coverage]     # Tests implican análisis de cobertura
```

### Deprecación

```yaml
deprecated: true
deprecated_by: new_skill_id  # Skill de reemplazo
```

Marca skills que están deprecadas con sugerencias opcionales de reemplazo.

## API TypeScript

### Clase SkillsRegistry

```typescript
import { SkillsRegistry, AgentRole } from './skillsRegistry';
import { Logger } from './logger';

const registry = new SkillsRegistry(logger);

// Cargar registro
await registry.load('skills.registry.yml');

// Obtener definición de skill
const skill = registry.getSkill('run_tests');

// Obtener todas las skills
const allSkills = registry.getAllSkills();

// Filtrar por categoría
const testingSkills = registry.getByCategory('testing');

// Filtrar por rol
const workerSkills = registry.getByRole('worker');

// Obtener skills deprecadas
const deprecated = registry.getDeprecated();
```

### Validación

```typescript
const validation = registry.validateSkills(
  ['file_edit', 'run_tests'],  // Skills a validar
  'worker',                     // Rol del agente
  ['vitest', 'react']           // Tecnologías del proyecto
);

if (!validation.valid) {
  console.error(validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn(validation.warnings);
}
```

**Verificaciones de validación:**
- ✅ Todas las skills existen
- ✅ Skills permitidas para el rol
- ✅ Tecnologías requeridas presentes
- ✅ No hay skills en conflicto
- ⚠️ Advertencias de skills deprecadas
- ⚠️ Advertencias de nivel de seguridad

### Detección de Conflictos

```typescript
const conflicts = registry.detectConflicts([
  'run_terminal',
  'run_tests'  // Conflicto con run_terminal
]);

// Devuelve: ["'run_tests' conflicts with 'run_terminal'"]
```

### Skills Implícitas

```typescript
const implied = registry.getImpliedSkills([
  'run_tests'  // Implica analyze_coverage
]);

// Devuelve: ['analyze_coverage']
```

### Recomendaciones Inteligentes

```typescript
const recommendations = registry.getRecommendations(
  'testing',              // Dominio
  'worker',               // Rol
  ['vitest', 'playwright'] // Tecnologías
);

// Devuelve:
// [
//   {
//     skill_id: 'run_tests',
//     reason: 'El dominio de testing requiere ejecución de tests',
//     priority: 'high'
//   },
//   {
//     skill_id: 'analyze_coverage',
//     reason: 'El análisis de cobertura es esencial para testing',
//     priority: 'medium'
//   }
// ]
```

## Comandos CLI

### skills:list

Listar todas las skills disponibles.

```bash
# Listar todas las skills
agent-team skills:list

# Filtrar por categoría
agent-team skills:list --category=testing

# Filtrar por rol
agent-team skills:list --role=worker

# Filtrar por nivel de seguridad
agent-team skills:list --security=elevated

# Combinar filtros
agent-team skills:list --category=database --role=worker
```

**Salida:**
```
📋 Skills Registry v1.0.0
Encontradas 8 skill(s)

╔════════════════════════════════════════════════════════════════╗
║  TESTING                                                       ║
╚════════════════════════════════════════════════════════════════╝

  🟢 run_tests
     Run Tests
     Ejecutar suite de tests con runner especializado
     Roles: worker
     Requiere: vitest, jest, playwright, cypress

  ⚪ analyze_coverage
     Analyze Coverage
     Analizar reportes de cobertura de tests
     Roles: worker, orchestrator
     Requiere: vitest, jest
```

### skills:show

Mostrar información detallada sobre una skill específica.

```bash
agent-team skills:show run_tests
```

**Salida:**
```
╔════════════════════════════════════════════════════════════════╗
║  RUN TESTS                                                     ║
╚════════════════════════════════════════════════════════════════╝

ID: run_tests
Categoría: testing
Nivel de Seguridad: moderate

Descripción:
  Ejecutar suite de tests con runner especializado

Roles Requeridos:
  worker

Tecnologías Requeridas:
  vitest, jest, playwright, cypress

Conflictos Con:
  run_terminal

Skills Implícitas:
  analyze_coverage

Ejemplos:
  • Ejecutar tests unitarios
  • Ejecutar tests de integración
  • Generar reporte de cobertura
```

### skills:validate

Validar skills en un archivo de agente.

```bash
# Validar skills del agente
agent-team skills:validate agents/tester-vitest.agent.md

# Validar archivo de spec
agent-team skills:validate specs/backend.yml
```

**Salida:**
```
🔍 Validando agente: Tester (Vitest)
   Rol: worker
   Skills: 3

✅ ¡Validación exitosa!

Advertencias:
  ⚠️  Skill 'run_terminal' tiene nivel de seguridad crítico - usar con precaución

ℹ️  Skills implícitas sugeridas:
  • analyze_coverage
```

### skills:recommend

Obtener recomendaciones de skills para un dominio y rol.

```bash
# Recomendaciones básicas
agent-team skills:recommend --domain=testing --role=worker

# Con tecnologías
agent-team skills:recommend \
  --domain=backend \
  --role=worker \
  --tech=prisma,postgresql

# Ejemplo frontend
agent-team skills:recommend \
  --domain=frontend \
  --role=worker \
  --tech=react,vite
```

**Salida:**
```
💡 Recomendaciones de Skills
   Dominio: testing
   Rol: worker
   Tecnologías: vitest, playwright

Encontradas 5 recomendación(es):

🔥 PRIORIDAD ALTA:

  • run_tests
    Run Tests - Ejecutar suite de tests con runner especializado
    Razón: El dominio de testing requiere ejecución de tests

  • search_codebase
    Search Codebase - Buscar y analizar código en el workspace
    Razón: La búsqueda de código es esencial para workers

⭐ PRIORIDAD MEDIA:

  • analyze_coverage
    Analyze Coverage - Analizar reportes de cobertura de tests
    Razón: El análisis de cobertura es esencial para testing

  • browser_test
    Browser Test - Ejecutar tests basados en navegador (E2E)
    Razón: El testing E2E es importante para UI
```

## Integración con VS Code

### Wizard Interactivo

El skills registry está integrado en el wizard de creación de agentes de VS Code:

1. **Selección Inteligente de Skills**
   - Solo muestra skills válidas para el rol seleccionado
   - Pre-selecciona skills recomendadas basadas en el dominio
   - Muestra indicadores de seguridad (🟢 🟡 🔴)
   - Muestra advertencias de deprecación (⚠️)

2. **Validación en Tiempo Real**
   - Valida skills mientras las seleccionas
   - Muestra errores para combinaciones inválidas
   - Advierte sobre implicaciones de seguridad
   - Sugiere skills implícitas

3. **Adición Automática de Skills**
   - Ofrece añadir skills implícitas automáticamente
   - Ejemplo: Seleccionar `run_tests` ofrece añadir `analyze_coverage`

### Ejemplo de Flujo del Wizard

```
Paso 6/9: Seleccionar Skills

🛠️ Worker Skills (Skills recomendadas están pre-seleccionadas)

[✓] file_edit        🟢 Editar archivos existentes
[✓] file_create      🟢 Crear nuevos archivos
[✓] search_codebase  ⚪ Buscar en el código base
[✓] run_tests        🟢 Ejecutar suite de tests
[ ] run_terminal     🔴 Ejecutar comandos de terminal
[ ] file_delete      🟡 Eliminar archivos
[ ] database_query   🟡 Ejecutar queries de base de datos

→ Seleccionadas: 4 skills

⚠️ Advertencias de skills:
  • Skill 'run_tests' requiere tecnologías: vitest, jest, playwright, cypress
  
¿Proceder de todos modos? [Sí] [No]

ℹ️ Las skills seleccionadas implican: analyze_coverage

¿Añadir estas automáticamente? [Sí] [No]
```

## Mejores Prácticas

### 1. Comenzar con Recomendaciones

Siempre verificar recomendaciones antes de seleccionar skills manualmente:

```bash
agent-team skills:recommend --domain=testing --role=worker
```

### 2. Validar Temprano

Validar skills del agente antes del deployment:

```bash
agent-team skills:validate agents/my-agent.agent.md
```

### 3. Revisar Niveles de Seguridad

Prestar atención a los indicadores de seguridad:
- ⚪ Safe - Usar libremente
- 🟢 Moderate - Seguro para la mayoría de casos
- 🟡 Elevated - Revisar cuidadosamente
- 🔴 Critical - Usar con extrema precaución

### 4. Manejar Deprecación

Reemplazar skills deprecadas prontamente:

```bash
agent-team skills:show old_skill  # Verificar campo deprecated_by
```

### 5. Usar Skills Implícitas

Dejar que el sistema añada skills implícitas automáticamente para evitar dependencias faltantes.

### 6. Evitar Conflictos

Verificar conflictos antes de combinar skills:

```typescript
const conflicts = registry.detectConflicts(['run_terminal', 'run_tests']);
```

## Categorías de Skills

### Operaciones de Archivos

| Skill | Nivel | Descripción |
|-------|-------|-------------|
| `file_edit` | 🟢 Moderate | Editar archivos existentes |
| `file_create` | 🟢 Moderate | Crear nuevos archivos |
| `file_delete` | 🟡 Elevated | Eliminar archivos |
| `file_rename` | 🟢 Moderate | Renombrar/mover archivos |

### Análisis de Código

| Skill | Nivel | Descripción |
|-------|-------|-------------|
| `search_codebase` | ⚪ Safe | Buscar en el código base |
| `code_review` | ⚪ Safe | Revisar calidad de código |
| `performance_profile` | 🟢 Moderate | Analizar rendimiento |
| `security_audit` | ⚪ Safe | Auditoría de seguridad |

### Ejecución

| Skill | Nivel | Descripción |
|-------|-------|-------------|
| `run_terminal` | 🔴 Critical | Ejecutar comandos de terminal |

### Testing

| Skill | Nivel | Descripción |
|-------|-------|-------------|
| `run_tests` | 🟢 Moderate | Ejecutar suite de tests |
| `analyze_coverage` | ⚪ Safe | Analizar cobertura de tests |

### Navegador

| Skill | Nivel | Descripción |
|-------|-------|-------------|
| `browser_preview` | 🟢 Moderate | Vista previa en navegador |
| `browser_test` | 🟢 Moderate | Ejecutar tests E2E |

### Base de Datos

| Skill | Nivel | Descripción |
|-------|-------|-------------|
| `database_query` | 🟡 Elevated | Ejecutar queries |
| `database_migrate` | 🔴 Critical | Ejecutar migraciones |

### Documentación

| Skill | Nivel | Descripción |
|-------|-------|-------------|
| `generate_docs` | ⚪ Safe | Generar documentación |
| `update_changelog` | ⚪ Safe | Actualizar changelog |
| `api_design` | ⚪ Safe | Diseñar APIs |

### Git

| Skill | Nivel | Descripción |
|-------|-------|-------------|
| `git_commit` | 🟡 Elevated | Crear commits |
| `git_branch` | 🟢 Moderate | Gestionar ramas |
| `git_merge` | 🟡 Elevated | Fusionar ramas |

### Deployment

| Skill | Nivel | Descripción |
|-------|-------|-------------|
| `deploy` | 🔴 Critical | Desplegar aplicación |
| `docker_build` | 🟡 Elevated | Construir imágenes Docker |
| `docker_run` | 🟡 Elevated | Ejecutar contenedores Docker |

## Ejemplos

### Ejemplo 1: Agente de Testing

**Dominio:** testing  
**Rol:** worker  
**Tecnologías:** vitest, playwright

**Skills Recomendadas:**
```yaml
allowed_skills:
  - file_edit          # Editar archivos de tests
  - file_create        # Crear nuevos tests
  - search_codebase    # Encontrar código a testear
  - run_tests          # Ejecutar tests
  - analyze_coverage   # Verificar cobertura
  - browser_test       # Testing E2E
```

### Ejemplo 2: Agente de API Backend

**Dominio:** backend  
**Rol:** worker  
**Tecnologías:** prisma, postgresql

**Skills Recomendadas:**
```yaml
allowed_skills:
  - file_edit          # Editar código de API
  - file_create        # Crear nuevos endpoints
  - search_codebase    # Navegar código base
  - api_design         # Diseñar APIs
  - database_query     # Consultar base de datos
  - database_migrate   # Ejecutar migraciones
  - run_tests          # Testear API
```

### Ejemplo 3: Agente de Documentación

**Dominio:** documentation  
**Rol:** worker

**Skills Recomendadas:**
```yaml
allowed_skills:
  - file_edit          # Editar docs
  - file_create        # Crear docs
  - search_codebase    # Entender código
  - generate_docs      # Auto-generar docs
  - update_changelog   # Actualizar changelog
```

## Extender el Registro

### Añadir una Nueva Skill

1. **Actualizar skills.registry.yml:**

```yaml
my_new_skill:
  id: my_new_skill
  name: Mi Nueva Skill
  description: Qué hace esta skill
  category: file_operations
  requires_role: [worker]
  security_level: moderate
  examples:
    - "Ejemplo de uso"
```

2. **Validar el registro:**

```bash
# La validación del schema ocurre automáticamente al cargar
```

3. **Testear la skill:**

```bash
agent-team skills:show my_new_skill
agent-team skills:list --category=file_operations
```

### Añadir Relaciones de Skills

```yaml
new_parent_skill:
  implies: [dependent_skill_1, dependent_skill_2]
  conflicts_with: [incompatible_skill]
```

## Resolución de Problemas

### Problemas Comunes

**Problema:** Skills no aparecen en el wizard

```bash
# Verificar si el registro está cargado
cat .agent-team/project-profile.yml  # Debe existir
ls skills.registry.yml               # Debe existir en raíz del workspace
```

**Problema:** Validación fallando

```bash
# Verificar detalles de la skill
agent-team skills:show problematic_skill

# Validar archivo del agente
agent-team skills:validate agents/my-agent.agent.md
```

**Problema:** Conflictos detectados

```bash
# Verificar qué skills están en conflicto
agent-team skills:show skill_1  # Verificar campo conflicts_with
agent-team skills:show skill_2
```

## Guía de Migración

### De Skills Hardcodeadas al Registro

**Antes (v1.x):**
```typescript
const skills = ['file_edit', 'search_codebase'];
// Sin validación, sin recomendaciones
```

**Después (v2.0+):**
```typescript
const registry = new SkillsRegistry(logger);
await registry.load('skills.registry.yml');

// Obtener recomendaciones
const recommendations = registry.getRecommendations('testing', 'worker');

// Validar
const validation = registry.validateSkills(skills, 'worker');
```

## Ver También

- [Documentación del Schema de Agente](./agent-schema.md)
- [Sistema de Kits](./kits-system.md)
- [Context Packs Dinámicos](./dynamic-context-packs.md)
- [Comandos de Extensión VS Code](./extension-commands-v2.md)
