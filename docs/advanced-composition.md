# Guía de Composición Avanzada
## Sprint 6: Overrides de Agentes y Resolución de Conflictos

**Versión:** v2.2.0  
**Fecha:** Feb 2026  
**Estado:** Listo para Producción

---

## 🎯 Resumen

Sprint 6 introduce características avanzadas de composición que te dan control completo sobre cómo se configuran los agentes en cada equipo:

- **Overrides por agente** - Personalizar cualquier propiedad del agente a nivel de equipo
- **Estrategias de merge inteligentes** - Controlar cómo se resuelven conflictos
- **Modo dry-run** - Vista previa de cambios antes de aplicarlos
- **Diffs visuales** - Ver exactamente qué cambiará
- **Rastreo de conflictos** - Auditoría completa de decisiones de merge

---

## 🏗️ Arquitectura

### Capas de Composición

La configuración del agente fluye a través de 3 capas con merge inteligente:

```
1. Spec del Agente del Kit (Base)
   ↓
2. Overrides del Perfil de Proyecto (Específicos del proyecto)
   ↓
3. Overrides del Perfil de Equipo (Específicos del equipo)
   ↓
Agente Compuesto Final
```

### Estrategias de Merge

Elige cómo se resuelven conflictos entre capas:

| Estrategia | Comportamiento | Usar Cuando |
|----------|----------|----------|
| **team-priority** | Valores del equipo ganan | El equipo conoce mejor las necesidades del proyecto (predeterminado) |
| **profile-priority** | Valores del perfil ganan | El perfil del proyecto es la fuente de verdad |
| **kit-priority** | Valores del kit preservados | Mantener kit intacto, override solo huecos |
| **explicit-only** | Solo valores explícitamente establecidos | Conservador, cambios mínimos |

---

## 📝 Estructura de Override de Equipo

### Schema Completo de Override

```yaml
overrides:
  agent-id:
    # Configuración de contexto
    context:
      packs:
        - "project:custom-pack"
        - "kit:patterns"
      max_files: 10
      max_chars_per_file: 8000
    
    # Configuración de output
    output:
      mode_default: "diff"  # short+diff | diff | plan | structured
      max_bullets: 10
      never_include:
        - "*.generated.*"
        - "**/dist/**"
    
    # Configuración de delegación
    delegation:
      strategy: "agent_handoff"  # agent_handoff | router_split
      max_handoffs: 3
      allowed_subagents:
        - "worker-1"
        - "worker-2"
    
    # Configuración de skills
    skills:
      allowed:
        - "file_edit"
        - "run_terminal"
        - "custom_skill"
    
    # Configuración de routing
    intents:
      - "custom_intent_1"
      - "custom_intent_2"
    keywords:
      - "keyword1"
      - "keyword2"
    path_globs:
      - "src/**/*.ts"
      - "tests/**/*.test.ts"
```

---

## 🎨 Casos de Uso Comunes

### Caso de Uso 1: Aumentar Límites de Contexto

**Escenario:** Monorepo grande necesita más archivos por agente

```yaml
overrides:
  vitest-worker:
    context:
      max_files: 20           # Predeterminado: 8
      max_chars_per_file: 15000  # Predeterminado: 8000
```

**Por qué:** Los monorepos tienen más archivos de test que necesitan analizarse juntos.

---

### Caso de Uso 2: Personalizar Delegación

**Escenario:** Proyecto simple no necesita cadenas profundas de agentes

```yaml
overrides:
  test-orchestrator:
    delegation:
      max_handoffs: 2  # Reducido desde 3
      allowed_subagents:
        - vitest-worker  # Solo un worker necesario
```

**Por qué:** Proyectos más simples se benefician de menos handoffs.

---

### Caso de Uso 3: Estandarizar Modo de Output

**Escenario:** El equipo prefiere output solo-diff en todos los agentes

```yaml
overrides:
  vitest-worker:
    output:
      mode_default: diff
  test-orchestrator:
    output:
      mode_default: diff
```

**Por qué:** Formato de output consistente en todo el equipo.

---

### Caso de Uso 4: Añadir Contexto Específico del Proyecto

**Escenario:** Agente necesita acceso a documentación específica del proyecto

```yaml
overrides:
  vitest-worker:
    context:
      packs:
        - "project:architecture"
        - "project:testing-setup"
        - "kit:vitest-best-practices"
        - "kit:mocking-patterns"  # Pack adicional
```

**Por qué:** El proyecto tiene patrones de testing únicos que los agentes deben conocer.

---

### Caso de Uso 5: Restringir Skills

**Escenario:** Agente de solo lectura para propósitos de revisión

```yaml
overrides:
  code-reviewer:
    skills:
      allowed:
        - "search_codebase"
        - "read_file"
        # No file_edit, file_create, run_terminal
```

**Por qué:** Los agentes de revisión nunca deben modificar código.

---

### Caso de Uso 6: Mejorar Routing

**Escenario:** Añadir intents y keywords específicos del proyecto

```yaml
overrides:
  api-worker:
    intents:
      - "endpoint_creation"
      - "auth_implementation"
      - "graphql_resolver"  # Específico del proyecto
    keywords:
      - "api"
      - "endpoint"
      - "graphql"  # Específico del proyecto
      - "apollo"   # Específico del proyecto
```

**Por qué:** Mejor routing para terminología específica del proyecto.

---

## 🚀 Uso de CLI

### Sync Básico

```bash
# Sincronizar equipo (aplicar cambios)
agent-team team:sync --team my-team

# Salida:
# 🔄 Sincronizando equipo: my-team
# 
# 📊 Resumen:
#    Total agentes: 3
#    ✨ Nuevos:      2
#    📝 Actualizados: 1
#    ⏭️  Omitidos:   0
# 
# ✅ ¡Éxito! Agentes sincronizados a .github/agents/
```

### Modo Dry-Run

```bash
# Vista previa de cambios sin aplicar
agent-team team:sync --team my-team --dry-run

# Salida:
# 🔄 Sincronizando equipo: my-team (DRY RUN)
# 
# 📊 Resumen:
#    Total agentes: 3
#    ✨ Nuevos:      2
#    📝 Actualizados: 1
#    ⏭️  Omitidos:   0
# 
# 📋 Vista Previa de Cambios:
# ────────────────────────────────────────────────────────────
# 
# ✨ vitest-worker (crear)
#    Archivo: .github/agents/vitest-worker.agent.md
# 
# 📝 test-orchestrator (actualizar)
#    Archivo: .github/agents/test-orchestrator.agent.md
# 
# ============================================================
# CAMBIOS (3 en total)
# ============================================================
# 
# ~ context.max_files
#   Antes: 8
#   Después:  12
# 
# + context.packs
#   Valor: [4 items]
# 
# ~ delegation.max_handoffs
#   Antes: 3
#   Después:  2
# 
# ============================================================
# 
# ────────────────────────────────────────────────────────────
# 💡 Ejecutar sin --dry-run para aplicar cambios
```

### Omitir Salida de Diff

```bash
# Dry-run sin diff (más rápido para muchos cambios)
agent-team team:sync --team my-team --dry-run --no-diff

# Muestra solo resumen, sin diffs detallados
```

---

## 💻 Uso de la Extensión VS Code

### Paleta de Comandos

1. Abrir Paleta de Comandos (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Escribir: `Agent Team: Sync Team to .github/`
3. Seleccionar equipo de la lista
4. Elegir acción:
   - **Apply Changes** - Generar agentes
   - **Preview Changes (Dry Run)** - Ver qué cambiaría

### Salida de Dry-Run

Cuando eliges "Preview Changes", la extensión:

1. Muestra notificación de progreso
2. Genera resultado de sync
3. Abre **Panel de Output** con diff detallado
4. Muestra notificación de resumen

**Contenido del Panel de Output:**

```
============================================================
VISTA PREVIA DE SYNC DE EQUIPO: my-team
============================================================

📊 Resumen:
   Total agentes: 3
   ✨ Nuevos:      2
   📝 Actualizados: 1
   ⏭️  Omitidos:   0

📋 Cambios:
────────────────────────────────────────────────────────────

✨ vitest-worker (crear)
   Archivo: e:\project\.github\agents\vitest-worker.agent.md

📝 test-orchestrator (actualizar)
   Archivo: e:\project\.github\agents\test-orchestrator.agent.md

============================================================
CAMBIOS (3 en total)
============================================================

~ context.max_files
  Antes: 8
  Después:  12

+ context.packs
  Valor: [4 items]

============================================================

────────────────────────────────────────────────────────────
💡 Ejecutar sin dry-run para aplicar cambios
```

---

## 🧪 Testeando Tus Overrides

### Paso 1: Crear Equipo con Overrides

```yaml
# .agent-team/teams/test-team.yml
id: test-team
name: Test Team
kits:
  - testing-vitest

overrides:
  vitest-worker:
    context:
      max_files: 15
```

### Paso 2: Dry-Run para Vista Previa

```bash
agent-team team:sync --team test-team --dry-run
```

Revisar la salida para verificar que los overrides se aplican correctamente.

### Paso 3: Aplicar Cambios

```bash
agent-team team:sync --team test-team
```

### Paso 4: Verificar Agente Generado

```bash
cat .github/agents/vitest-worker.agent.md
```

Buscar el campo `_metadata.context.max_files` - debería ser `15`.

---

## 🎓 Mejores Prácticas

### 1. Usar Dry-Run Primero

**Siempre previsualizar cambios antes de aplicar:**

```bash
# ✅ Bien
agent-team team:sync --team my-team --dry-run
# Revisar cambios...
agent-team team:sync --team my-team

# ❌ Mal
agent-team team:sync --team my-team  # Sin vista previa
```

### 2. Override con Moderación

**Solo hacer override de lo necesario:**

```yaml
# ✅ Bien - Solo override de lo que necesita cambiar
overrides:
  vitest-worker:
    context:
      max_files: 15  # Solo esto

# ❌ Mal - Override de todo
overrides:
  vitest-worker:
    context:
      max_files: 15
      max_chars_per_file: 8000  # Ya es el predeterminado
    output:
      mode_default: short+diff  # Ya es el predeterminado
```

### 3. Documentar Tus Overrides

**Añadir comentarios explicando por qué:**

```yaml
overrides:
  vitest-worker:
    # El monorepo tiene muchos archivos de test interconectados
    context:
      max_files: 20
```

### 4. Usar Estrategias de Merge Sabiamente

**Elegir la estrategia correcta para tu caso de uso:**

```typescript
// La mayoría de casos - el equipo sabe mejor
{ mergeStrategy: 'team-priority' }  // Predeterminado

// El perfil está cuidadosamente diseñado
{ mergeStrategy: 'profile-priority' }

// El kit es estable, no hacer override
{ mergeStrategy: 'kit-priority' }

// Conservador, cambios mínimos
{ mergeStrategy: 'explicit-only' }
```

### 5. Versionar Tus Equipos

**Rastrear cambios de equipo como código:**

```yaml
id: my-team
name: My Team
version: 1.2.0  # Incrementar cuando cambien los overrides
```

---

## 🔍 Resolución de Problemas

### Override No Aplicado

**Problema:** Tu override no parece estar funcionando.

**Solución:**
1. Verificar schema - ¿está el campo escrito correctamente?
2. Ejecutar dry-run para ver si el override es detectado
3. Verificar estrategia de merge - podría estar usando la prioridad incorrecta
4. Verificar que el equipo se está sincronizando (no usando versión antigua)

### Conflictos No Resueltos Como Se Esperaba

**Problema:** La estrategia de merge no está funcionando como esperas.

**Solución:**
1. Entender estrategia:
   - `team-priority` = equipo gana
   - `profile-priority` = perfil gana
   - `kit-priority` = kit gana
2. Usar dry-run para ver resolución de conflictos
3. Verificar panel de output para decisiones de merge

### Demasiados Cambios en Dry-Run

**Problema:** Dry-run muestra muchos cambios que no esperabas.

**Solución:**
1. Verificar si el kit fue actualizado recientemente
2. Verificar que el perfil de proyecto es correcto
3. Usar `--no-diff` para ver resumen primero
4. Revisar overrides de equipo para cambios no intencionados

---

## 📚 Documentación Relacionada

- [Arquitectura de Kits y Teams](./architecture-kits-teams.md)
- [Schema de Perfil de Equipo](../schemas/team.schema.json)
- [Comandos de Extensión](./extension-commands-v2.md)
- [Context Packs Dinámicos](./dynamic-context-packs.md)

---

## 🎯 Resumen

Sprint 6 te da **control completo** sobre la composición de agentes:

✅ **Personalización por agente** - Override de cualquier propiedad  
✅ **Merge inteligente** - 4 estrategias para resolución de conflictos  
✅ **Modo dry-run** - Vista previa segura antes de aplicar  
✅ **Diffs visuales** - Ver cambios exactos  
✅ **CLI y VS Code** - Funciona en todas partes  

**Comienza a usarlo:**

```bash
# 1. Añadir overrides a tu equipo
vim .agent-team/teams/my-team.yml

# 2. Previsualizar cambios
agent-team team:sync --team my-team --dry-run

# 3. Aplicar si se ve bien
agent-team team:sync --team my-team
```

**¡Feliz composición! 🚀**
