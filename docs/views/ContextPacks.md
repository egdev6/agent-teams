# Context Packs

## ¿Qué es la vista de context packs?

La vista **Context Packs** permite gestionar los packs de contexto activos del proyecto.

Desde esta página puedes:

- consultar packs disponibles y seleccionados,
- activar/desactivar packs para el proyecto,
- crear nuevos packs markdown por ID,
- persistir la selección activa en la configuración del workspace.

## Flujo general de la vista

1. Al abrir la página, se solicita estado al host (`requestContextPacksState`).
2. La extensión responde con `contextPacksState` (disponibles + seleccionados).
3. Puedes alternar selección de packs existentes.
4. Puedes crear un pack nuevo (`createContextPack`) desde el input.
5. Al guardar, se envía `saveContextPacks`.
6. La vista actualiza estado con mensajes `contextPacksSaved` o `contextPacksError`.

## Estructura de la view (components)

La composición actual sigue patrón `page + hook + component`:

- `ContextPacksPage.tsx`
  - conecta `useContextPacksLogic` con el layout de la página.
- `ContextPacksCard.tsx`
  - renderiza toda la UI funcional (estado, lista, creación y guardado).

## Campos y comportamiento

### 1) Estado de packs

#### `availablePacks[]`

- Qué es: packs detectados en el workspace.
- Fuente: mensaje `contextPacksState.availablePacks`.

#### `selectedPacks[]`

- Qué es: packs activos para el proyecto.
- Fuente: mensaje `contextPacksState.selectedPacks`.
- Comportamiento:
  - `togglePack(packId)` agrega o quita selección.

#### `allPacks[]`

- Qué es: unión de disponibles + seleccionados.
- Comportamiento:
  - se calcula con `Set` para dedupe,
  - orden alfabético para render estable.

### 2) Creación de packs

#### `newPackName`

- Qué es: input temporal para crear un nuevo pack.

#### `normalizePackId(value)`

- Qué hace:
  - minúsculas,
  - trim,
  - reemplaza caracteres inválidos por `-`,
  - limpia guiones al inicio/fin.

#### `createPack()`

- Acción:
  - valida ID normalizado no vacío,
  - envía `createContextPack`,
  - agrega el pack a `selectedPacks` localmente,
  - limpia input,
  - setea status de creación,
  - ejecuta `refresh()` para sincronizar estado real.

### 3) Guardado de selección

#### `saveSelection()`

- Acción:
  - limpia timeout anterior,
  - activa `isSaving`,
  - limpia `error`/`status`,
  - envía `saveContextPacks` con `selectedPacks`.

#### Timeout de guardado

- `SAVE_TIMEOUT_MS = 12000`.
- Si no llega respuesta a tiempo:
  - desactiva `isSaving`,
  - muestra error de timeout.

### 4) Estados de feedback

#### `status`

- Mensajes de éxito/estado:
  - guardado (`contextPacksSaved`),
  - pack creado (UI local),
  - carpeta abierta (`contextPacksOpened`).

#### `error`

- Mensajes de error:
  - respuesta de host (`contextPacksError`),
  - timeout de guardado.

## Mensajería host <-> webview usada por Context Packs

### Webview -> Extension

- `requestContextPacksState`
- `createContextPack`
- `saveContextPacks`
- `openContextPacksFolder`

### Extension -> Webview

- `contextPacksState`
- `contextPacksSaved`
- `contextPacksError`
- `contextPacksOpened`

## Estado de la lógica (`useContextPacksLogic`)

Estado principal:

- `availablePacks`
- `selectedPacks`
- `newPackName`
- `error`
- `status`
- `isSaving`

Derivados:

- `allPacks`

Acciones:

- `refresh`
- `togglePack`
- `createPack`
- `openFolder`
- `saveSelection`

## Notas prácticas

- La UI permite crear y seleccionar en el mismo flujo sin salir de la página.
- `allPacks` evita inconsistencias visuales cuando un pack está seleccionado pero aún no aparece en `availablePacks`.
- El guardado tiene protección por timeout para evitar estado de loading indefinido.
