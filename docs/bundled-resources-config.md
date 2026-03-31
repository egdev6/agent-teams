# Control de Recursos Empaquetados (Bundled Resources)

## Descripción

Agent Teams incluye agentes y skills empaquetados que son útiles durante el bootstrap inicial del proyecto, pero que pueden no ser necesarios una vez que el proyecto está configurado. El campo `bundled_resources` en `project.profile.yml` permite controlar qué agentes y skills empaquetados se activan en los tres targets soportados: **GitHub Copilot**, **Claude Code** y **OpenCode**.

## Agentes Empaquetados

Los siguientes agentes están incluidos en la extensión:

| Agente ID | Propósito | Útil para |
|-----------|-----------|-----------|
| `agent-designer` | Genera specs de agentes desde descripciones naturales o importa desde otros frameworks | Bootstrap inicial, creación de nuevos agentes |
| `consultant` | Analiza el equipo de agentes y propone mejoras (skills, MCPs, optimizaciones, arquitecturas) | Optimización periódica del equipo |
| `project-configurator` | Genera `project.profile.yml` y context packs analizando el workspace | Setup inicial del proyecto |

## Skills Empaquetadas

| Skill ID | Propósito | Útil para |
|----------|-----------|-----------|
| `agent-spec-authoring` | Schema y reglas para generar AgentSpec YAML válidos | Usado por `agent-designer` |
| `project-spec-authoring` | Schema y reglas para generar `project.profile.yml` y context packs | Usado por `project-configurator` |

## Configuración

### Ubicación

El campo se añade en `.agent-teams/project.profile.yml`:

```yaml
bundled_resources:
  agents:
    agent-designer: true      # habilitar/deshabilitar
    consultant: true
    project-configurator: true
  skills:
    agent-spec-authoring: true
    project-spec-authoring: true
```

### Valores Por Defecto

Si el campo `bundled_resources` no está presente, o si algún agente/skill no está listado, **todos se consideran habilitados por defecto**. Esto asegura compatibilidad con proyectos existentes.

### Deshabilitar Recursos de Bootstrap

Una vez que tu proyecto está configurado y ya no necesitas los agentes de meta-tooling, puedes deshabilitarlos:

```yaml
bundled_resources:
  agents:
    agent-designer: false         # ya no necesito crear más agentes
    consultant: true              # mantener para optimizaciones futuras
    project-configurator: false   # perfil ya está configurado
  skills:
    agent-spec-authoring: false   # skill solo usada por agent-designer
    project-spec-authoring: false # skill solo usada por project-configurator
```

### Ejemplo: Proyecto Maduro

Para un proyecto en producción que ya tiene su equipo de agentes bien definido:

```yaml
project:
  id: my-app
  name: My Application
  version: 1.2.0

bundled_resources:
  agents:
    agent-designer: false
    consultant: false
    project-configurator: false
  skills:
    agent-spec-authoring: false
    project-spec-authoring: false

technologies:
  typescript: true
  react: true
  vitest: true

# ... resto de la configuración
```

## Comportamiento

Cuando un agente o skill está deshabilitado:

### GitHub Copilot
- El agente **no se carga** en el `AgentLoader` interno de la extensión
- Los chat participants dinámicos (`@agent-designer`, etc.) **no están disponibles**

### Claude Code
- El comando slash (`.claude/commands/{agent-id}.md`) **no se genera**
- Si existe de una ejecución anterior, **se elimina automáticamente**

### OpenCode
- El archivo de agente (`.opencode/agents/{agent-id}.md`) **no se genera**
- Si existe de una ejecución anterior, **se elimina automáticamente**

### Skills
- Las skills deshabilitadas **no se copian** a `.agent-teams/skills/` durante el auto-restore del dashboard
- Si ya existen en el workspace, **no se eliminan** (permite edición manual)

## Cuándo Usar Esta Feature

### ✅ Deshabilitar cuando:
- Ya configuraste el proyecto con `project-configurator` y no planeas cambios mayores
- Tu equipo de agentes está estable y no necesitas `agent-designer` frecuentemente
- Quieres reducir el ruido en los autocompletes de Claude Code / OpenCode
- Estás en producción y solo necesitas los agentes de dominio específicos

### ⚠️ Mantener habilitado cuando:
- Estás en fase de experimentación y diseño de arquitectura
- Planeas añadir nuevos agentes o dominios al proyecto
- Quieres que `consultant` sugiera optimizaciones periódicamente
- El equipo está en constante evolución

## Recargar Cambios

Después de modificar `bundled_resources` en `project.profile.yml`:

1. **VS Code Extension**: Recarga la ventana (`Cmd/Ctrl + Shift + P` → "Developer: Reload Window")
2. **Claude Code**: Recarga automáticamente al detectar cambios en `.claude/commands/`
3. **OpenCode**: Recarga automáticamente al detectar cambios en `.opencode/agents/`

## FAQ

**¿Puedo deshabilitar solo algunos agentes y dejar otros activos?**  
Sí, el control es granular por agente y por skill.

**¿Qué pasa si borro el campo `bundled_resources` completamente?**  
Todos los agentes y skills vuelven a estar habilitados (comportamiento por defecto).

**¿Los agentes deshabilitados se eliminan de `.agent-teams/agents/`?**  
No. Este campo solo controla los **bundled agents** (empaquetados con la extensión), no los agentes custom del workspace.

**¿Puedo re-habilitar un agente después de deshabilitarlo?**  
Sí, solo cambia el valor a `true` y recarga la ventana de VS Code. Los archivos se regenerarán automáticamente.

**¿Afecta esto al comando `agent-teams sync`?**  
No. El sync solo trabaja con agentes del workspace (`.agent-teams/agents/`), no con bundled agents.

## Migración desde Versiones Anteriores

Si tu proyecto no tiene el campo `bundled_resources`, no necesitas hacer nada. Los agentes empaquetados seguirán funcionando como antes (todos habilitados).

Para empezar a usar esta feature, simplemente añade el bloque al profile:

```yaml
# Añadir al final de .agent-teams/project.profile.yml
bundled_resources:
  agents:
    agent-designer: true
    consultant: true
    project-configurator: true
  skills:
    agent-spec-authoring: true
    project-spec-authoring: true
```

Luego modifica los valores según tus necesidades.

---

**Versión del documento**: 1.0.0  
**Disponible desde**: Agent Teams v1.1.4
