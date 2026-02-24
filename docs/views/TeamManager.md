# Team Manager

## ¿Qué es la vista de gestión de equipos?

La vista **Team Manager** es el listado operativo de equipos disponibles para el workspace.

Desde esta página puedes:

- ver todos los equipos del catálogo global,
- identificar cuál está activo,
- revisar metadata básica de cada equipo,
- navegar a edición de un equipo existente,
- y crear un equipo nuevo.

## Flujo general de la vista

1. Al abrir la página, la webview envía `refresh`.
2. La extensión responde con `updateStats`.
3. La lógica fusiona catálogo global (`globalCatalog.teams`) con detalles locales (`stats.teams`).
4. Se renderiza una card por equipo (`TeamCard`).
5. Si no hay equipos, se muestra estado vacío (`TeamEmptyState`).
6. Desde acciones puedes ir a crear (`/create-team`) o configurar (`/edit-team/:teamId`).

## Estructura de la view (components)

La composición actual sigue patrón `page + hook + components`:

- `TeamManagerPage.tsx`
  - conecta `useTeamManagerLogic` con header, listado y empty state.
- `useTeamManagerLogic.ts`
  - maneja refresh, escucha de mensajes y modelo derivado de equipos.
- `TeamManagerHeader.tsx`
  - título de la vista y acción principal **Create Team**.
- `TeamCard.tsx`
  - card por equipo con estado activo, métricas y acción **Configure**.
- `TeamEmptyState.tsx`
  - estado vacío con CTA para crear primer equipo.

## Campos y comportamiento

### 1) Fuente de datos

#### `stats` (DashboardStats)

- Qué es: estado principal recibido del host.
- Fuente:
  - `window.__INITIAL_STATE__` como bootstrap,
  - `updateStats` para sincronización posterior.

#### `teamsById`

- Qué es: mapa derivado de `stats.teams` por `team.id`.
- Para qué sirve:
  - resolver detalles locales (`description`, `enabledAgentsCount`, `enablesAllAgents`) sobre equipos globales.

#### `teams[]`

- Qué es: lista final renderizada en la vista.
- Derivación:
  - base en `stats.globalCatalog.teams`,
  - merge por ID con detalles de `teamsById`.

### 2) Estado visual por equipo

#### `isActive`

- Qué es: flag visual para badge **Active**.
- Regla:
  - `isActive = (activeTeamId === team.id)`.

#### Metadata mostrada en `TeamCard`

- `team.name`
- `team.description` (si existe)
- `team.id` (badge secundario)
- `team.enabledAgentsCount`:
  - si existe, muestra `N selected agents`,
  - si no existe, muestra `Selected agents not specified`.
- `team.enablesAllAgents`:
  - si es `true`, muestra indicador `All agents enabled`.

### 3) Navegación y acciones

#### Create Team

- Ubicación:
  - botón en header,
  - botón en empty state.
- Acción:
  - navega a `/create-team`.

#### Configure

- Ubicación:
  - botón por card de equipo.
- Acción:
  - navega a `/edit-team/:teamId`.

## Mensajería host <-> webview usada por Team Manager

### Webview -> Extension

- `refresh`

### Extension -> Webview

- `updateStats`

## Estado de la lógica (`useTeamManagerLogic`)

Estado principal:

- `stats`

Derivados:

- `teamsById`
- `teams`
- `activeTeamId`

Acciones:

- `navigate('/create-team')`
- `navigate('/edit-team/:teamId')`

## Notas prácticas

- La vista renderiza equipos del catálogo global aunque algunos detalles locales puedan no venir en `stats.teams`.
- El estado vacío depende de `teams.length` (lista final derivada).
- La actualización de datos es reactiva vía `updateStats` después del `refresh` inicial.
