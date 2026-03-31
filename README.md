# Agent Teams

**Versión:** 1.0.0 | **Estado:** 🧪 Beta  
**Lanzamiento:** Marzo 2026

Sistema completo de gestión de agentes IA para GitHub Copilot, Claude Code, OpenCode y otros LLM frameworks, con extensión VS Code integrada. Crea, gestiona y orquesta agentes personalizados con arquitectura de kits reutilizables, perfiles configurables y un dashboard embebido de 12 páginas.

> 🎉 **v1.0.0 primera release estable!** Dashboard React embebido, sistema Kits & Teams, motor de composición y merge, Context Packs dinámicos, Skills Registry, CLI y participantes de chat dinámicos.  
> 📋 Ver el [CHANGELOG](CHANGELOG.md) para el detalle completo de cambios.

---

## 🚀 Instalación y Setup

### Requisitos Previos

- **Node.js:** ≥18.0.0
- **pnpm:** ≥8.0.0 (gestor de paquetes)
- **VS Code:** ≥1.113.0

### 1. Clonar e Instalar Dependencias

```bash
# Clonar repositorio
git clone https://github.com/egdev6/agent-teams.git
cd agent-teams

# Instalar dependencias de todo el monorepo
pnpm install
```

### 2. Desarrollo Local

Flujo recomendado (sin levantar múltiples comandos manuales):

1. Abrir la carpeta raíz del monorepo en VS Code.
2. Ir a `Run and Debug`.
3. Ejecutar **`🚀Run Extension Watch`**.
4. Esperar a que se abra la ventana de `Extension Development Host`.

Este launch hace:
- Build inicial (`core` + `webviews` + `extension`)
- Watch continuo de `extension`
- Watch continuo de `webviews`
- Sync automático de `webviews/dist` hacia `extension/dist/webviews`

### 3. Depurar la Extensión

Si cambias código del webview, cierra el panel y vuelve a abrir.  
Si cambias código del host de la extensión (`packages/extension/src`), reinicia la sesión de debug.

Para reiniciar watchers manualmente:

1. Ejecuta la tarea **`Dev: Stop Watches`**.
2. Lanza de nuevo **`🚀Run Extension Watch`**.

---

## 📋 Comandos Útiles

```bash
# Calidad y verificación
pnpm lint
pnpm typecheck
pnpm build

# Limpiar artefactos
pnpm clean

# Empaquetar extensión
pnpm -C packages/extension package
```

---

## ✅ Qué Incluye v1.0.0

### Dashboard Webview

SPA React embebida como panel de VS Code con 12 páginas navegables:

| Página | Descripción |
|---|---|
| Dashboard | Resumen de estado: equipo activo, agentes, sync y Engram |
| Profile Editor | Editar el perfil de proyecto (`.agent-teams/project.profile.yml`) |
| Team Manager | Gestionar equipos: crear, editar, listar |
| Agent Manager | Ver y gestionar agentes cargados |
| Create Agent | Wizard de creación de agentes |
| Edit Agent | Editar un agente existente |
| Create Team | Asistente de creación de equipo |
| Edit Team | Modificar un equipo y sus overrides |
| Skills Browser | Explorar el catálogo de habilidades |
| Context Packs | Gestionar packs de contexto |
| Import/Export | Importar y exportar el catálogo global |
| Agent Wizard | Wizard completo de creación paso a paso |

### Kits & Teams

- Arquitectura de tres capas: **Core** → **Kits** → **Project Profile** → **Team Profile**
- Formato de kit: `kit.yml` + directorio `agents/` con sintaxis `{{placeholder}}` + `context-packs/`
- Kit incluido: `testing-vitest` con agentes `vitest-worker` y `test-orchestrator`
- Perfiles de proyecto (`.agent-teams/project.profile.yml`): tecnologías, rutas, comandos, overrides
  - **Control de recursos empaquetados**: campo `bundled_resources` para habilitar/deshabilitar agentes y skills de bootstrap por proyecto
- Perfiles de equipo (`.agent-teams/teams/<id>.yml`): selección de kits, activar/desactivar agentes, overrides
- Validación con JSON Schema vía AJV

### Composition & Merge Engine

- `AgentComposer` — resuelve placeholders, fusiona context packs y aplica overrides
- `MergeEngine` — merge profundo con 4 estrategias: `team-priority`, `profile-priority`, `kit-priority`, `explicit-only`
- Modos de merge de arrays: `replace`, `concat`, `union`
- Tracking de conflictos: cada decisión de merge queda registrada
- Modo dry-run: calcula el diff completo de un sync sin escribir nada en disco

### Context Pack Template Engine

Variables disponibles en templates de context packs:

- Resolución: `{{project:*}}`, `{{path:*}}`, `{{command:*}}`, `{{env:*}}`, `{{kit:*}}`
- Condicionales: `{{#if condition}}`, `{{#unless}}`, `{{else}}`
- Checks de tecnología: `{{#if technology:react}}`, `{{#if env:NODE_ENV=production}}`
- Loops: `{{#each technologies}}`, `{{#each paths}}`, `{{#each commands}}`
- Includes anidados: `{{include:kit:pack}}`, `{{include:project:pack}}` (profundidad limitada)
- Filtros de texto: `{{uppercase:}}`, `{{lowercase:}}`, `{{capitalize:}}`
- Caché de resultados con invalidación manual

### Skills Registry

- Carga y valida `skills.registry.yml` contra el schema JSON
- 9 categorías: `file_operations`, `code_analysis`, `execution`, `browser`, `database`, `testing`, `documentation`, `git`, `deployment`
- Niveles de seguridad por skill
- Recomendaciones por rol: `router`, `orchestrator`, `worker`

### Comandos VS Code

| Comando | Descripción |
|---|---|
| `openDashboard` | Abre el panel webview principal |
| `initProfile` | Wizard para inicializar el perfil de proyecto |
| `createTeam` | Wizard de creación de equipo |
| `listTeams` | Navegar equipos disponibles |
| `syncTeam` | Sync de equipo a `.github/agents/` (con dry-run) |
| `browseKits` / `openKitBrowser` | Abrir el navegador de kits |
| `captureWorkspaceCatalog` | Snapshot del workspace en el catálogo global |
| `exportCatalog` / `importCatalog` | Exportar/importar catálogo a JSON |
| `setupEngram` | Configurar integración con Engram |
| `createAgent` | Abrir el wizard de creación de agentes |
| `syncAgents` | Sincronizar specs de agentes a `.github/agents/` |
| `reloadAgents` | Recargar agentes sin reiniciar VS Code |
| `selectAgent` | Quick-pick para seleccionar agente activo |
| `createFromSpec` | Generar archivo markdown de agente desde YAML |

### Participantes de Chat

- `@router` — routing inteligente por scoring normalizado (intent, path, keywords, domain)
- `@<agentId>` — un participante dinámico por cada agente cargado; se recargan automáticamente

### CLI (`agent-teams`)

```bash
agent-teams profile:init       # Inicializar perfil de proyecto
agent-teams team:create        # Crear equipo
agent-teams team:list          # Listar equipos
agent-teams team:sync          # Sync de equipo (--dry-run, --no-diff)
agent-teams agents:init        # Wizard interactivo de creación de agente
agent-teams agents:create      # Generar agente desde spec YAML
agent-teams agents:validate    # Validar specs contra schema
agent-teams agents:sync        # Sync agentes a directorio destino
agent-teams agents:watch       # Watch mode para regeneración continua
agent-teams skills             # Gestión de skills
```

---

## 📚 Documentación

- **[Documentación de usuario](https://github.com/egdev6/agent-teams-docs)** — Guías de instalación, uso y referencia de cada funcionalidad
- **[CHANGELOG](CHANGELOG.md)** — Historial completo de cambios

---

## 🤝 Contribución

```bash
# Fork y clone
git clone https://github.com/tu-usuario/agent-teams.git
cd agent-teams

# Instalar dependencias
pnpm install

# Desarrollar: ejecuta "🚀Run Extension Watch" desde Run and Debug

# Build completo antes de push
pnpm lint && pnpm typecheck && pnpm build
```

**Convenciones:**
- TypeScript strict mode en todos los paquetes
- Biome 2.x para linting y formatting
- Commits convencionales (commitlint)
- Git hooks vía Lefthook (lint + typecheck en pre-commit, build en pre-push)

---

## 📄 Licencia

Privado © 2026

---

## 🆘 Soporte

- **Issues:** [GitHub Issues](https://github.com/egdev6/agent-teams/issues)
- **Documentación:** [agent-teams-docs](https://github.com/egdev6/agent-teams-docs)

---

**¿Preguntas?** Abre un issue o consulta la [documentación completa](docs/README.md).
