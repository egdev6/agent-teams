# Navegador de Kits WebView

**Kit Browser v2.0** proporciona una interfaz visual rica para explorar, navegar y gestionar kits en tu workspace.

## Resumen

El Kit Browser es un panel basado en WebView que ofrece:

- 🎨 **Explorador Visual de Kits** - Navegar kits con UI basada en tarjetas hermosas
- 🔍 **Búsqueda Inteligente** - Buscar kits por nombre, descripción o nombres de agentes
- 🏷️ **Filtros de Tecnología** - Filtrar kits por tecnologías requeridas
- 📊 **Información Detallada** - Ver detalles comprensivos del kit en panel lateral
- ⚡ **Acciones Rápidas** - Crear equipos o abrir carpetas de kit con un click
- 📱 **Diseño Responsivo** - Se adapta a diferentes tamaños de panel

## Abrir el Kit Browser

### Paleta de Comandos

1. Abrir Paleta de Comandos (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Buscar: **Agent Team: Open Kit Browser (v2.0)**
3. Presionar Enter

### Acceso Rápido

El comando también está disponible en:
- Menú de Paleta de Comandos de VS Code
- Lista de comandos de la extensión

## Interfaz de Usuario

### Vista Principal

```
╔════════════════════════════════════════════════════════════╗
║  📦 Kit Browser                                   🔄 Refresh ║
╠════════════════════════════════════════════════════════════╣
║  🔍 Buscar kits...                                         ║
║  [typescript] [react] [vitest] [playwright]    (filtros)  ║
╠═══════════════════════════╤═══════════════════════════════╣
║                           │                               ║
║  ┌──────────────────────┐ │  ┌──────────────────────────┐ ║
║  │ Testing (Vitest)     │ │  │ Frontend (React)         │ ║
║  │ testing-vitest  v1.0 │ │  │ frontend-react     v1.0  │ ║
║  │                      │ │  │                          │ ║
║  │ Setup esencial de    │ │  │ Setup desarrollo React   │ ║
║  │ testing con Vitest   │ │  │ con TypeScript          │ ║
║  │                      │ │  │                          │ ║
║  │ 👥 2 agentes         │ │  │ 👥 3 agentes             │ ║
║  │ 🛠️ 3 skills          │ │  │ 🛠️ 4 skills              │ ║
║  │                      │ │  │                          │ ║
║  │ [tester] [coverage]  │ │  │ [ui] [component] [state] │ ║
║  │                      │ │  │                          │ ║
║  │ [➕ Crear Equipo]    │ │  │ [➕ Crear Equipo]        │ ║
║  │ [👁️ Detalles]       │ │  │ [👁️ Detalles]           │ ║
║  └──────────────────────┘ │  └──────────────────────────┘ ║
║                           │                               ║
╚═══════════════════════════╧═══════════════════════════════╝
```

### Tarjetas de Kit

Cada kit se muestra como una tarjeta mostrando:

**Encabezado**
- Nombre del kit (grande, negrita)
- ID del kit (pequeño, monoespaciado)
- Badge de versión

**Cuerpo**
- Texto de descripción
- Meta información:
  - 👥 Número de agentes
  - 🛠️ Número de skills
  - ✍️ Autor (si está disponible)

**Etiquetas**
- Nombres de agentes (hasta 3 visibles)
- Indicador "+X más" para agentes adicionales

**Acciones**
- **➕ Crear Equipo** - Iniciar creación de equipo con este kit
- **👁️ Detalles** - Abrir panel de detalles

### Panel de Detalles

Se desliza desde la derecha cuando haces click en "Detalles" en un kit:

```
╔═══════════════════════════════════════╗
║  Detalles del Kit                   ✕ ║
╠═══════════════════════════════════════╣
║                                       ║
║  INFORMACIÓN BÁSICA                   ║
║  ┌─────────────────────────────────┐  ║
║  │ ID: testing-vitest              │  ║
║  │ Nombre: Testing (Vitest)        │  ║
║  │ Versión: 1.0.0                  │  ║
║  │ Autor: Agent Team               │  ║
║  │ Licencia: MIT                   │  ║
║  └─────────────────────────────────┘  ║
║                                       ║
║  DESCRIPCIÓN                          ║
║  Setup esencial de testing con Vitest ║
║  para tests unitarios, integración y  ║
║  cobertura.                           ║
║                                       ║
║  AGENTES (2)                          ║
║  • tester-vitest                      ║
║  • coverage-reporter                  ║
║                                       ║
║  SKILLS (3)                           ║
║  • run_tests                          ║
║  • analyze_coverage                   ║
║  • search_codebase                    ║
║                                       ║
║  TECNOLOGÍAS REQUERIDAS               ║
║  • vitest                             ║
║  • typescript                         ║
║                                       ║
║  ┌─────────────────────────────────┐  ║
║  │  ➕ Crear Equipo con este Kit   │  ║
║  └─────────────────────────────────┘  ║
║  ┌─────────────────────────────────┐  ║
║  │  📁 Abrir Carpeta del Kit       │  ║
║  └─────────────────────────────────┘  ║
║                                       ║
╚═══════════════════════════════════════╝
```

## Características

### Búsqueda

La caja de búsqueda filtra kits en tiempo real basándose en:
- ✅ Nombre del kit
- ✅ Descripción del kit
- ✅ ID del kit
- ✅ Nombres de agentes en el kit

**Ejemplo:**
```
Búsqueda: "test"
Resultados: testing-vitest, e2e-playwright
```

### Filtros de Tecnología

Click en chips de tecnología para filtrar kits:
- Filtros activos están resaltados
- Múltiples filtros pueden estar activos (lógica AND)
- Los filtros muestran solo kits que requieren TODAS las tecnologías seleccionadas

**Ejemplo:**
```
Filtros: [typescript] [react]
Resultados: Solo kits que requieren tanto TypeScript COMO React
```

### Refrescar

Click en el botón **🔄 Refresh** para recargar kits desde disco:
- Detecta kits recién añadidos
- Actualiza manifiestos de kit modificados
- Elimina kits borrados

### Interacción con Tarjetas

**Click en Tarjeta de Kit:**
- Selecciona el kit (borde resaltado)
- Actualmente para feedback visual

**Click en "Crear Equipo":**
- Abre wizard de creación de equipo
- Pre-sugiere el kit seleccionado
- Guía a través del setup del equipo

**Click en "Detalles":**
- Abre panel lateral con información completa del kit
- Muestra todos los agentes, skills, requisitos
- Proporciona acciones rápidas

### Acciones Rápidas en Detalles

**Crear Equipo con este Kit:**
- Inicia creación de equipo
- Kit se selecciona automáticamente
- Flujo rápido para tarea común

**Abrir Carpeta del Kit:**
- Abre directorio del kit en explorador de archivos del sistema
- Útil para inspeccionar estructura del kit
- Acceso directo a archivos del kit

## Casos de Uso

### 1. Explorar Kits Disponibles

**Escenario:** Nuevo en el proyecto, quieres ver qué kits existen

**Pasos:**
1. Abrir Kit Browser
2. Navegar tarjetas visualmente
3. Leer descripciones
4. Click en "Detalles" para más info

### 2. Encontrar Kit de Testing

**Escenario:** Necesitas configurar testing para el proyecto

**Pasos:**
1. Abrir Kit Browser
2. Escribir "test" en búsqueda
3. Revisar kits de testing
4. Click en "Crear Equipo" en el kit deseado

### 3. Filtrar por Tecnología

**Escenario:** El proyecto usa React + TypeScript, necesitas kits compatibles

**Pasos:**
1. Abrir Kit Browser
2. Click en chip de filtro `typescript`
3. Click en chip de filtro `react`
4. Navegar resultados filtrados

### 4. Aprender Contenidos del Kit

**Escenario:** Quieres saber qué agentes proporciona un kit

**Pasos:**
1. Encontrar kit en el browser
2. Click en "👁️ Detalles"
3. Revisar sección "Agentes"
4. Verificar otras secciones (skills, requisitos, etc.)

### 5. Creación Rápida de Equipo

**Escenario:** Sabes qué kit usar, quieres crear equipo rápido

**Pasos:**
1. Abrir Kit Browser
2. Encontrar kit (usar búsqueda si es necesario)
3. Click en "➕ Crear Equipo"
4. Seguir wizard (kit pre-seleccionado)

## Filosofía de Diseño

### Enfoque Visual-Primero

El Kit Browser prioriza exploración visual sobre herramientas de línea de comandos:

**Antes (CLI):**
```bash
# Listar kits
agent-team kits:list

# Ver detalles del kit
agent-team kits:show testing-vitest

# Crear equipo
agent-team team:create --kits testing-vitest
```

**Después (WebView):**
- Ver todos los kits a la vez
- Tarjetas visuales con información inline
- Acciones de un click
- Panel de detalles rico

### Divulgación Progresiva

La información se revela progresivamente:
1. **Tarjetas** - Vista rápida (nombre, descripción, conteo de agentes)
2. **Panel de Detalles** - Información completa bajo demanda
3. **Carpeta del Kit** - Detalles a nivel de archivo si es necesario

### Diseño Responsivo

La UI se adapta a diferentes tamaños de panel:
- **Paneles grandes** - Layout de grid, tarjetas lado a lado
- **Paneles medianos** - Grid de 2 columnas
- **Paneles pequeños** - Columna única, detalles de ancho completo

## Detalles Técnicos

### Arquitectura

```typescript
KitBrowserPanel (TypeScript)
  ├── createOrShow() - Patrón singleton
  ├── loadKits() - Escanear directorio de kits
  ├── _update() - Renderizar HTML
  ├── _getHtmlContent() - Generar HTML de WebView
  └── _handleMessage() - Procesar eventos de WebView

WebView (HTML/CSS/JavaScript)
  ├── renderKits() - Mostrar tarjetas de kit
  ├── renderFilters() - Chips de filtro de tecnología
  ├── filterKits() - Lógica de búsqueda y filtrado
  ├── viewDetails() - Abrir panel de detalles
  └── Paso de mensajes a extensión
```

### Comunicación WebView

**Extensión → WebView:**
- Datos iniciales del kit (JSON)
- Actualizaciones de refresh

**WebView → Extensión:**
```javascript
vscode.postMessage({
  command: 'createTeam',
  kitId: 'testing-vitest'
});

vscode.postMessage({
  command: 'viewKitFolder',
  kitId: 'testing-vitest'
});

vscode.postMessage({
  command: 'refresh'
});
```

### Carga de Kits

Los kits se cargan desde:
```
workspace-root/
  kits/
    testing-vitest/
      kit.yml          ← Cargado para manifiesto
      agents/
        tester-vitest.yml
        coverage-reporter.yml
```

### Flujo de Datos

```
1. Usuario abre Kit Browser
   ├─→ Extensión crea panel WebView
   └─→ loadKits() lee directorio kits

2. Extensión escanea kits/
   ├─→ Por cada subdirectorio
   ├─→ Leer kit.yml
   └─→ Parsear como KitManifest

3. Extensión genera HTML
   ├─→ Inyectar datos del kit como JSON
   ├─→ Configurar handlers de mensajes
   └─→ Devolver HTML completo

4. WebView renderiza UI
   ├─→ Parsear JSON del kit
   ├─→ Renderizar tarjetas
   └─→ Configurar event handlers

5. Interacciones del usuario
   ├─→ Búsqueda: Filtrado del lado del cliente
   ├─→ Filtro: Filtrado del lado del cliente
   ├─→ Detalles: Panel del lado del cliente
   └─→ Acciones: Mensaje a extensión
```

## Estilos

### Integración de Tema

El Kit Browser respeta los colores del tema de VS Code:

**Variables Usadas:**
- `--vscode-foreground` - Color de texto
- `--vscode-editor-background` - Fondo principal
- `--vscode-sideBar-background` - Fondo del panel de detalles
- `--vscode-panel-border` - Bordes
- `--vscode-button-background` - Fondos de botones
- `--vscode-badge-background` - Badges y etiquetas
- `--vscode-focusBorder` - Contornos de foco
- `--vscode-input-background` - Caja de búsqueda
- `--vscode-descriptionForeground` - Texto secundario

### Diseño de Tarjetas

```css
.kit-card {
  • Border radius: 8px
  • Padding: 20px
  • Transition: transform & box-shadow
  • Hover: efecto de elevación (transform -2px)
  • Selected: borde resaltado
}
```

### Grid Responsivo

```css
.kits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  grid-template-columns: 1fr;
}
```

## Mejores Prácticas

### 1. Refrescos Regulares

Después de modificar kits:
```
1. Editar kit.yml
2. Click en 🔄 Refresh en Kit Browser
3. Los cambios aparecen inmediatamente
```

### 2. Usar Filtros para Workspaces Grandes

Con muchos kits:
```
1. Aplicar filtros de tecnología primero
2. Luego usar búsqueda para reducir
3. Más eficiente que búsqueda sola
```

### 3. Detalles Antes de Creación

Antes de crear un equipo:
```
1. Click en "👁️ Detalles"
2. Revisar todos los agentes y skills
3. Verificar requisitos de tecnología
4. Luego click en "Crear Equipo"
```

### 4. Organizar Kits por Tecnología

Estructurar kits por tech stack:
```
kits/
  testing-vitest/       (vitest)
  testing-jest/         (jest)
  testing-playwright/   (playwright)
  frontend-react/       (react, typescript)
  frontend-vue/         (vue, typescript)
```

Habilita filtrado efectivo.

## Atajos de Teclado

Aunque el Kit Browser no tiene atajos personalizados, puedes:

**Enfocar Búsqueda:**
- Click en caja de búsqueda
- Escribir para filtrar inmediatamente

**Cerrar Panel de Detalles:**
- Click en botón ✕
- Click fuera del panel (opcional)

**Navegar Tarjetas:**
- Usar Tab para navegar botones
- Enter para activar

## Resolución de Problemas

### No Se Muestran Kits

**Causa:** El directorio de kits no existe o está vacío

**Solución:**
```bash
# Verificar directorio de kits
ls kits/

# Debe contener directorios de kit con archivos kit.yml
```

### Kit No Se Muestra Después de Creación

**Causa:** Browser no se ha refrescado

**Solución:**
1. Click en botón 🔄 Refresh
2. Nuevo kit debería aparecer

### Advertencia "Failed to load kit"

**Causa:** Formato de kit.yml inválido

**Solución:**
1. Verificar sintaxis del manifiesto del kit
2. Validar contra schema
3. Usar: `agent-team validate --kit kits/my-kit`

### Panel de Detalles No Se Abre

**Causa:** Evento de click no se registra

**Solución:**
1. Intentar hacer click en botón "Detalles" nuevamente
2. Si persiste, refrescar browser: 🔄 Refresh

### Filtros No Funcionan

**Causa:** Nombres de tecnología no coinciden

**Solución:**
- Asegurar que `requires.technologies` en kit.yml coincida con filtro
- Los nombres de tecnología son sensibles a mayúsculas
- Ejemplo: `typescript` no `TypeScript`

## Rendimiento

### Workspaces Grandes

**Optimizaciones:**
- Filtrado del lado del cliente (sin round-trips al servidor)
- Renderizado lazy (solo tarjetas visibles renderizadas inicialmente)
- Delegación de eventos (un solo listener para todas las tarjetas)

**Recomendaciones:**
- Mantener conteo de kits razonable (< 50 kits)
- Usar filtros de tecnología para reducir kits mostrados
- Archivar kits no usados a directorio separado

### Uso de Memoria

**Estado del WebView:**
- Retenido cuando está oculto (retainContextWhenHidden: true)
- No recarga al cambiar de tab
- Eficiente para uso frecuente

**Disposición:**
- Panel se dispone automáticamente cuando se cierra
- Recreado en siguiente apertura
- Sin memory leaks

## Mejoras Futuras

### Características Planificadas

1. **Comparación de Kits**
   - Seleccionar múltiples kits
   - Comparación lado a lado
   - Resaltar diferencias

2. **Templates de Kits**
   - Crear nuevos kits desde templates
   - Templates integrados para escenarios comunes
   - Soporte para templates personalizados

3. **Grafo de Dependencias**
   - Visualizar dependencias de kits
   - Mostrar qué kits requieren otros
   - Detectar dependencias circulares

4. **Analíticas de Kits**
   - Estadísticas de uso
   - Kits más populares
   - Motor de recomendaciones

5. **Edición Inline**
   - Editar manifiesto del kit en panel
   - Guardar cambios directamente
   - Validación al guardar

## Ver También

- [Documentación del Sistema de Kits](./kits-system.md)
- [Gestión de Equipos](./teams-management.md)
- [Comandos de Extensión VS Code](./extension-commands-v2.md)
- [Context Packs Dinámicos](./dynamic-context-packs.md)
