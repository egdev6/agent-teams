# Arquitectura

**Tabla de Contenido**
- [Vision general](#vision-general)
- [Componentes](#componentes)
- [Flujo de datos](#flujo-de-datos)

---

## Vision general

El sistema `agent-team` sigue una arquitectura modular para la gestion del ciclo de vida de agentes IA en GitHub Copilot:

```
┌────────────────────────────────────────┐
│  Especificaciones YAML/JSON (specs/)     │
└──────────────────┬─────────────────────┘
                   │
                   ↓
┌──────────────────┘
│  Validacion      │
│  (JSON Schema)   │
└──────────┬─────────
         │
         ↓
┌──────────┘
│  Generacion  │
│  (.agent.md) │
└──────┬──────
       │
       ↓
┌──────┘
│  Sync   │
│  (.github/) │
└──────┬─────
       │
       ↓
┌──────┘
│  Copilot │
└─────────
```

## Componentes

### Router

El **Router** es responsable de:
- Recibir solicitudes del usuario
- Analizar intents y contexto
- Seleccionar el agente mas apropiado
- Delegar la tarea al agente elegido

**Ubicacion**: `specs/router.yml` → `agents/router-agent.md`

### Orchestrator

El **Orchestrator** coordina:
- Descomposicion de tareas complejas
- Delegacion a multiples subagentes
- Agregacion de resultados
- Gestion de handoffs entre agentes

**Estrategias**:
- `agent_handoff`: Delega completamente a un subagente
- `router_split`: Divide la tarea y la procesa en paralelo

### Workers

Los **Workers** son agentes especializados que:
- Ejecutan tareas especificas de un dominio
- No delegan a otros agentes (role: "solo")
- Retornan resultados estructurados

**Ejemplos**: backend-agent, frontend-agent, database-agent

## Flujo de datos

### 1. Desarrollo

```
Desarrollador → specs/*.yml → agents:create → agents/*.md
```

### 2. Validacion

```
agents/*.md → agents:validate → schemas/agent.schema.json
```

### 3. Distribucion

```
agent-team/ → agents:sync → proyecto/.github/agents/
```

### 4. Ejecucion

```
Usuario → Copilot → .github/agents/ → Agente apropiado → Respuesta
```
