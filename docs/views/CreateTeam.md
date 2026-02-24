# Create Team

## ¿Qué es la vista de creación de equipos?

La vista **Create Team** es donde defines un nuevo equipo reutilizable para agrupar agentes.

Desde esta página puedes:

- definir identidad del equipo (`teamId`, `name`, `description`),
- partir desde una plantilla existente,
- seleccionar agentes del catálogo global,
- agregar tags descriptivos,
- y crear el archivo de equipo en el workspace.

## Flujo general de la vista

1. Al abrir la página, la webview solicita datos actuales (`refresh`).
2. Se cargan desde `updateStats`:
   - equipos existentes (para validar IDs duplicados),
   - catálogo de agentes disponibles,
   - catálogo de equipos reutilizables (templates).
3. Opcionalmente seleccionas una plantilla (`loadTeamTemplate`) para precargar campos.
4. Ajustas información básica, miembros y tags.
5. Al crear, se valida el payload y se envía `createTeam`.
6. Si la extensión responde éxito (`createTeamResult.success`), navega a `team-manager`.

## Estructura de la view (components)

La composición actual sigue patrón `page + hook + components`:

- `CreateTeamPage.tsx`
  - conecta `useCreateTeamLogic` y layout general.
- `CreateTeamHeader.tsx`
  - navegación back y contexto visual de la vista.
- `TeamBasicsCard.tsx`
  - plantilla, campos base y tags.
- `TeamMembersCard.tsx`
  - selección de agentes del catálogo.
- `TeamSummaryCard.tsx`
  - preview del equipo y miembros seleccionados.
- `CreateTeamActions.tsx`
  - CTA de creación, descarte y errores.

## Campos y comportamiento

### 1) Basic Information

#### `teamId`

- Qué es: identificador técnico del equipo.
- Fuente/derivación:
  - se autogenera desde `name` mientras no haya edición manual (`teamIdTouched = false`),
  - siempre se normaliza vía `slugify` (`a-z`, `0-9`, `-`).
- Validaciones:
  - requerido,
  - regex `^[a-z0-9-]+$`,
  - no debe existir en `stats.teams`.

#### `name`

- Qué es: nombre visible del equipo.
- Validación: requerido para habilitar creación (`canCreate`).

#### `description`

- Qué es: descripción funcional del propósito del equipo.
- Es opcional.

#### `templateTeamId` (Reusable Team Template)

- Qué es: id del template seleccionado desde `globalCatalog.teams`.
- Comportamiento:
  - al seleccionar, envía `loadTeamTemplate`,
  - si llega `teamTemplate`, precarga `name`, `description`, `agents`, `tags`,
  - recalcula `teamId` único con `toUniqueTeamId(...)`.

#### `tags[]`

- Qué es: etiquetas de clasificación del equipo.
- Comportamiento:
  - input temporal `tagInput`,
  - `addTag` agrega únicos (trim + dedupe),
  - `removeTag` elimina por valor.

### 2) Team Members

#### `selectedAgents[]`

- Qué es: IDs de agentes que quedarán habilitados para el equipo.
- Fuente:
  - opciones desde `availableAgents = stats.globalCatalog.agents`.
- Comportamiento:
  - toggle por card (`toggleAgent`),
  - navegación rápida a `/create-agent` desde “Create Agent”.

### 3) Summary

La tarjeta de resumen refleja en tiempo real:

- nombre actual (`name` o fallback `Unnamed Team`),
- descripción,
- conteo de agentes seleccionados,
- badges de miembros resueltos por `availableAgents`.

### 4) Actions

#### Crear equipo

- Botón habilitado cuando `canCreate = teamId.trim() && name.trim()`.
- Acción:
  - ejecuta validaciones completas en `handleCreate`,
  - envía `createTeam` con:
    - `teamId`,
    - `name`,
    - `description`,
    - `agents` (solo si hay selección),
    - `tags` (solo si hay tags).

#### Discard

- Vuelve al paso anterior (`navigate(-1)`).

#### `createError`

- Muestra errores de validación local o de respuesta de extensión (`createTeamResult.error`).

## Mensajería host <-> webview usada por Create Team

### Webview -> Extension

- `refresh`
- `loadTeamTemplate`
- `createTeam`

### Extension -> Webview

- `updateStats`
- `teamTemplate`
- `teamTemplateError`
- `createTeamResult`

## Estado de la lógica (`useCreateTeamLogic`)

Estado principal:

- `stats`
- `teamId`, `teamIdTouched`
- `name`, `description`
- `selectedAgents`
- `templateTeamId`
- `tagInput`, `tags`
- `createError`

Derivados:

- `availableAgents`
- `availableTeamTemplates`
- `existingTeamIds`
- `canCreate`

## Notas prácticas

- El `teamId` se mantiene estable después de primera edición manual.
- Al aplicar template, se evita colisión de IDs con sufijos (`-copy`, `-copy-2`, ...).
- La vista depende de `updateStats`; sin refresh no habrá catálogo actualizado.
