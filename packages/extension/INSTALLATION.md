# Agent Team Extension - Development & Installation Guide

## 📦 Installation Steps

### Option 1: Local Development

1. **Navigate to extension directory:**
   ```powershell
   cd e:\Proyectos\agent-team\extension
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Compile TypeScript:**
   ```powershell
   npm run compile
   ```

4. **Open in VS Code:**
   ```powershell
   code .
   ```

5. **Press F5** to launch Extension Development Host

### Option 2: Package and Install

1. **Build the extension:**
   ```powershell
   npm install
   npm run compile
   npm run package
   ```

2. **Install the .vsix file:**
   - Open VS Code
   - Go to Extensions panel
   - Click "..." menu → "Install from VSIX"
   - Select the generated `.vsix` file

## 🔧 How It Works

### Architecture

```
┌─────────────────────────────────────────────────────┐
│              VS Code Extension Host                  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │         Agent Team Extension                  │  │
│  │                                               │  │
│  │  ┌─────────────┐  ┌────────────────────┐    │  │
│  │  │ AgentLoader │  │   AgentRouter      │    │  │
│  │  │             │  │  - Intent detect   │    │  │
│  │  │ Loads .md   │  │  - Path matching   │    │  │
│  │  │ files with  │  │  - Keyword match   │    │  │
│  │  │ frontmatter │  │  - Scoring system  │    │  │
│  │  └─────────────┘  └────────────────────┘    │  │
│  │                                               │  │
│  │  ┌──────────────────────────────────────┐   │  │
│  │  │      Chat Participants               │   │  │
│  │  │  - @router (smart routing)           │   │  │
│  │  │  - @backend-agent                    │   │  │
│  │  │  - @frontend-agent                   │   │  │
│  │  │  - @<dynamic-agents>                 │   │  │
│  │  └──────────────────────────────────────┘   │  │
│  │                                               │  │
│  │  ┌──────────────────────────────────────┐   │  │
│  │  │   AgentOrchestrator                  │   │  │
│  │  │  - Delegation                        │   │  │
│  │  │  - Parallel execution                │   │  │
│  │  │  - Response aggregation              │   │  │
│  │  └──────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
│                        ↓                            │
│              GitHub Copilot LLM                     │
└─────────────────────────────────────────────────────┘
```

### Key Components

#### 1. **AgentLoader** (`agentLoader.ts`)
- Scans `.github/agents/` directory
- Parses markdown files with frontmatter
- Extracts metadata from HTML comments
- Maintains agent registry

#### 2. **AgentRouter** (`router.ts`)
- **Intent Detection**: Maps keywords to intents
  - Example: "api", "endpoint" → `api_design`
  - Example: "component", "react" → `component_creation`
  
- **Path Matching**: Glob patterns against current file
  - Example: `src/api/**/*.ts` matches backend files
  
- **Keyword Matching**: Domain-specific vocabulary
  - Example: "authentication", "middleware" → backend agent
  
- **Scoring Algorithm**:
  ```
  score = (matched_intents × 100) 
       + (path_match × 50) 
       + (keywords × 20)
       + (domain_specificity × 10)
  ```

#### 3. **AgentOrchestrator** (`orchestrator.ts`)
- Manages agent delegation
- Supports parallel task execution
- Aggregates multi-agent responses

#### 4. **Chat Participants** (`extension.ts`)
- `@router`: Automatic routing with smart selection
- `@<agent-id>`: Direct agent invocation
- Dynamic registration based on loaded agents

## 🎯 Usage Examples

### Scenario 1: Automatic Routing

**User in Copilot Chat:**
```
@router create a REST API endpoint for user authentication
```

**What happens:**
1. Router analyzes: "REST API", "endpoint", "authentication"
2. Detects intents: `api_design`, `auth_implementation`
3. Matches keywords: "authentication" → backend domain
4. Scores all agents, selects `@backend-agent`
5. Delegates with full context
6. Streams response from backend agent

### Scenario 2: Path-Based Activation

**User editing:** `src/components/Header.tsx`  
**User in Copilot Chat:**
```
@router add a dark mode toggle
```

**What happens:**
1. Router detects current file: `src/components/Header.tsx`
2. Checks path globs: `src/components/**/*.tsx` matches frontend agent
3. Detects intent: `component_modification`
4. Routes to `@frontend-agent` with +50 path bonus

### Scenario 3: Direct Invocation

**User in Copilot Chat:**
```
@backend-agent implement rate limiting middleware
```

**What happens:**
1. No routing needed - direct invocation
2. Backend agent instructions loaded
3. LLM invoked with agent context
4. Response streamed to chat

### Scenario 4: Orchestration (Future)

**Router agent detects complex request:**
```
Create a full CRUD feature for products with frontend UI
```

**What happens:**
1. Router identifies multi-domain task
2. Delegates to orchestrator agent
3. Orchestrator splits:
   - Task 1 → `@backend-agent`: Create API endpoints
   - Task 2 → `@frontend-agent`: Create UI components
4. Executes in parallel
5. Aggregates responses

## ⚙️ Configuration

### Settings (`settings.json`)

```json
{
  // Path to agents directory (relative to workspace root)
  "agentTeam.agentsPath": ".github/agents",
  
  // Enable automatic routing via @router
  "agentTeam.enableAutoRouting": true,
  
  // Enable path-based agent activation
  "agentTeam.enablePathMatching": true,
  
  // Log level for debugging
  "agentTeam.logLevel": "info"  // debug | info | warn | error
}
```

### Debugging

1. Set log level to `debug`:
   ```json
   "agentTeam.logLevel": "debug"
   ```

2. Open Output panel:
   - View → Output
   - Select "Agent Team" from dropdown

3. View detailed logs:
   - Agent loading
   - Routing decisions
   - Intent detection
   - Score calculations

## 🧪 Testing Checklist

- [ ] Extension loads without errors
- [ ] Agents loaded from `.github/agents/`
- [ ] `@router` participant available in chat
- [ ] Individual agent participants available
- [ ] Routing selects correct agent
- [ ] Direct invocation works
- [ ] Configuration changes applied
- [ ] Reload agents command works
- [ ] Manual agent picker works
- [ ] Logs visible in Output panel

## 🚀 Next Steps

1. **Test locally** with your existing agents
2. **Iterate on routing logic** based on real usage
3. **Add more intent mappings** for your domain
4. **Implement orchestration** for complex workflows
5. **Package and share** with your team

## 📝 Notes

- The router uses **metadata from _metadata section** in YAML specs
- VS Code only reads **name + description** from frontmatter
- All advanced features (intents, paths, keywords) are **extension-managed**
- This approach keeps agents **VS Code-compatible** while adding power features
