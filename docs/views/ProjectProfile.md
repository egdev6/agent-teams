# Project Profile

## ¿Qué es la edición de perfil de proyecto?

La edición de perfil de proyecto es la vista donde defines la configuración base que usa Agent Teams para:

- identificar el proyecto y su tipo,
- conocer tecnologías y convenciones del repositorio,
- resolver rutas y comandos reutilizables,
- activar context packs,
- y decidir a qué destinos se sincronizan los artefactos generados.

Esta configuración se guarda desde la webview mediante `saveProfile` y luego la extensión la usa para generación/sincronización.

## Flujo general de la vista

1. Al abrir la página, se solicita detección automática (`requestDetectedConfig`) y estado de context packs (`requestContextPacksState`).
2. La detección intenta completar nombre, id, tipo, tecnologías, paths y commands.
3. Puedes ajustar todo manualmente.
4. Al guardar, se envía el perfil completo (`saveProfile`) y se vuelve al dashboard.

## Campos del perfil y para qué sirve cada uno

### 1) Basic Information

#### `project.id`

- Qué es: identificador técnico del proyecto.
- Para qué sirve: clave estable para referenciar el proyecto en configuraciones y salidas generadas.
- Comportamiento en UI:
  - se normaliza automáticamente a minúsculas,
  - solo permite `a-z`, `0-9` y `-`.

#### `project.name`

- Qué es: nombre legible del proyecto.
- Para qué sirve: etiqueta principal mostrada en interfaces y usada como base de detección.
- Comportamiento en UI:
  - al detectar automáticamente, si hay `workspaceName`, lo usa como nombre.

#### `project.version`

- Qué es: versión declarativa del perfil/proyecto (ej. `1.0.0`).
- Para qué sirve: versionar metadata del proyecto y sus cambios de configuración.

#### `project.type`

- Qué es: tipo de proyecto.
- Valores permitidos: `frontend`, `backend`, `fullstack`, `monorepo`, `library`.
- Para qué sirve: orientar detección, generación y decisiones de plantillas/kits según arquitectura.

### 2) Technologies

#### `technologies[]`

- Qué es: lista de tecnologías activas (ej. `react`, `node`, `elixir`).
- Para qué sirve: adaptar recomendaciones, selección de agentes y composición de contexto.
- Comportamiento en UI:
  - se intenta autocompletar con detección,
  - puedes agregar tecnologías manualmente,
  - no se duplican,
  - se guardan normalizadas en minúsculas.

### 3) Paths

#### `paths.{key}`

- Qué es: mapa de alias de rutas del proyecto.
- Ejemplos base: `root`, `src`, `tests_root`.
- Para qué sirve: permitir que kits/plantillas resuelvan ubicaciones sin hardcodear rutas.
- Comportamiento en UI:
  - puedes editar valor y eliminar entradas,
  - puedes agregar nuevas claves,
  - si agregas una path sin valor, se guarda `.` por defecto.

### 4) Commands

#### `commands.{key}`

- Qué es: mapa de alias de comandos (ej. `build`, `test`, `dev`, `lint`).
- Para qué sirve: reutilizar comandos consistentes en flujos de generación y ejecución.
- Comportamiento en UI:
  - puedes editar valor y eliminar entradas,
  - puedes agregar nuevas claves/aliases.

### 5) Context Packs Selection

#### `context_packs[]`

- Qué es: lista de IDs de context packs activos para el proyecto.
- Para qué sirve: definir qué contexto adicional se inyecta para agentes/tareas.
- Comportamiento en UI:
  - se alimenta de packs disponibles + seleccionados,
  - permite marcar/desmarcar,
  - botón **Manage Packs** abre la vista de administración de packs.

### 6) Sync Targets

#### `sync_targets[]`

- Qué es: destinos donde se sincroniza la salida generada.
- Valores soportados:
  - `claude_code`: sincroniza `AGENTS.md` para flujos Claude Code,
  - `codex`: sincroniza `AGENTS.md` para flujos Codex,
  - `github_copilot`: sincroniza archivos en `.github/agents/*`.
- Para qué sirve: controlar qué asistentes/herramientas reciben la configuración generada.

## Valores iniciales que usa la vista

Cuando no hay perfil previo, la UI parte de estos defaults:

- `id`: `my-project`
- `name`: `My Project`
- `version`: `1.0.0`
- `type`: `fullstack`
- `technologies`: `[]`
- `paths`:
  - `root`: `.`
  - `src`: `./src`
  - `tests_root`: `./tests`
- `commands`:
  - `build`: `pnpm build`
  - `test`: `pnpm test`
  - `dev`: `pnpm dev`
- `context_packs`: `[]`
- `sync_targets`: `['claude_code', 'codex', 'github_copilot']`

## Notas prácticas

- La detección automática tiene timeout (~10s); si falla, puedes continuar manualmente.
- El guardado actual muestra estado de guardado y redirige al dashboard.
- La selección de context packs en esta vista depende del estado que entrega la extensión (`contextPacksState`).
