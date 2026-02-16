# Arquitectura: Sistema de Kits & Teams

**Versión:** 2.0 Roadmap  
**Estado:** Documento de Diseño  
**Fecha:** Feb 2026

---

## 🎯 Visión

Evolucionar de **sistema de agentes individuales** a **plataforma de equipos IA reutilizables** mediante 3 capas:

1. **Core System** (inmutable) - Motor base, schemas, runtime
2. **Agent Kits** (reutilizables) - ADN de agentes sin paths hardcodeados
3. **Project Profiles** (configurables) - Contexto específico por proyecto

---

## 📐 Modelo Mental: 3 Capas

### Capa 1: Core System (Inmutable)

**Ubicación:** `agent-team/` (este repo)

**Componentes:**
```
agent-team/
├── schemas/
│   └── agent.schema.json        # Validación
├── agents/_templates/
│   └── agent.template.md        # Template Mustache
├── extension/src/
│   ├── router.ts                # Routing inteligente
│   ├── orchestrator.ts          # Coordinación
│   ├── agentLoader.ts           # Carga dinámica
│   ├── agentGenerator.ts        # Generación
│   ├── composer.ts              # 🆕 Composición Kit + Profile
│   └── types.ts
└── runtime/
    └── presets.ts               # Domain presets
```

**Responsabilidades:**
- ✅ Validación de schema
- ✅ Renderizado de templates
- ✅ Lógica de Router + Orchestrator
- ✅ Presets de dominio base
- 🆕 Motor de composición (merge Kit + Profile)

**Actualización:** Una vez, se propaga a todos los proyectos.

---

### Capa 2: Agent Kits (Reutilizables)

**Ubicación:** `agent-team/kits/` o repos separados

**Estructura:**
```
kits/
├── testing-vitest/
│   ├── kit.yml                  # Metadatos del kit
│   └── agents/
│       ├── vitest-worker.yml    # Sin paths hardcodeados
│       └── testing-orchestrator.yml
│
├── frontend-react/
│   ├── kit.yml
│   └── agents/
│       ├── react-component-expert.yml
│       └── react-hooks-specialist.yml
│
├── backend-rust-axum/
│   ├── kit.yml
│   └── agents/
│       ├── rust-api-worker.yml
│       └── axum-router-expert.yml
│
├── ux-review/
│   ├── kit.yml
│   └── agents/
│       └── ux-reviewer.yml
│
└── product-foo/                 # Kit específico de producto
    ├── kit.yml
    └── agents/
        └── foo-expert.yml
```

**kit.yml Ejemplo:**
```yaml
# kits/testing-vitest/kit.yml
id: testing-vitest
name: Testing with Vitest
version: 1.0.0
description: Equipo completo de testing para proyectos basados en Vitest

requires:
  technologies: ["vitest", "react"]
  min_core_version: "1.0.0"

provides:
  agents:
    - vitest-worker
    - testing-orchestrator
  
  skills:
    - run_tests
    - analyze_coverage
    - mock_generator

defaults:
  output_mode: "short+diff"
  max_files: 8
  max_chars_per_file: 8000

context_packs:
  - kit:testing-patterns
  - kit:vitest-best-practices
```

**Agent Spec con Placeholders:**
```yaml
# kits/testing-vitest/agents/vitest-worker.yml
name: "Vitest Testing Worker"
description: "Especialista en tests unitarios y de integración con Vitest"

_metadata:
  id: vitest-worker
  role: worker
  domain: testing
  subdomains: ["unit", "integration"]
  
  invocation:
    aliases: ["@vitest-worker"]
    entrypoint: "agent:vitest-worker"
  
  intents:
    - "test_creation"
    - "test_debugging"
    - "mock_setup"
  
  # 🔑 PLACEHOLDERS en lugar de paths hardcodeados
  path_globs:
    - "{{paths.tests_root}}/**/*.test.ts"
    - "{{paths.tests_root}}/**/*.spec.ts"
    - "{{paths.frontend_root}}/**/*.test.tsx"
  
  keywords:
    - "vitest"
    - "test"
    - "expect"
    - "mock"
  
  context:
    packs:
      - "project:architecture"      # Del proyecto
      - "project:conventions"        # Del proyecto
      - "kit:testing-patterns"       # Del kit
    max_files: 8
    max_chars_per_file: 8000
  
  skills:
    allowed:
      - "file_edit"
      - "file_create"
      - "run_terminal"
      - "run_tests"                  # Del kit
  
  commands:
    test: "{{commands.test}}"        # Del project profile
    coverage: "{{commands.coverage}}"
```

**Ventajas:**
- ✅ Reutilizable entre proyectos
- ✅ Sin paths hardcodeados
- ✅ Versionable independientemente
- ✅ Compartible (npm package, git submodule, etc.)

---

### Capa 3: Project Profile (Configurable)

**Ubicación:** Cada proyecto tiene su profile

**Estructura:**
```
mi-proyecto/
├── .agent-team/
│   ├── project.profile.yml      # 🆕 Configuración del proyecto
│   ├── teams/
│   │   ├── minimal-testing.yml  # 🆕 Team profiles
│   │   └── full-stack.yml
│   └── context-packs/
│       ├── architecture.md      # 🆕 Dynamic context
│       ├── conventions.md
│       ├── endpoints.md
│       └── adr/
│           └── 001-tech-stack.md
│
├── .github/
│   └── agents/                  # Generados por sync
│       ├── vitest-worker.agent.md
│       └── react-expert.agent.md
│
└── src/...
```

**project.profile.yml:**
```yaml
project:
  id: my-awesome-app
  name: My Awesome App
  version: 1.0.0

# Stack tecnológico activo
technologies:
  - react
  - typescript
  - vitest
  - tailwind
  - rust
  - axum
  - postgresql

# Placeholders de rutas (resueltos en compose)
paths:
  frontend_root: "src"
  backend_root: "crates/api"
  tests_root: "src"
  components: "src/components"
  docs: "docs"

# Comandos del proyecto (resueltos en compose)
commands:
  test: "pnpm test"
  test_coverage: "pnpm test -- --coverage"
  lint: "pnpm lint"
  backend_test: "cargo test"
  backend_build: "cargo build --release"

# Context packs locales
context_packs:
  architecture: ".agent-team/context-packs/architecture.md"
  conventions: ".agent-team/context-packs/conventions.md"
  endpoints: ".agent-team/context-packs/endpoints.md"
  adr: ".agent-team/context-packs/adr/"

# Overrides globales (opcional)
overrides:
  max_chars_per_file: 10000  # Override del kit default
  output_mode: "diff"         # Override para este proyecto
```

**Team Profile:**
```yaml
# .agent-team/teams/minimal-testing.yml
id: minimal-testing
name: Minimal Testing Team
description: Solo agentes de testing para CI/CD

kits:
  - testing-vitest

agents:
  enable:
    - vitest-worker
  disable: []

overrides:
  vitest-worker:
    output_mode: "diff"  # Extra conciso para CI
```

```yaml
# .agent-team/teams/full-stack.yml
id: full-stack
name: Full Stack Development Team
description: Equipo completo para desarrollo full-stack

kits:
  - frontend-react
  - testing-vitest
  - backend-rust-axum
  - docs-maintainer
  - ux-review

agents:
  enable: all  # Todos los agentes de todos los kits

overrides:
  react-expert:
    max_handoffs: 3  # Override específico
```

---

## 🔧 Motor de Composición

**Nuevo módulo:** `extension/src/composer.ts`

### Flujo de Composición

```typescript
// extension/src/composer.ts

export class AgentComposer {
  /**
   * 1. Cargar Kit + Project Profile
   * 2. Fusionar specs con placeholders resueltos
   * 3. Aplicar overrides
   * 4. Validar spec final
   * 5. Generar .agent.md
   */
  async compose(
    kitId: string,
    agentId: string,
    projectProfile: ProjectProfile
  ): Promise<AgentSpec> {
    // 1. Cargar spec del agente del kit
    const kitAgent = await this.loadKitAgent(kitId, agentId);
    
    // 2. Resolver placeholders
    const resolved = this.resolvePlaceholders(kitAgent, projectProfile);
    
    // 3. Fusionar context packs
    const withContext = this.mergeContextPacks(resolved, projectProfile);
    
    // 4. Aplicar overrides del proyecto
    const withOverrides = this.applyOverrides(withContext, projectProfile);
    
    // 5. Validar spec final
    await this.validate(withOverrides);
    
    return withOverrides;
  }
  
  /**
   * Resolver {{placeholders}} en spec
   */
  private resolvePlaceholders(
    spec: KitAgentSpec,
    profile: ProjectProfile
  ): AgentSpec {
    const resolved = JSON.parse(
      JSON.stringify(spec)
        .replace(/\{\{paths\.(\w+)\}\}/g, (_, key) => profile.paths[key] || '')
        .replace(/\{\{commands\.(\w+)\}\}/g, (_, key) => profile.commands[key] || '')
        .replace(/\{\{project\.(\w+)\}\}/g, (_, key) => profile.project[key] || '')
    );
    
    return resolved;
  }
  
  /**
   * Fusionar context packs: kit:* + project:*
   */
  private mergeContextPacks(
    spec: AgentSpec,
    profile: ProjectProfile
  ): AgentSpec {
    const packs = spec._metadata.context.packs.map(pack => {
      if (pack.startsWith('project:')) {
        const packName = pack.split(':')[1];
        return profile.context_packs[packName];
      }
      if (pack.startsWith('kit:')) {
        // Cargar desde context-packs/ del kit
        return this.loadKitContextPack(pack);
      }
      return pack;
    });
    
    return {
      ...spec,
      _metadata: {
        ...spec._metadata,
        context: {
          ...spec._metadata.context,
          packs
        }
      }
    };
  }
  
  /**
   * Aplicar overrides del proyecto
   */
  private applyOverrides(
    spec: AgentSpec,
    profile: ProjectProfile
  ): AgentSpec {
    const overrides = profile.overrides?.[spec._metadata.id] || {};
    
    return deepMerge(spec, {
      _metadata: overrides
    });
  }
}
```

### Resolución de Placeholders

**Ejemplo de transformación:**

**Agent del Kit (antes):**
```yaml
path_globs:
  - "{{paths.tests_root}}/**/*.test.ts"
  - "{{paths.frontend_root}}/**/*.tsx"

commands:
  test: "{{commands.test}}"
```

**Project Profile:**
```yaml
paths:
  tests_root: "src"
  frontend_root: "src"

commands:
  test: "pnpm test"
```

**Agent Final (después):**
```yaml
path_globs:
  - "src/**/*.test.ts"
  - "src/**/*.tsx"

# En instructions del agent:
# Ejecutar tests con: pnpm test
```

---

## 🎭 Teams: Equipos Guardados

**Concepto:** Un team es una selección de kits + overrides guardada como YAML.

### Casos de Uso

**1. Minimal Testing Team**
```bash
# Solo para CI/CD
agent-team sync --team minimal-testing
```

**2. Full Stack Team**
```bash
# Desarrollo completo
agent-team sync --team full-stack
```

**3. UX Review Team**
```bash
# Solo UX/Design review
agent-team sync --team ux-only
```

### UI en Extensión

```typescript
// Comando: Agent Team: Sync Team to Project

const teams = await loadTeams('.agent-team/teams/');

const selection = await vscode.window.showQuickPick(
  teams.map(t => ({
    label: t.name,
    description: t.description,
    detail: `Kits: ${t.kits.join(', ')}`
  })),
  { placeHolder: 'Seleccionar equipo a sincronizar' }
);

if (selection) {
  await composer.syncTeam(selection.id, projectProfile);
  vscode.window.showInformationMessage(
    `✅ Equipo "${selection.label}" sincronizado exitosamente`
  );
}
```

---

## 📦 Context Packs Dinámicos

### Prefijos de Context Packs

**`project:*`** - Del proyecto actual
```yaml
context:
  packs:
    - "project:architecture"   # .agent-team/context-packs/architecture.md
    - "project:conventions"    # .agent-team/context-packs/conventions.md
    - "project:endpoints"      # .agent-team/context-packs/endpoints.md
```

**`kit:*`** - Del kit
```yaml
context:
  packs:
    - "kit:testing-patterns"   # kits/testing-vitest/context-packs/testing-patterns.md
    - "kit:vitest-best-practices"
```

**`global:*`** - Del core system
```yaml
context:
  packs:
    - "global:coding-standards"  # agent-team/context-packs/coding-standards.md
```

### Resolución en Runtime

```typescript
// extension/src/contextPackResolver.ts

export class ContextPackResolver {
  async resolve(pack: string, context: ResolverContext): Promise<string> {
    if (pack.startsWith('project:')) {
      const packName = pack.split(':')[1];
      return fs.readFileSync(
        path.join(context.projectRoot, '.agent-team/context-packs', `${packName}.md`),
        'utf-8'
      );
    }
    
    if (pack.startsWith('kit:')) {
      const [, packName] = pack.split(':');
      const kitId = context.currentKit;
      return fs.readFileSync(
        path.join(context.kitsRoot, kitId, 'context-packs', `${packName}.md`),
        'utf-8'
      );
    }
    
    if (pack.startsWith('global:')) {
      const [, packName] = pack.split(':');
      return fs.readFileSync(
        path.join(context.coreRoot, 'context-packs', `${packName}.md`),
        'utf-8'
      );
    }
    
    throw new Error(`Prefijo de context pack desconocido: ${pack}`);
  }
}
```

---

## 🛠️ Registro de Skills

### Skills por Kit

```yaml
# kits/ux-review/kit.yml
provides:
  skills:
    - id: browser_preview
      description: Abrir vista previa del navegador para revisión UI
      command: "{{commands.preview}}"
    
    - id: design_feedback
      description: Analizar UI contra sistema de diseño
      requires: ["project:design-system"]
    
    - id: accessibility_check
      description: Ejecutar auditorías de accesibilidad
      command: "{{commands.a11y_check}}"
```

### Skills por Agente

```yaml
# kits/ux-review/agents/ux-reviewer.yml
_metadata:
  skills:
    allowed:
      - "browser_preview"      # Del kit
      - "design_feedback"      # Del kit
      - "accessibility_check"  # Del kit
      - "search_codebase"      # Global
```

---

## 🗺️ Roadmap de Implementación

### Sprint 1: Project Profiles (2 días)
- [ ] Crear schema de `project.profile.yml`
- [ ] Loader para `ProjectProfile`
- [ ] Resolución de placeholders básica
- [ ] Comando: `Agent Team: Create Project Profile`
- [ ] Sync para 1 kit hardcoded (testing-vitest)

### Sprint 2: Sistema de Kits (3 días)
- [ ] Estructura `kits/` con 3 kits de ejemplo:
  - `testing-vitest`
  - `frontend-react`
  - `ux-review`
- [ ] Schema de `kit.yml`
- [ ] Kit loader + validator
- [ ] Composer: merge Kit + Profile
- [ ] Comando: `Agent Team: Sync Kit`

### Sprint 3: Teams (2 días)
- [ ] Schema de teams (`.agent-team/teams/*.yml`)
- [ ] Team loader
- [ ] Comando: `Agent Team: Select Team`
- [ ] Comando: `Agent Team: Sync Team to Project`
- [ ] UI: Quick Pick para teams

### Sprint 4: Context Packs Dinámicos (2 días)
- [ ] Context pack resolver (`project:*`, `kit:*`, `global:*`)
- [ ] Template injection de context packs
- [ ] Comando: `Agent Team: Create Context Pack`
- [ ] Validación de context packs en compose

### Sprint 5: Registro de Skills (2 días)
- [ ] Schema de skills en kits
- [ ] Skills picker en wizard
- [ ] Skills validation en compose
- [ ] Command resolution para skills

### Sprint 6: Composición Avanzada (3 días)
- [ ] Overrides por agente en team
- [ ] Deep merge de configs
- [ ] Resolución de conflictos
- [ ] Modo dry-run (`--dry-run`)
- [ ] Diff viewer (antes/después de compose)

---

## 📊 Antes vs Después

### Antes (v1.0)

```
agent-team/
├── specs/
│   ├── backend.yml          # Paths hardcodeados: src/api/**
│   └── frontend.yml         # Paths hardcodeados: src/components/**
└── .github/agents/
    ├── backend-agent.agent.md
    └── frontend-agent.agent.md

❌ No reutilizable entre proyectos
❌ Paths específicos del proyecto en specs
❌ No hay concepto de "equipos"
❌ Context packs estáticos
```

### Después (v2.0)

```
agent-team/                   # Core (inmutable)
├── kits/                     # 🆕 Kits reutilizables
│   ├── testing-vitest/
│   ├── frontend-react/
│   └── ux-review/
└── extension/src/
    └── composer.ts           # 🆕 Motor de composición

mi-proyecto/                  # Project (configurable)
├── .agent-team/
│   ├── project.profile.yml  # 🆕 Paths, commands, tech stack
│   ├── teams/               # 🆕 Teams guardados
│   │   ├── minimal-testing.yml
│   │   └── full-stack.yml
│   └── context-packs/       # 🆕 Dynamic context
│       ├── architecture.md
│       └── conventions.md
└── .github/agents/          # Generados por compose
    ├── vitest-worker.agent.md
    └── react-expert.agent.md

✅ Kits reutilizables entre proyectos
✅ Placeholders resueltos en compose
✅ Teams predefinidos (1 click sync)
✅ Context packs dinámicos por proyecto
✅ Actualizas core → propaga a todos los proyectos
```

---

## 🎯 Resultado Final

**Lo que consigues:**

✅ **Crear agentes una vez, reutilizar everywhere**
```bash
# En proyecto A
agent-team sync --team full-stack

# En proyecto B (mismo team, diferente contexto)
agent-team sync --team full-stack
```

✅ **Equipos predefinidos**
```bash
agent-team sync --team minimal-testing    # Solo testing
agent-team sync --team ux-only            # Solo UX review
agent-team sync --team full-stack         # Todo
```

✅ **Context dinámico por proyecto**
```yaml
# Cambias solo project.profile.yml + context-packs/
# Los agentes se adaptan automáticamente
```

✅ **Actualización centralizada**
```bash
# Actualizas core o kit
git pull agent-team

# Re-sync en cada proyecto
agent-team sync --team full-stack
# ✅ Todos los proyectos con última versión
```

✅ **Agentes específicos de producto/dominio**
```bash
# Kit custom para tu producto
kits/product-myapp/
  └── agents/
      ├── myapp-expert.yml
      └── myapp-onboarding.yml
```

---

## 🧩 Preguntas de Diseño

### 1. ¿Dónde deben vivir los kits?

**Opción A:** En `agent-team/kits/` (mismo repo)
- ✅ Fácil de empezar
- ❌ Repo crece mucho

**Opción B:** Repos separados (npm packages)
```bash
npm install @agent-team/kit-testing-vitest
npm install @agent-team/kit-frontend-react
```
- ✅ Versionado independiente
- ✅ Compartible públicamente
- ❌ Más setup inicial

**Recomendación:** Empezar con A, migrar a B cuando tengas 5+ kits.

### 2. ¿Cómo distribuir updates de kits?

**Opción A:** Git submodules
```bash
git submodule add https://github.com/your-org/kit-testing-vitest kits/testing-vitest
```

**Opción B:** npm packages
```bash
npm install @agent-team/kit-testing-vitest@latest
```

**Opción C:** Registry custom (futuro)
```bash
agent-team kits install testing-vitest
```

### 3. ¿Cómo versionar equipos?

```yaml
# .agent-team/teams/full-stack.yml
id: full-stack
version: 2.0.0
kits:
  - id: testing-vitest
    version: "^1.0.0"
  - id: frontend-react
    version: "^2.0.0"
```

---

## 📝 Próximos Pasos

1. **Prototipo rápido** (1-2 días)
   - Crear 1 kit (testing-vitest)
   - Crear 1 project.profile.yml
   - Composer básico con resolución de placeholders
   - Sync manual

2. **Validar con uso real** (1 semana)
   - Usar en 2-3 proyectos reales
   - Iterar sobre puntos de dolor
   - Afinar composer

3. **Completar Sprint 1-3** (2 semanas)
   - Teams + Kits + Profiles completos
   - UI en extensión
   - Documentación

4. **Open source kits** (futuro)
   - Kit registry público
   - Community kits
   - Marketplace

---

**Estado:** 🎨 Fase de Diseño  
**Target:** v2.0  
**ETA:** Q2 2026
