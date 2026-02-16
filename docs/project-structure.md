# Guía de Estructura del Proyecto

Esta guía muestra cómo organizar **tu proyecto** al usar Agent Team.

## Repositorio Core (agent-team)

Esto es lo que clonas/instalas:

```
agent-team/                    # Sistema core (no editar)
├── extension/                 # Extensión VS Code
│   └── src/                   # Código de extensión
├── schemas/                   # JSON Schema
│   └── agent.schema.json
├── tools/                     # Herramientas CLI (opcional)
├── agents/
│   └── _templates/            # Templates Mustache
├── examples/                  # 📚 EMPIEZA AQUÍ
│   ├── test-agent.yml         # Agente de ejemplo
│   └── README.md              # Cómo crear agentes
├── docs/                      # Documentación del sistema
└── README.md
```

## Estructura de Tu Proyecto

Cuando usas Agent Team en tu proyecto:

```
tu-aplicacion-increible/       # Tu proyecto
├── src/                       # Tu código fuente
│   ├── components/
│   ├── api/
│   └── ...
│
├── specs/                     # 📝 TUS SPECS DE AGENTES (source of truth)
│   ├── backend-api.yml        # Especialista Backend API
│   ├── ui-components.yml      # Especialista componentes frontend
│   ├── testing.yml            # Especialista testing
│   └── router.yml             # Router de solicitudes
│
├── agents/                    # 🤖 GENERADOS (NO EDITAR)
│   ├── _templates/            # Link o copia desde agent-team
│   │   └── agent.template.md
│   ├── backend-api.md         # Auto-generado
│   ├── ui-components.md       # Auto-generado
│   ├── testing.md             # Auto-generado
│   └── router.md              # Auto-generado
│
├── .github/
│   └── agents/                # 🚀 SINCRONIZADO PARA COPILOT
│       ├── backend-api.agent.md
│       ├── ui-components.agent.md
│       ├── testing.agent.md
│       └── router.agent.md
│
├── package.json
└── README.md
```

## Pasos de Configuración

### 1. Instalar Extensión

```bash
# En el repo agent-team
cd extension
npm run package
code --install-extension agent-teams-extension-0.1.0.vsix
```

O esperar al lanzamiento en Marketplace.

### 2. Inicializar Tu Proyecto

```bash
cd tu-aplicacion-increible

# Crear directorios
mkdir -p .github/agents
mkdir -p specs

# Opcional: Copiar template
mkdir -p agents/_templates
cp ../agent-team/agents/_templates/agent.template.md agents/_templates/
```

### 3. Crear Tu Primer Agente

**Opción A: Wizard (Recomendado)**
```
1. Abrir VS Code en tu proyecto
2. Cmd/Ctrl + Shift + P
3. "Agent Team: Create New Agent"
4. Seguir wizard de 8 pasos
5. ✅ ¡Listo! Archivos creados automáticamente
```

**Opción B: Copiar Ejemplo**
```bash
# Copiar ejemplo como template
cp ../agent-team/examples/test-agent.yml specs/mi-agente.yml

# Editar specs/mi-agente.yml con tu configuración

# Generar
# - Click derecho en .yml → "Generate Agent from Spec"
# - O: pnpm agents:create --spec specs/mi-agente.yml
```

### 4. Usar Tus Agentes

En Copilot Chat:
```
@mi-agente crear un nuevo servicio de usuario
```

O usar router:
```
@router crear una API REST para gestión de usuarios
```

## Relaciones entre Archivos

```
┌─────────────────────────────────────────────────────────────┐
│                    Source of Truth                          │
│                 specs/backend-api.yml                       │
│  (Editar esto cuando necesites cambiar el agente)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ [Generar]
                     │ Extensión VS Code o CLI
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                 Markdown Generado                           │
│              agents/backend-api.md                          │
│     (NO EDITAR - Contiene banner "DO NOT EDIT")            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ [Sincronizar]
                     │ Comando de extensión o CLI
                     ↓
┌─────────────────────────────────────────────────────────────┐
│               Desplegado para Copilot                       │
│        .github/agents/backend-api.agent.md                  │
│           (Copilot lee desde aquí)                          │
└─────────────────────────────────────────────────────────────┘
```

## Escenarios Comunes

### Añadir un Nuevo Agente

```bash
# 1. Crear spec (wizard o manual)
Agent Team: Create New Agent

# 2. Archivos generados automáticamente:
#    - specs/nuevo-agente.yml
#    - agents/nuevo-agente.md
#    - .github/agents/nuevo-agente.agent.md

# 3. Recargar (usualmente auto-detectado)
Agent Team: Reload Agents

# 4. Usarlo
@nuevo-agente hacer algo
```

### Modificar un Agente

```bash
# 1. Editar source of truth
vim specs/backend-api.yml

# 2. Regenerar
Click derecho .yml → Generate Agent from Spec

# 3. Recargar (si es necesario)
Agent Team: Reload Agents

# 4. Probar cambios
@backend-api probar con nueva configuración
```

### Compartir Agentes entre Proyectos

```bash
# Exportar desde proyecto A
cp proyecto-a/specs/mi-agente.yml ~/biblioteca-agentes/

# Importar a proyecto B
cp ~/biblioteca-agentes/mi-agente.yml proyecto-b/specs/
cd proyecto-b
# Generar vía extensión o CLI
```

**Futuro (v2.0):** Los Agent Kits harán esto más sencillo con placeholders y equipos.

## Mejores Prácticas

### ✅ Hacer
- Mantener specs/ en control de versiones (git)
- Editar solo archivos specs/*.yml
- Usar IDs de agente significativos (backend-api, no agent1)
- Documentar tus agentes en specs
- Establecer límites de contexto apropiados (8K chars por defecto)

### ❌ No Hacer
- Editar archivos agents/*.md (se regeneran)
- Editar archivos .github/agents/*.agent.md (se sincronizan)
- Hacer commit de node_modules o dist/
- Usar límites de 100K chars (usar máximo 8K-16K)
- Crear demasiados agentes (empezar con 3-5)

## Workflow con Múltiples Proyectos

```
~/projects/
├── agent-team/                # Sistema core (actualizar con git pull)
│
├── proyecto-a/                # Proyecto A
│   ├── specs/
│   │   ├── backend.yml
│   │   └── frontend.yml
│   └── .github/agents/
│
├── proyecto-b/                # Proyecto B
│   ├── specs/
│   │   ├── api.yml
│   │   └── docs.yml
│   └── .github/agents/
│
└── agentes-compartidos/       # Biblioteca compartida (opcional)
    ├── testing-agent.yml
    ├── docs-agent.yml
    └── router-agent.yml
```

### Actualizar Core

```bash
cd ~/projects/agent-team
git pull origin main
pnpm install
pnpm -C extension compile

# Recargar extensión en VS Code:
# Developer: Reload Window
```

Tus proyectos no se ven afectados - solo usan la extensión.

## Solución de Problemas

### "Agente no detectado en Copilot"
```bash
# 1. Verificar que el archivo existe
ls .github/agents/mi-agente.agent.md

# 2. Recargar ventana
Cmd/Ctrl + Shift + P → "Developer: Reload Window"

# 3. Verificar que el agente carga
Agent Team: Select Agent
```

### "Errores de validación"
```bash
# Ver schema
cat ../agent-team/schemas/agent.schema.json

# Validar manualmente
pnpm agents:validate --spec specs/mi-agente.yml
```

### "Archivos generados desactualizados"
```bash
# Regenerar todos
Agent Team: Sync Agents to .github/

# O regenerar uno
Click derecho specs/mi-agente.yml → Generate Agent from Spec
```

## Próximos Pasos

1. **Leer:** [README de agent-team](../README.md)
2. **Estudiar:** [examples/README.md](../examples/README.md)
3. **Crear:** Tu primer agente con el wizard
4. **Explorar:** [Documentos de arquitectura](../docs/architecture.md)
5. **Escalar:** Crear agentes específicos por dominio

## ¿Preguntas?

- **Arquitectura:** [docs/architecture.md](../docs/architecture.md)
- **Routing:** [docs/routing.md](../docs/routing.md)
- **Delegación:** [docs/delegation.md](../docs/delegation.md)
- **Roadmap v2.0:** [docs/architecture-kits-teams.md](../docs/architecture-kits-teams.md)
