# Guía de Kits y Teams (v2.0)

Esta guía detalla el sistema de Kits y Teams introducido en v2.0, que permite crear agentes reutilizables y configurables.

---

## Arquitectura de Tres Capas

El sistema v2.0 introduce una arquitectura de tres capas para agentes reutilizables:

### Layer 1: Core (Inmutables)
- **Ubicación:** Repositorio agent-teams
- **Contenido:** Schemas, composer, runtime, validación
- **Mantenimiento:** Actualizaciones vía `git pull`
- **Beneficio:** Base estable para todos los proyectos

### Layer 2: Kits (Reutilizables)
- **Ubicación:** Directorio `kits/`
- **Contenido:** Especificaciones de agentes con `{{placeholders}}`
- **Ejemplo:** `testing-vitest`, `frontend-react`, `backend-express`
- **Formato:** `kits/{kit-id}/kit.yml`, `agents/*.yml`, `context-packs/*.md`
- **Beneficio:** Escribe una vez, usa en todas partes

```yaml
# kits/testing-vitest/agents/vitest-worker.yml
name: Vitest Worker
path_globs:
  - "{{paths.tests_root}}/**/*.test.ts"  # ← Placeholder
commands:
  - command: "{{commands.test}}"           # ← Placeholder
```

### Layer 3: Profiles (Configurables)
- **Ubicación:** `.agent-teams/` por proyecto
- **Contenido:** Perfil de proyecto, perfiles de equipo, context packs
- **Formato:** `project.profile.yml`, `teams/{team-id}.yml`
- **Beneficio:** Configuración específica del proyecto sin hardcodear valores

```yaml
# .agent-teams/project.profile.yml
paths:
  tests_root: ./tests        # ← Resuelve {{paths.tests_root}}
commands:
  test: pnpm test            # ← Resuelve {{commands.test}}
technologies:
  vitest: true
```

---

## Flujo de Composición

```
Kit Agent (con placeholders)
  ↓
+ Project Profile (valores)
  ↓
= Placeholders resueltos
  ↓
+ Overrides (proyecto/equipo)
  ↓
= Agent Final (.github/agents/)
```

---

## Quick Start v2.0

```bash
# 1. Inicializar perfil de proyecto
agent-teams profile:init --id my-app --name "My Application" --type frontend

# 2. Configurar paths y comandos
# Editar .agent-teams/project.profile.yml

# 3. Crear equipo con kits
agent-teams team:create --id dev-team --name "Dev Team" --kits testing-vitest

# 4. Sincronizar agentes
agent-teams team:sync --team dev-team

# ✅ Agentes generados en .github/agents/
```

---

## Kits Disponibles

### testing-vitest (v1.0.0)
Kit completo de testing con Vitest, incluye:
- **vitest-worker**: Worker especializado en tests unitarios y de integración
- **test-orchestrator**: Orquestador para coordinar testing workflows

Ver [Guía de Kits](../kits/README.md) para documentación completa de kits.

---

## Context Packs Dinámicos

**Context packs con templates, variables, condicionales y loops:**

```markdown
# {{project:name}} Testing Guide

{{#if technology:vitest}}
## Vitest Testing

Run tests: `{{command:test}}`
{{include:kit:vitest-best-practices}}
{{/if}}

{{#if technology:react}}
## React Component Testing
{{include:kit:react-testing-patterns}}
{{/if}}

## Enabled Technologies
{{#each technologies}}
- {{uppercase:{{this}}}}
{{/each}}
```

### Características

- **Variables:** `{{project:*}}`, `{{path:*}}`, `{{command:*}}`, `{{env:*}}`
- **Condicionales:** `{{#if technology:react}}...{{/if}}`
- **Loops:** `{{#each technologies}}{{this}}{{/each}}`
- **Includes:** `{{include:kit:pack}}`, `{{include:project:pack}}`
- **Filtros:** `{{uppercase:text}}`, `{{lowercase:text}}`

**Beneficio:** ¡Los context packs se adaptan automáticamente a la configuración del proyecto!

Ver [Guía de Context Packs Dinámicos](dynamic-context-packs.md) para documentación completa.

---

## Beneficios del Sistema

✅ **Reutilización:** Comparte kits entre proyectos y equipos  
✅ **Mantenibilidad:** Actualiza un kit una vez, todos los proyectos se benefician  
✅ **Consistencia:** Mismo comportamiento de agentes en todas partes  
✅ **Personalización:** Override por proyecto/equipo según necesidades  
✅ **Versionado:** Bloquea versiones de kits para estabilidad  
✅ **Descubrimiento:** Explora kits y agentes disponibles

---

## Comandos VS Code v2.0

### 1. Initialize Project Profile

**Comando:** `Agent Team: Initialize Project Profile (v2.0)`

```
Cmd+Shift+P → Initialize Project Profile
  → Project ID: my-web-app
  → Name: My Web Application
  → Type: frontend
  → Technologies: ✓ typescript ✓ react ✓ vitest
  → ✅ .agent-teams/project.profile.yml created
```

### 2. Configure Profile

Edita `.agent-teams/project.profile.yml`:
```yaml
paths:
  tests_root: ./tests
  src: ./src

commands:
  test: pnpm test
  build: pnpm build

technologies:
  vitest: true
```

### 3. Create Team

**Comando:** `Agent Team: Create Team Profile (v2.0)`

```
Cmd+Shift+P → Create Team Profile
  → Team ID: minimal-testing
  → Name: Minimal Testing
  → Kits: ✓ testing-vitest
  → ✅ .agent-teams/teams/minimal-testing.yml created
```

### 4. Sync Team

**Comando:** `Agent Team: Sync Team to .github/ (v2.0)`

```
Cmd+Shift+P → Sync Team
  → Select team: minimal-testing
  → Dry run: No
  → ✅ Generated 2 agents to .github/agents/
```

### 5. Use Agents

```
@vitest-worker run tests for Button component
@test-orchestrator create integration tests for auth flow
```

### Otros Comandos v2.0

| Comando | Descripción |
|---------|-------------|
| **List Teams** | Explorar y abrir archivos de equipos |
| **Browse Available Kits** | Ver manifiestos y documentación de kits |

📚 **Guía Completa:** Ver [Comandos v2.0](extension-commands-v2.md)

---

## Ejemplo Completo

```bash
# Proyecto: E-commerce Frontend
cd my-ecommerce-app

# 1. Inicializar perfil
agent-teams profile:init \
  --id ecommerce-frontend \
  --name "E-commerce Frontend" \
  --type frontend

# 2. Configurar proyecto
cat > .agent-teams/project.profile.yml <<EOF
paths:
  src: ./src
  tests_root: ./tests
  components: ./src/components

commands:
  dev: pnpm dev
  test: pnpm test
  build: pnpm build

technologies:
  typescript: true
  react: true
  vitest: true
EOF

# 3. Crear equipo de desarrollo
agent-teams team:create \
  --id dev-team \
  --name "Development Team" \
  --kits testing-vitest

# 4. Sincronizar
agent-teams team:sync --team dev-team

# 5. Usar agentes
# En VS Code Copilot Chat:
# @vitest-worker test the ProductCard component
# @test-orchestrator create integration tests for checkout flow
```

---

## Mismo Equipo, Diferentes Proyectos

```bash
# Proyecto A - React App
cd project-A
agent-teams profile:init --id project-a --type frontend
# Editar .agent-teams/project.profile.yml con paths específicos
agent-teams team:sync --team dev-team
# ✅ Agentes adaptados al proyecto A

# Proyecto B - Vue App
cd project-B
agent-teams profile:init --id project-b --type frontend
# Editar .agent-teams/project.profile.yml con paths específicos
agent-teams team:sync --team dev-team
# ✅ Agentes adaptados al proyecto B

# Mismo kit, diferente contexto - ¡Todo funciona!
```

---

## Actualización Centralizada

```bash
# En cualquier proyecto usando agent-teams
cd my-project

# Actualizar core system
git pull agent-teams

# Re-sincronizar equipos
agent-teams team:sync --team dev-team

# ✅ Todos los proyectos obtienen las mejoras automáticamente
```

---

## Recursos Adicionales

- [Documentación de Kits](../kits/README.md)
- [Context Packs Dinámicos](dynamic-context-packs.md)
- [Arquitectura Kits & Teams](architecture-kits-teams.md)
- [Comandos de Extensión v2.0](extension-commands-v2.md)
