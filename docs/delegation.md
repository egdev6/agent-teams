# Delegacion

**Tabla de Contenido**
- [Responsabilidades del Orchestrator](#responsabilidades-del-orchestrator)
- [Maximo de handoffs](#maximo-de-handoffs)
- [Subagentes permitidos](#subagentes-permitidos)

---

## Responsabilidades del Orchestrator

Un agente con `role: "orchestrator"` tiene las siguientes responsabilidades:

### 1. Analisis de tareas

- Descomponer solicitudes complejas en subtareas
- Identificar dependencias entre subtareas
- Determinar el orden de ejecucion

### 2. Seleccion de subagentes

- Elegir el subagente mas apropiado para cada subtarea
- Verificar que el subagente este en la lista `allowed_subagents`
- Validar capacidades del subagente (intents, domain)

### 3. Delegacion de trabajo

**Estrategia: agent_handoff**

```yaml
delegation:
  role: "orchestrator"
  strategy: "agent_handoff"
  allowed_subagents:
    - "backend-agent"
    - "frontend-agent"
  max_handoffs: 3
```

El orchestrator:
1. Analiza la solicitud
2. Selecciona un subagente
3. Transfiere el control completamente
4. El subagente retorna el resultado
5. El orchestrator agrega y presenta

**Estrategia: router_split**

```yaml
delegation:
  role: "orchestrator"
  strategy: "router_split"
  allowed_subagents:
    - "backend-agent"
    - "database-agent"
  max_handoffs: 5
```

El orchestrator:
1. Divide la tarea en subtareas paralelas
2. Delega cada subtarea a un subagente diferente
3. Espera y agrega resultados
4. Presenta resultado consolidado

### 4. Agregacion de resultados

- Combinar outputs de multiples subagentes
- Resolver conflictos o inconsistencias
- Formatear respuesta unificada
- Aplicar el `output.schema` definido

## Maximo de handoffs

El campo `max_handoffs` limita el numero de delegaciones:

```yaml
delegation:
  max_handoffs: 3
```

**Comportamiento**:
- `0`: Sin delegacion (agente solo)
- `1-10`: Numero maximo de handoffs permitidos
- **Recomendado**: 2-5 para evitar cadenas largas

**Ejemplo de conteo**:

```
Orchestrator (max_handoffs: 3)
  │
  ├── Handoff 1 → backend-agent
  │
  ├── Handoff 2 → database-agent
  │
  └── Handoff 3 → frontend-agent
```

Despues del limite, el orchestrator debe:
- Completar el trabajo el mismo
- Retornar error si no puede proceder
- Informar al usuario del limite alcanzado

## Subagentes permitidos

La lista `allowed_subagents` define explicitamente los agentes a los que se puede delegar:

```yaml
delegation:
  allowed_subagents:
    - "backend-agent"
    - "frontend-agent"
    - "database-agent"
```

**Reglas**:

1. **Lista explicita**: Solo IDs listados pueden ser invocados
2. **Validacion**: El sistema verifica que los IDs existan
3. **Seguridad**: Previene delegacion no autorizada
4. **Auditoria**: Permite rastrear cadenas de delegacion

**Ejemplo de validacion**:

```yaml
# Orchestrator
delegation:
  allowed_subagents:
    - "backend-agent"
    - "frontend-agent"
```

✅ Permitido: delegar a `backend-agent`
✅ Permitido: delegar a `frontend-agent`
❌ Rechazado: delegar a `database-agent` (no esta en la lista)

**Workers**:

```yaml
# Worker
delegation:
  role: "solo"
  strategy: "disabled"
  allowed_subagents: []
  max_handoffs: 0
```

Los workers no pueden delegar:
- `role: "solo"`
- `strategy: "disabled"`
- `allowed_subagents` debe estar vacio
- `max_handoffs` debe ser `0`
