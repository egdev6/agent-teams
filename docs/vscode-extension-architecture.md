# 🎯 Arquitectura: Enfoque de Extensión VS Code

## Resumen

La **Extensión Agent Team** implementa características avanzadas de routing, orquestación y coordinación multi-agente que los agentes nativos de Copilot de VS Code no soportan de forma predeterminada.

## ¿Por qué una Extensión?

### Problema
Los archivos `.agent.md` de VS Code solo soportan:
- `name` (string)
- `description` (string)
- `welcomeMessage` opcional
- `tools` opcional

Nuestras specs de agentes tienen metadata rica:
- **Intents**: Patrones de intención del usuario para routing
- **Path globs**: Coincidencia de patrones de archivos
- **Keywords**: Vocabulario de dominio
- **Orchestration**: Coordinación multi-agente
- **Verification**: Reglas de validación de output

### Solución
Una extensión de VS Code que:
1. ✅ Mantiene agentes **compatibles con VS Code** (frontmatter simple)
2. ✅ Almacena metadata en **comentarios HTML** (invisible para VS Code)
3. ✅ Implementa **routing personalizado** usando Chat Participants API
4. ✅ Proporciona capacidades de **orquestación** y **delegación**
5. ✅ Mantiene retrocompatibilidad con herramientas CLI

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     VS Code Workspace                            │
│                                                                  │
│  .github/agents/                                                │
│  ├── backend-agent.agent.md  ← Frontmatter compatible VS Code   │
│  ├── frontend-agent.agent.md                                    │
│  └── router-agent.agent.md                                      │
│                                                                  │
│  specs/                                                          │
│  ├── backend-complete.yml    ← Metadata completa (_metadata)    │
│  ├── frontend-complete.yml                                      │
│  └── router-complete.yml                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│              Extensión Agent Team (extension/)                    │
│                                                                   │
│  ┌────────────────────┐   ┌──────────────────────────────┐      │
│  │  AgentLoader       │   │       AgentRouter            │      │
│  │                    │   │                              │      │
│  │  • Escanear .agent.md│  │  Detección de Intent:        │      │
│  │  • Parsear metadata│   │  ├─ Mapeo de keywords        │      │
│  │  • Cargar desde specs│  │  └─ Coincidencia de patrones │      │
│  │  • Construir registry│  │                              │      │
│  └────────────────────┘   │  Coincidencia de Path:       │      │
│           ↓                │  ├─ Patrones Glob            │      │
│  ┌────────────────────┐   │  └─ Contexto del archivo actual│    │
│  │  Chat Participants │   │                              │      │
│  │                    │   │  Puntuación:                 │      │
│  │  @router           │───┤  ├─ Intent: 100pts c/u       │      │
│  │  @backend-agent    │   │  ├─ Path: 50pts              │      │
│  │  @frontend-agent   │   │  ├─ Keywords: 20pts c/u      │      │
│  │  @<dinámico>       │   │  └─ Domain: 10pts            │      │
│  └────────────────────┘   └──────────────────────────────┘      │
│           ↓                                                      │
│  ┌──────────────────────────────────────────────────────┐       │
│  │           AgentOrchestrator                          │       │
│  │                                                      │       │
│  │  • Delegación paralela                              │       │
│  │  • División de tareas                               │       │
│  │  • Agregación de respuestas                         │       │
│  │  • Gestión de handoffs                              │       │
│  └──────────────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────────┘
                                  ↓
┌───────────────────────────────────────────────────────────────────┐
│                   GitHub Copilot LLM                              │
│                                                                   │
│  Cada agente participante envía:                                 │
│  - Instrucciones del agente (desde contenido markdown)           │
│  - Prompt del usuario                                            │
│  - Contexto (archivo, workspace, etc.)                           │
└───────────────────────────────────────────────────────────────────┘
```

## Flujo de Request

### Ejemplo: Request Compleja con Auto-Routing

**Usuario en Copilot Chat:**
```
@router Crear un sistema de autenticación de usuarios con UI de login
```

**Flujo:**

```
1. Input del Usuario
   ↓
2. Router Participant Handler
   ├─ Parsear prompt: "sistema de autenticación", "UI de login"
   ├─ Detectar intents: [auth_implementation, ui_creation]
   ├─ Obtener contexto del archivo actual
   └─ Puntuar todos los agentes
   
3. AgentRouter.route()
   ├─ Puntuación: backend-agent = 150 (auth_implementation: 100 + keywords: 50)
   ├─ Puntuación: frontend-agent = 120 (ui_creation: 100 + keywords: 20)
   └─ Decisión: Tarea multi-dominio detectada
   
4. [FUTURO] Orchestrator divide tarea:
   ├─ Subtarea 1 → @backend-agent: "Crear endpoints API de auth"
   ├─ Subtarea 2 → @frontend-agent: "Crear formulario UI de login"
   └─ Ejecutar en paralelo
   
5. Delegar a cada agente
   ├─ Backend: Cargar instrucciones + enviar a LLM
   └─ Frontend: Cargar instrucciones + enviar a LLM
   
6. Agregar respuestas
   └─ Presentar solución unificada al usuario
```

### Ejemplo: Invocación Directa

**Usuario en Copilot Chat:**
```
@backend-agent Añadir validación de input al endpoint de signup
```

**Flujo:**

```
1. Input del Usuario (@backend-agent)
   ↓
2. Backend Participant Handler
   ├─ No se necesita routing
   └─ Invocación directa
   
3. Cargar contexto del agente
   ├─ Instrucciones desde backend-agent.agent.md
   └─ Prompt del usuario
   
4. Enviar a LLM
   └─ Stream de respuesta al chat
```

## Detalles de Componentes

### AgentLoader (`agentLoader.ts`)

**Responsabilidades:**
- Escanear directorio `.github/agents/`
- Parsear archivos markdown con frontmatter YAML
- Extraer metadata de comentarios HTML
- Opcionalmente cargar specs completas desde directorio `specs/`
- Mantener registro de agentes

**Métodos Clave:**
```typescript
loadAgents(workspaceRoot: string, agentsPath: string): Promise<void>
getAgent(id: string): AgentSpec | undefined
getAllAgents(): AgentSpec[]
getAgentsByDomain(domain: string): AgentSpec[]
getAgentsByRole(role: string): AgentSpec[]
```

### AgentRouter (`router.ts`)

**Responsabilidades:**
- Analizar prompts del usuario para detectar intent
- Coincidir rutas de archivos contra globs del agente
- Extraer keywords de dominio
- Puntuar agentes por relevancia
- Seleccionar mejor(es) agente(s) para la request

**Algoritmo de Puntuación:**
```typescript
puntuación = (intents_coincidentes.length × 100)
           + (path_match ? 50 : 0)
           + (keywords_coincidentes.length × 20)
           + (especificidad_dominio × 10)
```

**Métodos Clave:**
```typescript
route(prompt: string, currentFile?: string): Promise<AgentSpec | null>
getSuggestions(prompt: string, currentFile?: string): Promise<AgentScore[]>
detectIntents(prompt: string): string[]
matchesPathGlobs(agent: AgentSpec, filePath?: string): boolean
```

### AgentOrchestrator (`orchestrator.ts`)

**Responsabilidades:**
- Gestionar delegación a subagentes
- Ejecutar tareas en paralelo
- Agregar respuestas
- Manejar handoffs

**Métodos Clave:**
```typescript
delegate(request: DelegationRequest, ...): Promise<DelegationResponse>
delegateParallel(requests: DelegationRequest[], ...): Promise<DelegationResponse[]>
aggregateResponses(responses: DelegationResponse[]): string
canDelegateTo(orchestrator: AgentSpec, targetId: string): boolean
```

### Chat Participants (`extension.ts`)

**Registrados:**
- `@router` - Participante de routing inteligente
- `@<agent-id>` - Un participante por agente cargado (dinámico)

**Lógica del Handler:**
```typescript
async function handleRouterRequest() {
  1. Verificar si auto-routing está habilitado
  2. Obtener contexto del archivo actual
  3. Enrutar al mejor agente
  4. Mostrar decisión de routing
  5. Delegar al agente seleccionado
}

async function handleAgentRequest(agentId) {
  1. Cargar instrucciones del agente
  2. Construir mensajes LLM
  3. Enviar al modelo
  4. Stream de respuesta
}
```

## Configuración

Los usuarios pueden personalizar comportamiento via settings de VS Code:

```json
{
  "agentTeam.agentsPath": ".github/agents",
  "agentTeam.enableAutoRouting": true,
  "agentTeam.enablePathMatching": true,
  "agentTeam.logLevel": "info"
}
```

## Beneficios

### ✅ Para Usuarios
- Selección de agentes en lenguaje natural
- Routing consciente del contexto basado en archivo actual
- Selección de agentes transparente con razonamiento
- Opción de seleccionar agentes manualmente

### ✅ Para Desarrolladores
- Control completo sobre lógica de routing
- Fácil de extender con nuevos intents/patrones
- Logging de debug para decisiones de routing
- Type safety de TypeScript

### ✅ Para Specs de Agentes
- Mantener compatibilidad con VS Code
- Preservar toda la metadata
- Usar mismas specs para CLI y extensión
- Sin duplicación

## Mejoras Futuras

### Fase 2: Orquestación Avanzada
- [ ] División de tareas para requests complejas multi-dominio
- [ ] Ejecución paralela de agentes
- [ ] Agregación y síntesis de respuestas
- [ ] Cadenas de handoff con paso de contexto

### Fase 3: Aprendizaje y Optimización
- [ ] Rastrear éxito/fallo de routing
- [ ] Aprender de correcciones del usuario (selección manual de agente)
- [ ] Ajustar pesos de puntuación basado en feedback
- [ ] Sugerir nuevos intents/keywords

### Fase 4: Mejoras de UI
- [ ] Selector visual de agentes con preview de puntuación
- [ ] Indicador de actividad de agente en barra de estado
- [ ] Visualización de decisión de routing
- [ ] Métricas de rendimiento de agentes

## Comparación: CLI vs Extensión

| Característica | Herramientas CLI | Extensión VS Code |
|---------|-----------|-------------------|
| Generar agentes | ✅ Sí | ❌ No (usa output de CLI) |
| Validar specs | ✅ Sí | ❌ No (usa output de CLI) |
| Sync a workspace | ✅ Sí | ❌ No (usa output de CLI) |
| Cargar agentes | ❌ No | ✅ Sí (desde disco) |
| Enrutar requests | ❌ No | ✅ Sí (basado en intent) |
| Integración chat | ❌ No | ✅ Sí (participants) |
| Orquestación | ❌ No | ✅ Sí |
| Interacción en vivo | ❌ No | ✅ Sí |

**Roles complementarios:**
- CLI: Autoría de agentes, validación, generación
- Extensión: Invocación de agentes, routing, orquestación

## Empezando

Ver [extension/INSTALLATION.md](./extension/INSTALLATION.md) para instrucciones de setup.

**Inicio rápido:**
```powershell
cd extension
npm install
npm run compile
code .  # Presionar F5 para lanzar Extension Development Host
```

Luego en Copilot Chat:
```
@router crear un endpoint REST API para productos
```
