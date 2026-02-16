# Guía de Context Packs Dinámicos

Guía completa para crear y usar context packs dinámicos con variables, condicionales, loops e includes.

## Resumen

Los context packs dinámicos son archivos markdown que soportan:

- **Variables** - `{{project:id}}`, `{{path:src}}`, `{{env:NODE_ENV}}`
- **Condicionales** - `{{#if technology:react}}...{{/if}}`
- **Loops** - `{{#each technologies}}...{{/each}}`
- **Includes** - `{{include:kit:patterns.md}}`
- **Filtros** - `{{uppercase:text}}`, `{{lowercase:text}}`

## Referencia de Sintaxis

### 1. Variables

Accede a configuración del proyecto, paths, comandos y entorno:

```markdown
## Proyecto: {{project:name}}

**ID:** {{project:id}}
**Versión:** {{project:version}}
**Tipo:** {{project:type}}

**Paths:**
- Fuente: {{path:src}}
- Tests: {{path:tests_root}}

**Comandos:**
- Build: {{command:build}}
- Test: {{command:test}}

**Tecnologías:**
- React: {{technology:react}}  (true/false)

**Entorno:**
- NODE_ENV: {{env:NODE_ENV}}
- CI: {{env:CI}}

**Info del Kit:**
- Kit ID: {{kit:id}}
- Kit Version: {{kit:version}}
```

#### Namespaces de Variables

| Namespace | Fuente | Ejemplo |
|-----------|--------|---------|
| `project:*` | `project.profile.yml → project` | `{{project:name}}` |
| `path:*` | `project.profile.yml → paths` | `{{path:src}}` |
| `command:*` | `project.profile.yml → commands` | `{{command:test}}` |
| `technology:*` | `project.profile.yml → technologies` | `{{technology:react}}` |
| `env:*` | Variables de entorno | `{{env:NODE_ENV}}` |
| `kit:*` | Manifiesto del kit | `{{kit:id}}` |
| `var:*` | Variables personalizadas (futuro) | `{{var:custom}}` |

### 2. Condicionales

Mostrar contenido basado en condiciones:

#### If Básico

```markdown
{{#if technology:react}}
Este contenido solo se muestra si React está habilitado.
{{/if}}
```

#### If-Else

```markdown
{{#if technology:vitest}}
Usar Vitest para testing.
{{else}}
Usar Jest para testing.
{{/if}}
```

#### Unless (Inverso)

```markdown
{{#unless env:production}}
Modo desarrollo: logging verboso habilitado.
{{/unless}}
```

#### Condiciones Soportadas

**Verificación de tecnología:**
```markdown
{{#if technology:react}}
{{#if technology:typescript}}
{{#if technology:vitest}}
```

**Verificación de entorno:**
```markdown
{{#if env:NODE_ENV=production}}
{{#if env:CI}}
```

**Verificación de tipo de proyecto:**
```markdown
{{#if project:type=frontend}}
{{#if project:type=backend}}
```

**Verificación de variable:**
```markdown
{{#if var:featureFlag}}
```

### 3. Loops

Iterar sobre colecciones:

#### Loop sobre Tecnologías

```markdown
## Tecnologías Habilitadas

{{#each technologies}}
- {{this}}
{{/each}}
```

**Salida:**
```markdown
## Tecnologías Habilitadas

- typescript
- react
- vitest
```

#### Loop sobre Paths

```markdown
## Paths del Proyecto

{{#each paths}}
**{{key}}**: `{{value}}`
{{/each}}
```

**Salida:**
```markdown
## Paths del Proyecto

**src**: `./src`
**tests_root**: `./tests`
**components**: `./src/components`
```

#### Colecciones Soportadas

| Colección | Variables | Ejemplo |
|-----------|-----------|---------|
| `technologies` | `{{this}}` | Tecnologías habilitadas |
| `paths` | `{{key}}`, `{{value}}` | Mapeos de paths |
| `commands` | `{{key}}`, `{{value}}` | Mapeos de comandos |

### 4. Includes

Incluir otros context packs:

#### Context Pack de Kit

```markdown
{{include:kit:testing-patterns}}
```

Incluye `kits/{kit-id}/context-packs/testing-patterns.md`

#### Context Pack de Proyecto

```markdown
{{include:project:architecture}}
```

Incluye `.agent-team/context-packs/architecture.md`

#### Context Pack Global

```markdown
{{include:global:best-practices}}
```

Incluye `context-packs/global/best-practices.md`

#### Includes Anidados

Los includes pueden contener includes:

```markdown
<!-- architecture.md -->
# Arquitectura
{{include:project:conventions}}
{{include:project:tech-stack}}
```

**Profundidad máxima:** 5 niveles (configurable)

### 5. Filtros

Transformar texto:

#### Uppercase

```markdown
## {{uppercase:{{project:name}}}}
```

**Entrada:** `my-web-app`  
**Salida:** `MY-WEB-APP`

#### Lowercase

```markdown
**Tipo:** {{lowercase:{{project:type}}}}
```

**Entrada:** `FRONTEND`  
**Salida:** `frontend`

#### Capitalize

```markdown
**Proyecto:** {{capitalize:{{project:name}}}}
```

**Entrada:** `my-web-app`  
**Salida:** `My-web-app`

### 6. Combinando Características

Ejemplo del mundo real combinando todas las características:

```markdown
# {{uppercase:{{project:name}}}} - Proyecto {{capitalize:{{project:type}}}}

## Stack Tecnológico

{{#each technologies}}
### {{capitalize:{{this}}}}

{{#if this=react}}
**Guías de React:**
- Usar componentes funcionales
- Preferir hooks sobre componentes de clase
{{include:kit:react-patterns}}
{{/if}}

{{#if this=typescript}}
**Configuración de TypeScript:**
- Modo estricto: habilitado
- Target: ES2020
{{include:kit:typescript-patterns}}
{{/if}}

{{#if this=vitest}}
**Testing con Vitest:**
```bash
{{command:test}}
```
{{include:kit:vitest-best-practices}}
{{/if}}
{{/each}}

## Entorno

{{#if env:production}}
**Modo Producción**
- Optimizaciones: ON
- Source maps: externos
{{else}}
**Modo Desarrollo**
- HMR: habilitado
- Logging verboso: ON
{{/if}}

## Paths

{{#each paths}}
- **{{uppercase:key}}**: `{{value}}`
{{/each}}
```

## Mejores Prácticas

### 1. Mantener Context Packs Enfocados

Cada pack debe tener una responsabilidad única:

✅ **Bien:**
- `tech-stack.md` - Guías específicas de tecnología
- `testing.md` - Estrategias de testing
- `architecture.md` - Estructura del proyecto

❌ **Mal:**
- `everything.md` - Todas las guías mezcladas

### 2. Usar Condicionales para Especificidad

Adaptar contenido a la configuración del proyecto:

```markdown
{{#if technology:react}}
## Testing de Componentes React
{{include:kit:react-testing}}
{{/if}}

{{#if technology:vue}}
## Testing de Componentes Vue
{{include:kit:vue-testing}}
{{/if}}
```

### 3. Crear Packs de Kit Reutilizables

Los context packs de kit deben ser genéricos y enfocados en tecnología:

**Pack de kit (reutilizable):**
```markdown
<!-- kits/testing-vitest/context-packs/vitest-best-practices.md -->
# Mejores Prácticas de Vitest

Guías genéricas de Vitest para cualquier proyecto.
```

**Pack de proyecto (específico):**
```markdown
<!-- .agent-team/context-packs/testing.md -->
# Guías de Testing

{{#if technology:vitest}}
{{include:kit:vitest-best-practices}}
Configuración específica de Vitest del proyecto...
{{/if}}
```

### 4. Documentar Variables

Al principio de packs dinámicos, documentar variables esperadas:

```markdown
<!-- 
VARIABLES REQUERIDAS:
- project:name
- project:type
- technology:react
- technology:typescript

VARIABLES OPCIONALES:
- env:NODE_ENV
- env:CI
-->

# Guía de {{project:name}}
...
```

### 5. Manejar Valores Faltantes

Las variables que no existen permanecen como placeholders:

```markdown
<!-- Si path:custom no existe -->
Path personalizado: {{path:custom}}

<!-- Salida -->
Path personalizado: {{path:custom}}
```

Usar condicionales para manejar opcionales:

```markdown
{{#if path:custom}}
Path personalizado: {{path:custom}}
{{/if}}
```

## Rendimiento

### Caché

El procesador cachea packs procesados:

```typescript
// Primera llamada: procesa pack
await processor.process('project:tech-stack', context, { cache: true });

// Segunda llamada: devuelve resultado cacheado
await processor.process('project:tech-stack', context, { cache: true });

// Limpiar caché
processor.clearCache();
```

### Límite de Profundidad de Include

Prevenir recursión infinita:

```typescript
await processor.process(pack, context, {
  maxDepth: 5  // Máximo 5 niveles de includes anidados
});
```

## Ejemplos

### Ejemplo 1: Testing Específico por Framework

```markdown
# Guías de Testing

{{#if technology:react}}
## React Testing Library

Usar `@testing-library/react`:

\`\`\`typescript
import { render, screen } from '@testing-library/react';

test('renderiza botón', () => {
  render(<Button>Click</Button>);
  expect(screen.getByText('Click')).toBeInTheDocument();
});
\`\`\`

{{include:kit:react-testing-patterns}}
{{/if}}

{{#if technology:vue}}
## Vue Test Utils

Usar `@vue/test-utils`:

\`\`\`typescript
import { mount } from '@vue/test-utils';

test('renderiza botón', () => {
  const wrapper = mount(Button);
  expect(wrapper.text()).toContain('Click');
});
\`\`\`

{{include:kit:vue-testing-patterns}}
{{/if}}
```

### Ejemplo 2: Configuración Según Entorno

```markdown
# Guía de Configuración

## Entorno: {{uppercase:{{env:NODE_ENV}}}}

{{#if env:NODE_ENV=production}}
### Configuración de Producción

- Minificación: habilitada
- Source maps: externos
- Caché: agresivo
- Logging: solo errores

**Comando de build:**
\`\`\`bash
{{command:build}}
\`\`\`
{{/if}}

{{#unless env:production}}
### Configuración de Desarrollo

- HMR: habilitado
- Source maps: inline
- Caché: deshabilitado
- Logging: verboso

**Servidor dev:**
\`\`\`bash
{{command:dev}}
\`\`\`
{{/unless}}
```

### Ejemplo 3: Documentación Auto-Generada

```markdown
# Referencia de Paths - {{project:name}}

## Tipo de Proyecto: {{capitalize:{{project:type}}}}

### Estructura de Directorios

{{#each paths}}
#### {{uppercase:key}}
- Path: `{{value}}`
- Absoluto: `{{project:root}}/{{value}}`
{{/each}}

### Mapeos de Path de TypeScript

\`\`\`json
{
  "compilerOptions": {
    "paths": {
{{#each paths}}
      "@{{key}}/*": ["{{value}}/*"],
{{/each}}
    }
  }
}
\`\`\`
```

## Crear Tu Primer Pack Dinámico

1. **Crear archivo de pack:**
   ```bash
   touch .agent-team/context-packs/mi-pack.md
   ```

2. **Añadir contenido dinámico:**
   ```markdown
   # Guías de {{project:name}}
   
   {{#if technology:typescript}}
   Usar TypeScript para seguridad de tipos.
   {{/if}}
   
   Comando de test: `{{command:test}}`
   ```

3. **Referenciar en perfil:**
   ```yaml
   # project.profile.yml
   context_packs:
     - mi-pack
   ```

4. **Usar en agente:**
   ```yaml
   # agents/mi-agente.yml
   _metadata:
     context:
       packs:
         - project:mi-pack
   ```

5. **Procesar durante composición:**
   ¡Auto-procesado cuando se sincroniza el equipo!

---

**Siguiente:** Ver [examples/](../examples/) para ejemplos completos funcionando.
