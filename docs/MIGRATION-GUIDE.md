# Agent Teams - Guía de Migración v2.0 → v2.1

**Estado:** 🚧 En progreso  
**Fecha inicio:** Febrero 2026  
**Branch:** `feature/architecture-v2.1`

---

## 📋 Resumen de Cambios

### Arquitectura
- ✅ Monorepo formal con PNPM workspaces
- ✅ Separación clara: Extension vs CLI
- ✅ Biome (lint + format) reemplaza ESLint + Prettier
- ✅ Lefthook para git hooks
- 🚧 React Router para navegación
- 🚧 Tailwind CSS + shadcn/ui
- 🚧 React 19
- 🚧 Sistema de comandos modular

### Estructura Nueva

```
agent-teams/ (monorepo root)
├── packages/
│   └── cli/                    # CLI separado
├── extension/                  # VSCode Extension
│   ├── src/
│   │   ├── commands/          # Sistema modular
│   │   ├── panels/            # WebView panels
│   │   └── core/              # Business logic
│   └── webviews/              # React UI
│       ├── src/
│       │   ├── pages/         # React Router pages
│       │   ├── components/    # UI components
│       │   └── lib/           # Utils
│       ├── tailwind.config.js
│       └── package.json
├── biome.json                 # Lint + format
├── lefthook.yml               # Git hooks
└── pnpm-workspace.yaml        # Workspaces
```

---

## ✅ Fase 0: Setup Monorepo (COMPLETADA)

### Archivos Creados
- ✅ `pnpm-workspace.yaml` - Configuración de workspaces
- ✅ `biome.json` - Lint + format unificado
- ✅ `lefthook.yml` - Git hooks automatizados
- ✅ `commitlint.config.js` - Validación de commits
- ✅ `.vscode/settings.json` - Configuración de VSCode
- ✅ `.vscode/extensions.json` - Extensiones recomendadas

### Package.json Actualizado
```bash
# Nuevos scripts disponibles
pnpm check          # Lint + format con Biome
pnpm typecheck      # Type checking sin build
pnpm build          # Build recursivo
pnpm dev            # Dev mode (extension + webviews)
```

### CLI Separado
- ✅ Estructura creada en `packages/cli/`
- ⏳ Pendiente: Migrar tools existentes

### Próximos Pasos
```bash
# 1. Instalar nuevas dependencias
pnpm install

# 2. Instalar git hooks
pnpm prepare

# 3. Ejecutar Biome en todo el proyecto
pnpm check

# 4. Commit inicial de la migración
git add .
git commit -m "feat(config): setup monorepo with biome and lefthook"
```

---

## 🚧 Fase 1: Webviews Base (EN PROGRESO)

### Objetivo
Modernizar la base de React con Tailwind y Lucide Icons

### Tareas
- [ ] Instalar dependencias webviews
  ```bash
  cd extension/webviews
  pnpm add -D tailwindcss postcss autoprefixer
  pnpm add lucide-react clsx tailwind-merge
  ```

- [ ] Configurar Tailwind
  - [ ] `tailwind.config.js`
  - [ ] `postcss.config.js`
  - [ ] CSS variables de VSCode

- [ ] Migrar estilos inline
  - [ ] Loading state
  - [ ] Dashboard
  - [ ] ProfileEditor

- [ ] Integrar Lucide Icons
  - [ ] Reemplazar emojis por iconos
  - [ ] Crear componente Icon wrapper

### Archivos a Modificar
- `extension/webviews/src/dashboard.tsx`
- `extension/webviews/src/views/Dashboard.tsx`
- `extension/webviews/src/views/ProfileEditor.tsx`
- `extension/webviews/src/components/*.tsx`

---

## 📅 Fase 2: shadcn/ui + Componentes (PENDIENTE)

### Objetivo
Implementar sistema de componentes consistente

### Tareas
- [ ] Setup shadcn/ui
  ```bash
  npx shadcn-ui@latest init
  ```

- [ ] Instalar componentes base
  - [ ] Button
  - [ ] Card
  - [ ] Dialog
  - [ ] Input
  - [ ] Select
  - [ ] Badge
  - [ ] Separator

- [ ] Migrar componentes existentes
  - [ ] Button.tsx → shadcn Button
  - [ ] StatCard.tsx → shadcn Card
  - [ ] Badge.tsx → shadcn Badge

- [ ] Crear componentes nuevos
  - [ ] CommandPalette
  - [ ] AgentCard
  - [ ] KitCard

---

## 📅 Fase 3: React Router (PENDIENTE)

### Objetivo
Implementar navegación declarativa

### Tareas
- [ ] Instalar React Router
  ```bash
  pnpm add react-router-dom
  ```

- [ ] Crear estructura de rutas
  - [ ] `routes/index.tsx`
  - [ ] Memory Router setup

- [ ] Convertir views a pages
  - [ ] `/` → Dashboard
  - [ ] `/profile-editor` → ProfileEditor
  - [ ] `/kit-browser` → KitBrowser (nuevo)
  - [ ] `/team-manager` → TeamManager (nuevo)

- [ ] Implementar navegación
  - [ ] useNavigate hook
  - [ ] Link components
  - [ ] Breadcrumbs

---

## 📅 Fase 4: Arquitectura Comandos (PENDIENTE)

### Objetivo
Sistema de comandos modular y extensible

### Tareas
- [ ] Crear estructura base
  - [ ] `Command.ts` abstract class
  - [ ] `CommandRegistry.ts`

- [ ] Migrar comandos existentes
  - [ ] Project commands
  - [ ] Agent commands
  - [ ] Team commands
  - [ ] Kit commands

- [ ] Refactorizar `extension.ts`
  - [ ] Usar CommandRegistry
  - [ ] Simplificar activation

---

## 📅 Fase 5: React 19 + Optimización (PENDIENTE)

### Objetivo
Actualizar a React 19 y optimizar

### Tareas
- [ ] Actualizar React
  ```bash
  pnpm add react@^19.0.0 react-dom@^19.0.0
  ```

- [ ] Usar nuevas features
  - [ ] `use()` hook
  - [ ] Actions
  - [ ] useOptimistic

- [ ] Optimización
  - [ ] Lazy loading
  - [ ] Code splitting
  - [ ] Bundle analysis
  - [ ] Tree shaking

---

## 🔧 Scripts de Migración

### Instalar Todas las Dependencias
```bash
# Root
pnpm install

# CLI
pnpm --filter @agent-teams/cli install

# Extension
pnpm --filter extension install

# Webviews
pnpm --filter webviews install
```

### Verificar Migración
```bash
# Lint + format
pnpm check

# Type checking
pnpm typecheck:all

# Tests
pnpm test:run

# Build todo
pnpm build
```

### Limpiar y Rebuild
```bash
pnpm clean
pnpm install
pnpm build
```

---

## ⚠️ Breaking Changes

### Para Desarrolladores
1. **Biome en lugar de ESLint/Prettier**
   - Instalar extensión de Biome en VSCode
   - Desinstalar extensiones de ESLint/Prettier

2. **Git Hooks con Lefthook**
   - Ejecutar `pnpm prepare` después de `git clone`
   - Commits deben seguir Conventional Commits

3. **PNPM Workspaces**
   - Usar `pnpm` en lugar de `npm`
   - Scripts ahora son `pnpm --filter <package> <command>`

### Para Usuarios
- ⚠️ Ningún breaking change en la funcionalidad
- ✅ Backward compatible con proyectos existentes
- ✅ Agentes YAML mantienen mismo formato

---

## 📊 Progreso

- [x] Fase 0: Setup Monorepo (100%)
- [ ] Fase 1: Webviews Base (0%)
- [ ] Fase 2: shadcn/ui (0%)
- [ ] Fase 3: React Router (0%)
- [ ] Fase 4: Comandos (0%)
- [ ] Fase 5: React 19 (0%)

**Total:** 16% completado

---

## 🐛 Issues Conocidos

Ninguno por ahora.

---

## 📝 Notas

- Mantener compatibilidad con v2.0
- Testing exhaustivo en cada fase
- Documentar cambios en CHANGELOG.md
- Actualizar README.md al finalizar
