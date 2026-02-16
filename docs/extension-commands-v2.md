# Guía de Comandos v2.0 de la Extensión

Guía completa para usar el sistema de Kits & Teams de Agent Team v2.0 desde VS Code.

## Inicio Rápido

### 1. Inicializar Perfil de Proyecto

**Comando:** `Agent Team: Initialize Project Profile (v2.0)`

Crea `.agent-team/project.profile.yml` con configuración específica del proyecto.

**Pasos:**
1. Abrir Paleta de Comandos (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Escribir "Agent Team: Initialize Project Profile"
3. Ingresar:
   - **Project ID** (ej., `my-web-app`)
   - **Project Name** (ej., `My Web Application`)
   - **Project Type** (frontend, backend, fullstack, library, monorepo)
   - **Technologies** (selección múltiple: typescript, react, vitest, etc.)

**Resultado:**
```
.agent-team/
└── project.profile.yml    ← ¡Creado!
```

### 2. Configurar Perfil de Proyecto

Editar `.agent-team/project.profile.yml`:

```yaml
paths:
  root: .
  src: ./src
  tests_root: ./tests
  frontend_root: ./src
  components: ./src/components

commands:
  build: pnpm build
  test: pnpm test
  dev: pnpm dev

technologies:
  typescript: true
  react: true
  vitest: true
```

### 3. Crear Perfil de Equipo

**Comando:** `Agent Team: Create Team Profile (v2.0)`

Crea un equipo con los kits seleccionados.

**Pasos:**
1. Abrir Paleta de Comandos
2. Escribir "Agent Team: Create Team"
3. Ingresar:
   - **Team ID** (ej., `minimal-testing`)
   - **Team Name** (ej., `Minimal Testing`)
   - **Description** (opcional)
   - **Kits** (selección múltiple de kits disponibles)

**Resultado:**
```
.agent-team/
├── project.profile.yml
└── teams/
    └── minimal-testing.yml    ← ¡Creado!
```

### 4. Sincronizar Equipo

**Comando:** `Agent Team: Sync Team to .github/ (v2.0)`

Compone agentes desde kits y genera en `.github/agents/`.

**Pasos:**
1. Abrir Paleta de Comandos
2. Escribir "Agent Team: Sync Team"
3. Seleccionar:
   - **Team** (de equipos disponibles)
   - **Dry Run** (Sí para previsualizar, No para generar)

**Resultado:**
```
.github/
└── agents/
    ├── vitest-worker.yml          ← ¡Generado!
    └── test-orchestrator.yml      ← ¡Generado!
```

## Todos los Comandos

### Comandos v2.0

| Comando | Descripción | Atajo |
|---------|-------------|-------|
| **Initialize Project Profile** | Crear `.agent-team/project.profile.yml` | Ninguno |
| **Create Team Profile** | Crear equipo con kits seleccionados | Ninguno |
| **List Teams** | Ver y abrir archivos de equipos | Ninguno |
| **Sync Team** | Generar agentes desde equipo | Ninguno |
| **Browse Available Kits** | Ver manifiestos de kits | Ninguno |

### Comandos v1.0 (Aún Disponibles)

| Comando | Descripción | Icono |
|---------|-------------|-------|
| **Create New Agent** | Wizard para agente personalizado | ➕ |
| **Reload Agents** | Refrescar lista de agentes | 🔄 |
| **Select Agent Manually** | Selección rápida de agente | 📋 |
| **Sync Agents to .github/** | Sincronización legacy | 🔃 |
| **Generate Agent from Spec** | Desde spec YAML | 📄 |

## Flujos de Trabajo

### Flujo 1: Nuevo Proyecto con Kit de Testing

```
1. Inicializar Perfil de Proyecto
   └─→ Configurar paths/comandos en .agent-team/project.profile.yml

2. Crear Equipo: "minimal-testing"
   └─→ Seleccionar kit: testing-vitest

3. Sincronizar Equipo
   └─→ Generar agentes en .github/agents/

4. Usar en Copilot Chat
   └─→ @vitest-worker ejecutar tests para componente Button
```

### Flujo 2: Múltiples Equipos (Mínimo vs Completo)

```
1. Inicializar Perfil de Proyecto (una vez)

2. Crear Equipo: "minimal"
   └─→ Kits: [testing-vitest]
   └─→ Habilitar solo: vitest-worker

3. Crear Equipo: "full-stack"
   └─→ Kits: [testing-vitest, frontend-react, backend-api]
   └─→ Habilitar todos los agentes

4. Cambiar entre equipos:
   └─→ Sync Team → "minimal" (para testing rápido)
   └─→ Sync Team → "full-stack" (para desarrollo completo)
```

### Flujo 3: Explorar y Navegar Kits

```
1. Browse Available Kits
   └─→ Seleccionar kit para ver manifiesto

2. Revisar kit.yml:
   - Agentes proporcionados
   - Tecnologías requeridas
   - Placeholders usados
   - Context packs

3. Añadir kit a equipo:
   - Editar team YAML
   - Añadir ID de kit a array kits
   - Sincronizar equipo
```

## Consejos

### 💡 Acciones Rápidas

**Abrir Perfil de Proyecto:**
```
Ctrl+P → .agent-team/project.profile.yml
```

**Abrir Archivo de Equipo:**
```
Paleta de Comandos → Agent Team: List Teams → Seleccionar equipo
```

**Previsualizar Cambios:**
```
Agent Team: Sync Team → Sí (Dry run)
```

### 🎯 Mejores Prácticas

1. **Un Perfil por Proyecto**
   - Inicializar perfil una vez
   - Control de versiones: `.agent-team/` en git
   - Compartir con el equipo

2. **Múltiples Equipos según Caso de Uso**
   - `minimal-testing` - Solo testing rápido
   - `full-stack` - Desarrollo completo
   - `ux-only` - Enfoque en frontend

3. **Personalizar Después de Sincronizar**
   - Agentes generados en `.github/agents/`
   - Editar para necesidades específicas del proyecto
   - Re-sincronizar sobrescribe (usar overrides en su lugar)

4. **Usar Overrides**
   - Nivel de proyecto: `project.profile.yml → overrides`
   - Nivel de equipo: `teams/{id}.yml → overrides`
   - Específico de agente: `overrides.{agent-id}`

### ⚙️ Configuración

**Estructura de Perfil de Proyecto:**
```yaml
project:
  id: my-app
  name: My App
  version: 1.0.0
  type: frontend

technologies:
  typescript: true
  vitest: true

paths:
  tests_root: ./tests      ← Usado por {{paths.tests_root}}
  src: ./src               ← Usado por {{paths.src}}

commands:
  test: pnpm test          ← Usado por {{commands.test}}

overrides:
  # Overrides a nivel de proyecto
  token_safety:
    max_files_read: 10
```

**Estructura de Perfil de Equipo:**
```yaml
id: minimal-testing
name: Minimal Testing
kits:
  - testing-vitest

agents:
  enable:                  ← Solo estos agentes
    - vitest-worker
  disable:                 ← Omitir estos agentes
    - test-orchestrator

overrides:
  # Overrides específicos del equipo
  vitest-worker:
    path_globs:
      - "tests/**/*.test.ts"
```

## Solución de Problemas

### ❌ "Project profile not found"
**Solución:** Ejecutar `Agent Team: Initialize Project Profile` primero

### ❌ "No kits available"
**Solución:** Los kits deben estar en el directorio `kits/` en la raíz de la extensión

### ❌ "Team already exists"
**Solución:** Editar el YAML del equipo existente o usar un ID de equipo diferente

### ❌ "Kit requires technology X"
**Solución:** Añadir tecnología a `project.profile.yml → technologies`

## Ejemplos

Ver `examples/project-with-kits/` para ejemplo completo:
- Perfil de proyecto con todos los campos
- Dos perfiles de equipo (minimal, full-stack)
- Context packs
- Agentes generados

## Próximos Pasos

1. ✅ Inicializar perfil de proyecto
2. ✅ Crear equipo con kits
3. ✅ Sincronizar equipo
4. Usar agentes en Copilot Chat: `@nombre-agente tu solicitud`
5. Iterar: Editar equipos, re-sincronizar, probar
6. Crear kits personalizados para tu organización
