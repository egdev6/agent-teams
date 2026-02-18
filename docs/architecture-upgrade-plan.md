# Plan de Mejora de Arquitectura - Extension VSCode

## Estado Actual
- React 18.2.0
- Navegación manual con switch/state
- Vite 5.0.8 para build
- Componentes custom sin librería UI
- Comandos centralizados en `v2Commands.ts`

## Propuestas de Mejora

### ✅ 1. React Router para Navegación de Webviews

**Viabilidad: ALTA ✅**

**Compatibilidad VSCode:**
- ✅ Totalmente compatible con webviews de VSCode
- ✅ Se recomienda usar `createMemoryRouter` en lugar de `BrowserRouter` o `HashRouter`
- ✅ Los webviews de VSCode no tienen acceso a la API de History del navegador

**Beneficios:**
- Navegación declarativa y type-safe
- Mejor gestión de estado de navegación
- Lazy loading de rutas
- Hooks como `useNavigate`, `useParams`, `useLocation`

**Consideraciones:**
```typescript
// Usar Memory Router en lugar de Browser Router
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

const router = createMemoryRouter([
  {
    path: '/',
    element: <Dashboard />,
  },
  {
    path: '/profile-editor',
    element: <ProfileEditor />,
  },
  // ...
]);
```

**Dependencias requeridas:**
```json
"react-router-dom": "^6.21.0"
```

---

### ✅ 2. Tailwind CSS para Maquetación

**Viabilidad: ALTA ✅**

**Compatibilidad VSCode:**
- ✅ Perfectamente compatible con webviews
- ✅ Se puede usar PostCSS con Vite sin problemas
- ✅ Soporta CSS variables para temas de VSCode

**Beneficios:**
- Design tokens consistentes
- Utility-first CSS
- Dark mode integrado
- Mejor mantenibilidad

**Configuración recomendada:**
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'class', // VSCode maneja el tema
  theme: {
    extend: {
      colors: {
        // Usar CSS variables de VSCode
        'vscode-bg': 'var(--vscode-editor-background)',
        'vscode-fg': 'var(--vscode-editor-foreground)',
        // ...
      }
    }
  }
}
```

**Dependencias requeridas:**
```json
"tailwindcss": "^3.4.0",
"autoprefixer": "^10.4.16",
"postcss": "^8.4.32"
```

---

### ⚠️ 3. Hero UI para Componetización

**Viabilidad: MEDIA-ALTA ⚠️**

**Nota:** Probablemente te refieres a **NextUI** (anteriormente llamado NextUI Hero) o **Headless UI**.

**Opciones recomendadas:**

#### Opción A: NextUI (Recomendada para tu caso)
- ✅ Componentes modernos con Tailwind
- ✅ Dark mode nativo
- ✅ TypeScript first
- ⚠️ Requiere Framer Motion (puede aumentar bundle size)

```json
"@nextui-org/react": "^2.2.9",
"framer-motion": "^10.16.16"
```

#### Opción B: Radix UI + Tailwind (Más ligera)
- ✅ Headless components
- ✅ Accesibilidad incorporada
- ✅ Menor bundle size
- ✅ Mejor para webviews (más control)

```json
"@radix-ui/react-dialog": "^1.0.5",
"@radix-ui/react-dropdown-menu": "^2.0.6",
"@radix-ui/react-select": "^2.0.0"
// ... otros componentes según necesidad
```

#### Opción C: shadcn/ui (Más recomendada)
- ✅ Copy-paste components (no es una dependencia)
- ✅ Basado en Radix UI + Tailwind
- ✅ Customizable al 100%
- ✅ Ideal para VSCode extensions

**Recomendación:** Usar **shadcn/ui** para máximo control y menor bundle size.

---

### ✅ 4. Arquitectura para Comandos

**Viabilidad: ALTA ✅**

**Propuesta de estructura:**

```
extension/
  src/
    commands/
      index.ts              # Barrel export
      CommandRegistry.ts    # Registro centralizado
      project/
        initProfile.command.ts
        saveProfile.command.ts
      agents/
        createAgent.command.ts
        syncAgents.command.ts
        deleteAgent.command.ts
      teams/
        createTeam.command.ts
        listTeams.command.ts
      kits/
        browseKits.command.ts
        installKit.command.ts
```

**Patrón recomendado:**

```typescript
// commands/base/Command.ts
export abstract class Command {
  abstract readonly id: string;
  abstract readonly title: string;
  
  abstract execute(...args: any[]): Promise<void>;
  
  register(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
      this.id,
      (...args) => this.execute(...args)
    );
    context.subscriptions.push(disposable);
  }
}

// commands/project/initProfile.command.ts
export class InitProfileCommand extends Command {
  readonly id = 'agent-teams.initProfile';
  readonly title = 'Initialize Project Profile';
  
  async execute(): Promise<void> {
    // Implementation
  }
}

// commands/CommandRegistry.ts
export class CommandRegistry {
  private commands: Command[] = [];
  
  register(...commands: Command[]): this {
    this.commands.push(...commands);
    return this;
  }
  
  registerAll(context: vscode.ExtensionContext): void {
    this.commands.forEach(cmd => cmd.register(context));
  }
}
```

**Uso en extension.ts:**
```typescript
const commandRegistry = new CommandRegistry()
  .register(
    new InitProfileCommand(extensionUri, logger),
    new CreateAgentCommand(extensionUri, logger),
    new SyncAgentsCommand(extensionUri, logger),
    // ...
  );

commandRegistry.registerAll(context);
```

---

### ✅ 5. React 19

**Viabilidad: ALTA ✅**

**Compatibilidad VSCode:**
- ✅ Totalmente compatible
- ✅ Mejoras de rendimiento
- ✅ Nuevos hooks: `use()`, `useFormStatus()`, `useOptimistic()`
- ✅ Actions y Transitions mejorados

**Cambios importantes:**
- `ReactDOM.render` eliminado (ya usan `createRoot` ✅)
- Mejoras en Suspense
- Nuevo compilador React Compiler (opcional)

**Actualización:**
```json
"react": "^19.0.0",
"react-dom": "^19.0.0",
"@types/react": "^19.0.0",
"@types/react-dom": "^19.0.0"
```

**Nota:** React 19 está en RC, se recomienda esperar a la versión estable (probablemente Q1 2024).

---

## 🎯 Plan de Implementación Recomendado

### Fase 1: Fundamentos (Semana 1)
1. ✅ Actualizar a React 19 (cuando sea estable)
2. ✅ Configurar Tailwind CSS
3. ✅ Migrar estilos inline a Tailwind
4. ✅ Crear design tokens basados en VSCode

### Fase 2: Componentes (Semana 2)
1. ✅ Decidir librería UI (recomiendo shadcn/ui)
2. ✅ Instalar y configurar componentes base
3. ✅ Migrar componentes existentes
4. ✅ Crear Storybook o playground para componentes

### Fase 3: Navegación (Semana 3)
1. ✅ Instalar React Router
2. ✅ Crear configuración de rutas
3. ✅ Migrar navegación actual a React Router
4. ✅ Implementar lazy loading

### Fase 4: Arquitectura Backend (Semana 4)
1. ✅ Crear estructura de comandos
2. ✅ Migrar comandos existentes
3. ✅ Implementar CommandRegistry
4. ✅ Refactorizar extension.ts

---

## ⚠️ Consideraciones Importantes

### Bundle Size
- Webviews de VSCode deben ser ligeros
- Usar lazy loading agresivamente
- Considerar tree-shaking

### CSP (Content Security Policy)
```typescript
// dashboardPanel.ts
getWebviewContent() {
  const nonce = getNonce();
  return `
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; 
                   style-src ${webview.cspSource} 'unsafe-inline'; 
                   script-src 'nonce-${nonce}';">
  `;
}
```

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
        }
      }
    }
  }
});
```

---

---

### ✅ 6. Lucide Icons

**Viabilidad: ALTA ✅**

**Compatibilidad VSCode:**
- ✅ Perfectamente compatible con webviews
- ✅ Librería moderna y ligera (~1KB por icon con tree-shaking)
- ✅ Mejor alternativa a Font Awesome o Material Icons
- ✅ TypeScript first e integración perfecta con React

**Beneficios:**
- Icons as React components
- Tree-shaking automático (solo empaqueta los iconos que usas)
- Consistencia con diseño moderno
- ~1400 iconos disponibles
- Customizable (size, color, strokeWidth)

**Uso:**
```typescript
import { Home, Settings, Users, FileText } from 'lucide-react';

<Home size={24} strokeWidth={2} className="text-vscode-fg" />
```

**Dependencias requeridas:**
```json
"lucide-react": "^0.344.0"
```

---

### ✅ 7. Biome para Lint + Format

**Viabilidad: ALTA ✅**

**Ventajas sobre ESLint + Prettier:**
- 🚀 **97% más rápido** que ESLint
- 🎯 **Single tool** - replace ESLint + Prettier
- 🔥 **Zero config** - funciona out-of-the-box
- 💾 **Menor footprint** - ~20MB vs >200MB (node_modules)
- ⚡ **Written in Rust** - performance nativa
- 🎯 **Reglas compatibles con ESLint** - migración suave

**Configuración recomendada:**

```json
// biome.json (raíz del monorepo)
{
  "$schema": "https://biomejs.dev/schemas/1.5.3/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "warn",
        "noConsoleLog": "off"
      },
      "style": {
        "useImportType": "error",
        "noNonNullAssertion": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingComma": "es5",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  },
  "json": {
    "formatter": {
      "trailingCommas": "none"
    }
  }
}
```

**Scripts para package.json:**
```json
{
  "scripts": {
    "lint": "biome lint .",
    "lint:fix": "biome lint --apply .",
    "format": "biome format .",
    "format:write": "biome format --write .",
    "check": "biome check .",
    "check:fix": "biome check --apply ."
  }
}
```

**Dependencias:**
```json
"@biomejs/biome": "^1.5.3"
```

**Vs Code Settings (.vscode/settings.json):**
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

---

### ✅ 8. Lefthook para Pre-commit

**Viabilidad: ALTA ✅**

**Ventajas sobre Husky:**
- 🚀 **Más rápido** - escrito en Go, no JavaScript
- 🎯 **Configuración más simple** - single YAML file
- 💪 **Más features** - parallel execution, skip patterns, custom commands
- 📦 **Menor peso** - sin dependencias de npm
- 🔄 **Multi-plataforma** - Windows, Mac, Linux

**Configuración para monorepo:**

```yaml
# lefthook.yml (raíz del monorepo)
pre-commit:
  parallel: true
  commands:
    # Lint y format con Biome
    biome-check:
      glob: "*.{js,ts,jsx,tsx,json,jsonc}"
      run: pnpm biome check --apply --no-errors-on-unmatched {staged_files}
      stage_fixed: true
    
    # Validar tipos TypeScript
    typecheck:
      glob: "*.{ts,tsx}"
      run: pnpm typecheck
      
    # Extension: build check
    extension-build:
      root: "extension/"
      glob: "*.{ts,tsx}"
      run: cd extension && pnpm build
      
    # Webviews: build check
    webviews-build:
      root: "extension/webviews/"
      glob: "*.{ts,tsx}"
      run: cd extension/webviews && pnpm build
      
    # Tests
    tests:
      glob: "*.{ts,tsx}"
      run: pnpm test:run

pre-push:
  commands:
    # Tests completos antes de push
    test:
      run: pnpm test:run
    
    # Coverage
    coverage:
      run: pnpm test:coverage

commit-msg:
  commands:
    # Validar formato de commit (convencional)
    commitlint:
      run: echo {1} | pnpm commitlint
```

**Instalación:**
```bash
# Instalar lefthook
pnpm add -D lefthook @commitlint/cli @commitlint/config-conventional

# Instalar hooks
pnpm lefthook install
```

**Scripts en package.json:**
```json
{
  "scripts": {
    "prepare": "lefthook install",
    "hooks:skip": "LEFTHOOK=0"
  }
}
```

**Skip hooks cuando sea necesario:**
```bash
# Skip todos los hooks
LEFTHOOK=0 git commit -m "message"

# O usar flag de git
git commit --no-verify -m "message"
```

---

## 📦 Dependencias Finales Recomendadas

### Monorepo Root (package.json)
```json
{
  "devDependencies": {
    "@biomejs/biome": "^1.5.3",
    "lefthook": "^1.6.1",
    "@commitlint/cli": "^18.6.0",
    "@commitlint/config-conventional": "^18.6.0",
    "typescript": "^5.3.3",
    "vitest": "^1.0.4"
  },
  "scripts": {
    "prepare": "lefthook install",
    "lint": "biome lint .",
    "lint:fix": "biome lint --apply .",
    "format": "biome format --write .",
    "check": "biome check --apply .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Webviews (extension/webviews/package.json)
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.21.0",
    "lucide-react": "^0.344.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
```

**Para componentes UI:**
- Opción shadcn/ui: No requiere dependencias (copy-paste)
- Opción NextUI: `@nextui-org/react`, `framer-motion`
- Opción Radix: Componentes individuales según necesidad

---

## 🏗️ Arquitectura Global del Proyecto

### Estructura de Monorepo Propuesta

```
agent-teams/                      # Monorepo root
├── .vscode/
│   ├── settings.json            # Biome como formatter
│   ├── extensions.json          # Extensiones recomendadas
│   └── launch.json              # Debug configs
├── .github/
│   └── workflows/
│       ├── ci.yml               # CI/CD pipeline
│       └── release.yml          # Release automation
├── docs/                        # Documentación
├── schemas/                     # JSON Schemas
├── agents/                      # Agentes del sistema
├── kits/                        # Kits reutilizables
│
├── extension/                   # VSCode Extension
│   ├── src/
│   │   ├── extension.ts         # Entry point
│   │   ├── commands/            # Sistema de comandos
│   │   │   ├── index.ts
│   │   │   ├── base/
│   │   │   │   ├── Command.ts
│   │   │   │   └── CommandRegistry.ts
│   │   │   ├── agents/
│   │   │   ├── teams/
│   │   │   ├── kits/
│   │   │   └── project/
│   │   ├── panels/              # WebView panels
│   │   │   ├── DashboardPanel.ts
│   │   │   ├── ProfileEditorPanel.ts
│   │   │   └── KitBrowserPanel.ts
│   │   ├── core/                # Business logic
│   │   │   ├── agentLoader.ts
│   │   │   ├── router.ts
│   │   │   ├── orchestrator.ts
│   │   │   └── composer.ts
│   │   └── utils/
│   ├── webviews/                # React UI
│   │   ├── src/
│   │   │   ├── main.tsx         # Entry point
│   │   │   ├── App.tsx          # Router setup
│   │   │   ├── routes/          # Route definitions
│   │   │   ├── pages/           # Page components
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── ProfileEditor/
│   │   │   │   ├── KitBrowser/
│   │   │   │   └── TeamManager/
│   │   │   ├── components/      # Shared components
│   │   │   │   ├── ui/          # shadcn/ui components
│   │   │   │   ├── layout/
│   │   │   │   └── shared/
│   │   │   ├── lib/             # Utils & hooks
│   │   │   │   ├── vscode.ts    # VSCode API wrapper
│   │   │   │   ├── hooks/
│   │   │   │   └── utils.ts
│   │   │   ├── styles/
│   │   │   │   └── globals.css  # Tailwind imports
│   │   │   └── types/
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── dist/                    # Compiled output
│   └── package.json
│
├── tools/                       # CLI tools
├── tests/                       # Tests
│
├── biome.json                   # Biome config
├── lefthook.yml                 # Git hooks
├── commitlint.config.js         # Commit lint
├── tsconfig.json                # TypeScript root
├── vitest.config.ts             # Test config
├── pnpm-workspace.yaml          # PNPM workspaces
└── package.json                 # Root package.json
```

### Configuración de Workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - 'extension'
  - 'extension/webviews'
  - 'tools'
```

```json
// package.json (root)
{
  "name": "agent-teams",
  "private": true,
  "workspaces": [
    "extension",
    "extension/webviews"
  ],
  "scripts": {
    "dev": "pnpm --parallel dev",
    "build": "pnpm --recursive build",
    "test": "vitest",
    "check": "biome check --apply .",
    "typecheck": "tsc --noEmit --project tsconfig.json"
  }
}
```

---

## 🎯 Plan de Implementación Actualizado

### Fase 0: Fundamentos del Monorepo (Semana 1)
1. ✅ Configurar pnpm workspaces
2. ✅ Instalar y configurar Biome
3. ✅ Configurar Lefthook
4. ✅ Migrar de ESLint/Prettier a Biome (si existen)
5. ✅ Actualizar scripts de package.json

### Fase 1: Webviews Base (Semana 2)
1. ✅ Actualizar a React 19
2. ✅ Configurar Tailwind CSS con tokens de VSCode
3. ✅ Instalar Lucide Icons
4. ✅ Migrar estilos inline a Tailwind
5. ✅ Crear sistema de design tokens

### Fase 2: Componentes UI (Semana 3)
1. ✅ Setup shadcn/ui
2. ✅ Crear componentes base (Button, Card, Dialog, etc.)
3. ✅ Migrar componentes existentes
4. ✅ Integrar Lucide icons
5. ✅ Testing de componentes

### Fase 3: Navegación (Semana 4)
1. ✅ Instalar React Router
2. ✅ Crear estructura de rutas
3. ✅ Migrar navegación actual
4. ✅ Implementar lazy loading
5. ✅ Breadcrumbs y navegación

### Fase 4: Arquitectura Backend (Semana 5)
1. ✅ Crear arquitectura de comandos
2. ✅ Migrar comandos existentes
3. ✅ CommandRegistry pattern
4. ✅ Refactorizar extension.ts
5. ✅ Testing de comandos

### Fase 5: Polish & Performance (Semana 6)
1. ✅ Optimización de bundle size
2. ✅ Lazy loading agresivo
3. ✅ Documentación
4. ✅ E2E testing
5. ✅ Release v2.1.0

---

## ✅ Recomendación Final

**TODAS las propuestas son viables y compatibles con VSCode.**

**Stack completo recomendado:**
1. ✅ React 19 (cuando sea estable)
2. ✅ React Router 6 con Memory Router
3. ✅ Tailwind CSS
4. ✅ shadcn/ui + Lucide Icons
5. ✅ Arquitectura de comandos modular
6. ✅ Biome para lint + format
7. ✅ Lefthook para git hooks
8. ✅ PNPM workspaces para monorepo

**Orden de implementación:** 
Monorepo Setup → Biome + Lefthook → Tailwind → Comandos → React Router → Componentes UI → React 19

---

## 🚨 Importante: Consideraciones de Migración

### Breaking Changes Potenciales
- Cambio de ESLint/Prettier a Biome puede requerir ajustes de código
- React Router cambia completamente el sistema de navegación
- Tailwind reemplaza todos los estilos inline

### Estrategia de Migración
1. **Branch feature/architecture-v2**: Hacer toda la migración en una feature branch
2. **Commits incrementales**: Un commit por fase
3. **Testing exhaustivo**: Probar cada componente después de migrar
4. **Documentación**: Actualizar docs con nuevos patterns

### Compatibilidad con Usuarios Existentes
- La extensión debe seguir siendo compatible con proyectos antiguos
- Los agentes YAML existentes no deben romperse
- Migration guide para usuarios

---

## 📈 Métricas de Éxito

- ⚡ Build time < 5s (actualmente ~10s)
- 📦 Bundle size < 500KB (actualmente ~800KB)
- 🚀 Lint time < 1s (vs ~5s con ESLint)
- ✅ Test coverage > 80%
- 🎯 Type safety 100%

---

¿Comenzamos con la implementación? Puedo crear la configuración completa del monorepo primero.
