# Agent Team - All-in-One Extension

## 🎉 Nueva Arquitectura: Todo en VS Code

La extensión ahora incluye **toda la funcionalidad del CLI** con una experiencia visual integrada.

## ✨ Funcionalidades

### 🆕 Crear Agentes (NEW!)

**Comando:** `Agent Team: Create New Agent`

Wizard interactivo que te guía paso a paso:
1. Nombre del agente
2. Descripción
3. Dominio (backend, frontend, etc.)
4. Role (worker, orchestrator, router)
5. Intents
6. Path globs
7. Keywords

**Resultado:**
- Crea `specs/<agent-id>.yml`
- Genera `agents/<agent-id>.md`
- Sincroniza a `.github/agents/<agent-id>.agent.md`
- Registra participant automáticamente

### 📄 Generar desde Spec (NEW!)

**Comando:** `Agent Team: Generate Agent from Spec`

- Click derecho en cualquier archivo `.yml`/`.yaml` en Explorer
- O usa Command Palette
- Genera y sincroniza automáticamente

### 🔄 Sincronizar Agentes (NEW!)

**Comando:** `Agent Team: Sync Agents to .github/`

- Copia todos los agentes de `agents/` → `.github/agents/`
- Opción de limpiar archivos viejos
- Recarga automáticamente

### 🎯 Routing Inteligente

**Comando:** Usa `@router` en Copilot Chat

```
@router create a REST API for authentication
```

Router analiza y selecciona el mejor agente automáticamente.

### 📋 Selección Manual

**Comando:** `Agent Team: Select Agent Manually`

Muestra lista de agentes con descripción y te dice cómo invocarlos.

### 🔃 Recargar Agentes

**Comando:** `Agent Team: Reload Agents`

Recarga agentes sin reiniciar VS Code.

## 🚀 Flujo de Trabajo Completo

### Opción 1: Crear desde Cero (Visual)

```
1. Command Palette → "Agent Team: Create New Agent"
2. Completa el wizard
3. ✅ Listo para usar: @<agent-id> en Copilot Chat
```

**Sin terminal, sin comandos, todo visual.**

### Opción 2: Editar Spec → Generar

```
1. Edita specs/my-agent.yml
2. Click derecho → "Agent Team: Generate Agent from Spec"
3. ✅ Sincronizado automáticamente
```

### Opción 3: Desarrollo Manual + Sync

```
1. Editas specs/*.yml manualmente
2. Command Palette → "Agent Team: Sync Agents"
3. ✅ Todo sincronizado
```

## 📦 Instalación

### Desarrollo Local

```powershell
cd extension
npm install
npm run compile
code .  # F5 para Extension Development Host
```

### Desde VSIX (próximamente)

```
Extensions → ... → Install from VSIX
```

## ⚙️ Configuración

```json
{
  // Path a directorio de agentes
  "agentTeam.agentsPath": ".github/agents",
  
  // Routing automático
  "agentTeam.enableAutoRouting": true,
  
  // Path matching
  "agentTeam.enablePathMatching": true,
  
  // Nivel de logging
  "agentTeam.logLevel": "info"
}
```

## 🎬 Ejemplos de Uso

### Crear un Backend Agent

```
Command Palette → "Agent Team: Create New Agent"

Name: Backend API Specialist
Description: Expert in RESTful API development
Domain: backend
Role: worker
Intents: api_design, rest_api, crud_operations
Paths: src/api/**/*.ts, src/controllers/**
Keywords: api, endpoint, controller, route

→ Agente creado y listo para usar
```

### Usar el Nuevo Agente

```
@backend-api-specialist create CRUD endpoints for users
```

### Routing Automático

```
@router implement user authentication with JWT

→ Router detecta: auth_implementation, api_design
→ Selecciona: backend-api-specialist
→ Respuesta especializada con contexto backend
```

## 📊 Ventajas vs CLI Separado

| Aspecto | CLI Separado | Extensión All-in-One |
|---------|--------------|----------------------|
| Crear agente | `npm run agents:create` | Click en Command Palette |
| UI | Terminal | Wizard visual |
| Sincronizar | `npm run agents:sync` | Automático |
| Aprender | Leer docs | Guía interactiva |
| Validación | Post-generación | Tiempo real |
| Debugging | Logs en terminal | Output panel integrado |
| Compartir | Instruir comandos | "Instala extensión" |

## 🔧 Para Desarrolladores

### Estructura

```
extension/src/
├── extension.ts         - Entry point + comandos
├── agentLoader.ts       - Carga agentes
├── agentGenerator.ts    - ⭐ Crea/valida/sincroniza
├── router.ts            - Routing inteligente
├── orchestrator.ts      - Orquestación
├── logger.ts            - Logging
└── types.ts             - Tipos TypeScript
```

### Agregar Nuevos Comandos

```typescript
// En extension.ts
context.subscriptions.push(
  vscode.commands.registerCommand('agent-team.myCommand', async () => {
    // Tu lógica aquí
  })
);
```

## 🐛 Troubleshooting

**Agentes no aparecen:**
- Verifica que `.github/agents/*.agent.md` existan
- Ejecuta "Agent Team: Reload Agents"
- Revisa Output panel (Agent Team)

**Error al crear agente:**
- Verifica que `schemas/agent.schema.json` exista
- Revisa logs en Output panel con logLevel: "debug"

**Routing no funciona:**
- Verifica que _metadata tenga intents definidos
- Revisa que enableAutoRouting esté en true
- Consulta logs con logLevel: "debug"

## 📚 Documentación Adicional

- [Arquitectura Completa](../../docs/vscode-extension-architecture.md)
- [Flujo del Sistema](../../docs/complete-system-flow.txt)
- [Documentación Principal](../../README.md)

## 🎯 Roadmap

- [x] Routing inteligente
- [x] Crear agentes con wizard
- [x] Sincronización integrada
- [x] Validación en tiempo real
- [ ] Editor visual de specs
- [ ] Preview de agentes antes de crear
- [ ] Import/export de agentes
- [ ] Telemetría de uso para mejorar routing
- [ ] Templates customizables desde UI
- [ ] Multi-workspace support

## 📄 Licencia

MIT
