# Agent Teams Sync System

Complete technical documentation for the Agent Teams sync system, including architecture, optimizations, and troubleshooting.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Sync Flow](#sync-flow)
- [Dry Run System](#dry-run-system)
- [Performance Optimizations](#performance-optimizations)
- [UI States](#ui-states)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Agent Teams sync system is responsible for:
1. **Composing** agent specs from YAML definitions + project profile + team overrides
2. **Detecting changes** between source specs and target files
3. **Writing agent files** to multiple sync targets (GitHub Copilot, Claude Code, etc.)
4. **Providing real-time feedback** to users via the dashboard UI

### Key Components

```
┌─────────────────┐
│   Dashboard     │  ← User initiates sync, sees status
│      UI         │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ DashboardPanel  │  ← Orchestrates dry runs, manages state
│   (extension)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  TeamManager    │  ← Performs actual sync operations
│   (extension)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ AgentComposer   │  ← Composes agent specs
│     (core)      │
└─────────────────┘
```

![Sync System Architecture](./images/sync-architecture.png)
<!-- Image: High-level architecture diagram showing Dashboard → DashboardPanel → TeamManager → AgentComposer → Disk -->

---

## Architecture

### Components

#### 1. **DashboardPanel** (`packages/extension/src/dashboardPanel.ts`)
- Manages UI state and user interactions
- Schedules and executes dry runs
- Caches dry run results for performance
- Tracks workspace changes via file watchers

**Key Responsibilities:**
- Initial dry run on dashboard load (CHECKING state)
- Debounced dry runs on file changes (M5 optimization)
- Incremental change detection (M1 optimization)
- Cache management and invalidation (M3 optimization)

#### 2. **TeamManager** (`packages/extension/src/teamManager.ts`)
- Executes sync operations (dry run or real)
- Composes agents via AgentComposer
- Compares existing files with new content
- Writes files to sync targets

**Key Responsibilities:**
- Agent composition pipeline
- Change detection (create/update/delete/skip)
- Markdown generation for agent files
- Hash-based comparison (M2 optimization)

#### 3. **AgentComposer** (`packages/core/src/composer.ts`)
- Merges agent spec + profile + team overrides
- Resolves placeholders and references
- Validates composed specs
- Produces `ComposedAgentSpec` objects

---

## Sync Flow

### Complete Sync Lifecycle

```
User Action: Open Dashboard
         │
         ↓
    [CHECKING State]
         │
         ↓
  Schedule Dry Run (500ms delay)
         │
         ↓
┌────────────────────────────────┐
│     DRY RUN EXECUTION          │
├────────────────────────────────┤
│ 1. Get workspace signature     │
│ 2. Check cache (M4)            │
│ 3. Detect agent changes (M1)   │
│ 4. Compose agents              │
│ 5. Compare with targets (M2)   │
│ 6. Build change summary        │
│ 7. Cache results               │
└────────┬───────────────────────┘
         │
         ↓
    [NEEDS_SYNC / SUCCESS / ERROR]
         │
         ↓ (User clicks "Sync Now")
         │
┌────────────────────────────────┐
│      REAL SYNC EXECUTION       │
├────────────────────────────────┤
│ 1. Validate preconditions      │
│ 2. Compose agents              │
│ 3. Write files to disk         │
│ 4. Show progress notification  │
│ 5. Clear cache                 │
│ 6. Run post-sync dry run       │
└────────┬───────────────────────┘
         │
         ↓
    [SUCCESS State]
```

![Sync Flow Diagram](./images/sync-flow.png)
<!-- Image: Flowchart showing the complete sync lifecycle from dashboard open to sync complete -->

### Dry Run vs Real Sync

| Aspect | Dry Run | Real Sync |
|--------|---------|-----------|
| **Writes Files** | ❌ No | ✅ Yes |
| **Shows Diff** | ❌ No (unless requested) | ❌ No (unless requested) |
| **Updates Cache** | ✅ Yes | ❌ No (clears cache) |
| **User Feedback** | Silent (updates UI) | Progress notification |
| **Post-Operation** | Updates dashboard state | Runs dry run to refresh |
| **Performance** | 18-150ms (optimized) | 200-500ms (writes files) |

---

## Dry Run System

### Purpose
Dry runs detect pending changes **without writing files**. They run:
1. **On dashboard load** (initial check)
2. **After file changes** (debounced, 500ms-5s depending on urgency)
3. **After real sync** (immediate, non-blocking)

### Execution Flow

```typescript
async _runDryRunSync() {
  // Guard: Prevent concurrent dry runs
  if (_dryRunInFlight) return;
  
  // Check cache validity (M4)
  const signature = _getWorkspaceStateSignature();
  if (_dryRunSignature === signature && _dryRunCache) {
    return; // Cache hit, no work needed
  }
  
  // Quick change detection (M1)
  const hasChanges = await _detectAgentSpecChanges(teamId);
  if (!hasChanges && _dryRunCache) {
    _dryRunSignature = signature;
    return; // Specs unchanged, update signature only
  }
  
  // Execute dry run
  _dryRunInFlight = true;
  const result = await teamManager.syncTeam(workspaceRoot, teamId, {
    dryRun: true,
    showDiff: false,
  });
  
  _dryRunCache = result;
  _dryRunSignature = signature;
  _initialDryRunComplete = true;
  _dryRunInFlight = false;
  
  _pushStats(); // Update UI
}
```

### Cache Structure

```typescript
interface SyncResult {
  summary: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    total: number;
  };
  changes: Array<{
    agentId: string;
    action: 'create' | 'update' | 'delete' | 'skip';
    filepath: string;
    diff?: string;
  }>;
  agents: ComposedAgentSpec[];
  targets: SyncTarget[];
}
```

---

## Performance Optimizations

Six optimizations (M1-M6) reduce dry run time from ~800ms to 18-150ms.

### M1: Incremental Detection

**Problem:** Every dry run composed all agents, even if specs unchanged.

**Solution:** Hash-based tracking of agent spec files.

```typescript
// Track each agent spec's hash
_agentSpecHashes = new Map<string, string>();

async _detectAgentSpecChanges(teamId: string): Promise<boolean> {
  const agentIds = getEnabledAgents(teamId);
  
  // First run: populate cache, report changes
  if (_agentSpecHashes.size === 0) {
    await _updateAgentSpecHashes(agentIds);
    return true;
  }
  
  // Check each spec for changes
  let changedCount = 0;
  for (const agentId of agentIds) {
    const currentHash = _hashFile(getSpecPath(agentId));
    const cachedHash = _agentSpecHashes.get(agentId);
    if (currentHash !== cachedHash) {
      changedCount++;
    }
  }
  
  return changedCount > 0;
}
```

**Impact:** Skips composition when specs unchanged (~90% of dry runs after initial load).

![M1 Incremental Detection](./images/m1-incremental-detection.png)
<!-- Image: Flowchart showing hash comparison logic and cache hit/miss paths -->

---

### M2: Lazy Diff Generation

**Problem:** Generating markdown and diffs for comparison was expensive.

**Solution:** Compare markdown content hashes instead of generating diffs.

```typescript
trackAgentChange(composed: ComposedAgentSpec, target: TargetPaths) {
  const filepath = getTargetPath(composed.id, target);
  
  if (fs.existsSync(filepath)) {
    // Generate markdown for new agent
    const newContent = generateAgentMarkdown(composed, target);
    const existingContent = fs.readFileSync(filepath, 'utf-8');
    
    // Compare hashes
    const newHash = sha256(newContent);
    const existingHash = sha256(existingContent);
    
    if (newHash === existingHash) {
      return { action: 'skip' };
    }
    
    // Only generate diff if requested
    if (showDiff) {
      const diff = createDiff(existingContent, newContent);
      return { action: 'update', diff };
    }
    
    return { action: 'update' };
  }
  
  return { action: 'create' };
}
```

**Impact:** Avoids diff generation in dry runs (~30% speedup).

**Note:** Still generates markdown for accurate comparison (markdown-to-markdown hash comparison).

![M2 Lazy Diff](./images/m2-lazy-diff.png)
<!-- Image: Comparison showing old approach (generate diff always) vs new (hash first, diff only if requested) -->

---

### M3: Smart Cache Invalidation

**Problem:** Any file change cleared entire dry run cache, causing full re-sync.

**Solution:** Invalidate only affected agents.

```typescript
// File watcher callback
onAgentSpecChange(changedFile: string) {
  const agentId = getAgentIdFromPath(changedFile);
  
  // Invalidate only this agent's hash
  _agentSpecHashes.delete(agentId);
  
  // Keep rest of cache intact
  // Next dry run will only re-compose changed agent
  
  _scheduleDryRun('high'); // Fast feedback (500ms)
}
```

**Impact:** Partial re-sync instead of full re-sync (~60% speedup for single-agent changes).

![M3 Smart Invalidation](./images/m3-smart-invalidation.png)
<!-- Image: Before/after showing full cache clear vs selective invalidation -->

---

### M4: Optimized Signature

**Problem:** Workspace signature computed on every call (expensive filesystem checks).

**Solution:** Cache signature with 500ms TTL.

```typescript
_signatureCache: { value: string; expires: number } | null = null;

_getWorkspaceStateSignature(): string {
  const now = Date.now();
  
  // Return cached value if still valid
  if (_signatureCache && now < _signatureCache.expires) {
    return _signatureCache.value;
  }
  
  // Compute new signature
  const signature = computeSignature();
  
  // Cache for 500ms
  _signatureCache = {
    value: signature,
    expires: now + 500,
  };
  
  return signature;
}
```

**Impact:** Reduces redundant filesystem calls (~90% reduction).

---

### M5: Smart Debounce

**Problem:** File watchers triggered dry runs too frequently during rapid changes.

**Solution:** Priority-based debounce delays.

```typescript
_scheduleDryRun(urgency: 'low' | 'normal' | 'high' = 'normal') {
  const delays = {
    high: 500,    // User just saved agent spec
    normal: 2000, // General file changes
    low: 5000,    // Context pack changes (rare)
  };
  
  clearTimeout(_dryRunTimer);
  _dryRunTimer = setTimeout(() => {
    _runDryRunSync();
  }, delays[urgency]);
}
```

**Impact:** Reduces unnecessary dry runs during rapid edits (~70% reduction in dry run count).

---

### M6: Parallel Tracking

**Problem:** Sequential processing of agent changes and sync targets.

**Solution:** Use `Promise.all()` for concurrent operations.

```typescript
async syncTeam(workspaceRoot: string, teamId: string, options: SyncOptions) {
  // Compose all agents (sequential - dependency order)
  const composedAgents = await composeAllAgents(teamId);
  
  // Track changes for all targets in parallel (M6)
  const changesByTarget = await Promise.all(
    targets.map(async (target) => {
      const changes = await Promise.all(
        composedAgents.map((agent) => 
          trackAgentChange(agent, target, options.showDiff)
        )
      );
      return { target, changes };
    })
  );
  
  return aggregateResults(changesByTarget);
}
```

**Impact:** ~40% speedup for multi-target projects.

---

## UI States

The sync status card shows different states based on dry run results and sync operations.

### State Diagram

```
┌─────────────────┐
│    CHECKING     │  Initial load, dry run not complete
└────────┬────────┘
         │ (first dry run completes)
         ↓
    ┌────────┐
    │ Branch │
    └───┬────┘
        │
   ┌────┼────┬────────┬──────────┐
   ↓    ↓    ↓        ↓          ↓
SUCCESS  NEEDS  NOT_SYNCED  ERROR  VALIDATION
         SYNC                      _ERROR
```

![UI State Machine](./images/sync-ui-states.png)
<!-- Image: State machine diagram showing all sync states and transitions -->

### State Descriptions

#### **CHECKING**
- **When:** Dashboard just opened, initial dry run in progress
- **Duration:** ~18-150ms (first run, no cache)
- **UI:** Blue loading icon, "Checking for changes..."
- **Actions:** No sync button (waiting for dry run)

```typescript
{
  syncStatus: 'CHECKING',
  syncTime: 'Checking...',
  syncNeeded: false,
  syncPreviewing: true, // dry run in progress
}
```

![CHECKING State](./images/state-checking.png)
<!-- Image: Screenshot of dashboard showing CHECKING state with blue loading icon -->

---

#### **SUCCESS**
- **When:** Dry run complete, no pending changes
- **UI:** Green checkmark, "Up to date", shows last sync time
- **Actions:** No sync button (nothing to sync)

```typescript
{
  syncStatus: 'SUCCESS',
  syncTime: 'just now', // or "2 minutes ago", etc.
  syncNeeded: false,
  pendingChanges: undefined,
}
```

![SUCCESS State](./images/state-success.png)
<!-- Image: Screenshot showing green "Up to date" state -->

---

#### **NEEDS_SYNC**
- **When:** Dry run detected pending changes
- **UI:** Yellow warning icon, badge with count, list of changed agents
- **Actions:** "Sync Now" button enabled

```typescript
{
  syncStatus: 'SUCCESS', // last sync was successful
  syncTime: 'just now',
  syncNeeded: true,
  pendingChanges: {
    total: 8,
    created: 0,
    updated: 8,
    deleted: 0,
    skipped: 0,
    items: [
      { id: 'claude_code/test-frontend', action: 'update' },
      { id: 'github_copilot/router', action: 'update' },
      // ...
    ],
  },
}
```

![NEEDS_SYNC State](./images/state-needs-sync.png)
<!-- Image: Screenshot showing yellow warning with "8 pending" badge and expanded change list -->

---

#### **NOT_SYNCED**
- **When:** No agent files exist in target directories (first-time setup)
- **UI:** Yellow icon, "Never synced"
- **Actions:** "Sync Now" button enabled

```typescript
{
  syncStatus: 'NOT_SYNCED',
  syncTime: 'Never',
  syncNeeded: true,
  pendingChanges: {
    total: 6,
    created: 6,
    updated: 0,
    deleted: 0,
    skipped: 0,
    items: [...],
  },
}
```

---

#### **ERROR**
- **When:** Sync operation failed (filesystem error, permissions, etc.)
- **UI:** Red alert icon, "Sync failed", shows error message
- **Actions:** "Retry Sync" button

```typescript
{
  syncStatus: 'ERROR',
  syncTime: 'Failed',
  syncError: 'EACCES: permission denied, write /path/to/file',
  syncNeeded: true,
}
```

![ERROR State](./images/state-error.png)
<!-- Image: Screenshot showing red error state with "Retry Sync" button -->

---

#### **VALIDATION_ERROR**
- **When:** Agent spec validation failed during dry run
- **UI:** Red alert icon, shows failed agent and error details, NO sync button
- **Actions:** None (user must fix agent spec first)

```typescript
{
  syncStatus: 'ERROR',
  syncTime: 'Validation failed',
  syncError: 'Failed to compose agent "test-frontend": Missing required field "description"',
  syncNeeded: true,
  pendingChanges: {
    total: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    items: [],
  },
}
```

![VALIDATION_ERROR State](./images/state-validation-error.png)
<!-- Image: Screenshot showing validation error with agent name and inline error message, no sync button -->

---

## Troubleshooting

### Common Issues

#### Issue: "Sync hangs forever, never completes"

**Symptoms:**
- Click "Sync Now"
- Progress notification appears
- Never completes, UI frozen on "Syncing..."

**Cause:** Deadlock in post-sync dry run (fixed in latest version).

**Solution:**
1. Reload VS Code window (`Cmd/Ctrl + Shift + P` → "Reload Window")
2. Update to latest version (includes fix)

**Technical Details:**
The sync was calling `await this._runDryRunSync()` after completing, but if a dry run was already in flight, the method would return immediately, causing the await to hang forever.

**Fix:** Changed to `void this._runDryRunSync()` (non-blocking).

---

#### Issue: "Sync completes but immediately shows pending changes again"

**Symptoms:**
- Click "Sync Now"
- See "✅ Sync complete" message
- 1 second later, back to "8 pending"

**Cause:** Hash comparison bug (fixed in latest version) - comparing JSON object hash vs markdown file hash.

**Solution:**
1. Update to latest version
2. Run sync again - should now stay in "Up to date" state

**Technical Details:**
M2 optimization was comparing:
- `newHash`: SHA256 of `JSON.stringify(ComposedAgentSpec)`
- `existingHash`: SHA256 of markdown file content

These never matched, causing false positives.

**Fix:** Now compares markdown-to-markdown hashes.

---

#### Issue: "Dry run shows changes but I didn't modify anything"

**Symptoms:**
- Dashboard shows "8 updated"
- You haven't changed any agent specs

**Possible Causes:**
1. **External tool modified files** (e.g., formatter, git checkout)
2. **Timestamp-only changes** (file touched but content identical)
3. **Cache desync** (rare, usually self-corrects)

**Solution:**
1. Click "Sync Now" - if files are truly identical, next dry run will show no changes
2. If issue persists, check git diff to see actual file changes
3. Clear cache: Reload VS Code window

---

#### Issue: "CHECKING state never completes"

**Symptoms:**
- Dashboard stuck on "Checking for changes..."
- No changes appear after waiting

**Possible Causes:**
1. **Dry run crashed** (check console for errors)
2. **Large number of agents** (may take longer than expected)
3. **File watcher loop** (continuous changes triggering new dry runs)

**Solution:**
1. Open VS Code Developer Tools (`Help` → `Toggle Developer Tools`)
2. Check Console for errors (look for `[dry-run]` prefix)
3. If error found, report as bug with error message
4. Temporary workaround: Reload window

---

### Debug Logging

Enable detailed dry run logging:

```typescript
// In dashboardPanel.ts, all dry run operations log with [dry-run] prefix:
console.log('[dry-run] Starting dry run for team:', teamId);
console.log('[dry-run] M1: Detected 3 changed agents');
console.log('[dry-run] Complete: 8 changes (0 created, 8 updated, 0 deleted)');
```

View logs in VS Code Developer Tools Console.

---

## Performance Metrics

### Baseline (No Optimizations)
- **Initial dry run:** ~800ms
- **Subsequent dry runs:** ~750ms (minimal cache benefit)
- **After single agent edit:** ~800ms (full re-sync)

### With All Optimizations (M1-M6)
- **Initial dry run:** ~150ms (M1 populates cache)
- **No changes detected:** ~18ms (M1+M4 cache hits)
- **Single agent changed:** ~80ms (M1+M3 partial re-sync)
- **Context pack changed:** ~120ms (M5 delayed + M1)

### Improvement Summary
- **Best case (no changes):** ~98% faster (800ms → 18ms)
- **Average case (1-2 agents changed):** ~90% faster (800ms → 80ms)
- **Worst case (all agents changed):** ~81% faster (800ms → 150ms)

---

## Architecture Decisions

### Why Dry Run + Real Sync (not just real sync)?

**Reason:** Provide instant feedback without blocking user interactions.

- Dry runs are **non-blocking** and run in background
- Real sync requires user confirmation (destructive operation)
- Dry run cache enables instant "pending changes" display

### Why Hash Comparison Instead of Timestamp?

**Reason:** Timestamps are unreliable for change detection.

- Git checkout changes timestamps even if content identical
- Formatters/linters may touch files without content changes
- Hash comparison guarantees content-based detection

### Why Markdown-to-Markdown Hash (not Object Hash)?

**Reason:** Object hash doesn't account for markdown formatting differences.

- Same object can produce slightly different markdown (whitespace, order)
- Markdown is the source of truth for sync targets
- Must compare exactly what will be written vs what exists

### Why Cache Dry Run Results?

**Reason:** Avoid redundant re-computation on every UI update.

- Dashboard polls for changes every 2 seconds
- Without cache, every poll triggers expensive composition
- Cache + smart invalidation reduces load by ~95%

---

## Future Improvements

### Potential Optimizations

1. **Cache generated markdown between dry run and real sync**
   - Currently regenerates markdown for real sync even though dry run already generated it
   - Could save ~30% time in real sync

2. **Parallel agent composition**
   - Currently sequential (preserves dependency order)
   - Could parallelize independent agents

3. **Incremental markdown generation**
   - Only regenerate sections that changed
   - Requires diff-aware markdown generator

4. **WebAssembly hash computation**
   - SHA256 in WASM could be faster for large files
   - Likely minimal benefit (hashing is already fast)

### Known Limitations

1. **No conflict detection**
   - If target file modified externally after sync, changes are overwritten
   - Could add "merge" mode with conflict markers

2. **No undo/rollback**
   - Sync operation is irreversible (except via git)
   - Could maintain sync history or backup files

3. **No partial sync**
   - Must sync all agents in team, can't sync individual agents
   - Could add "sync selected agents" feature

---

## Related Documentation

- [Dry Run Optimization](./dry-run-optimization.md) - Detailed implementation of M1-M6
- [Dry Run Optimization Summary](./dry-run-optimization-summary.md) - Quick reference
- [Bundled Resources Config](./bundled-resources-config.md) - Bundled agents/skills management

---

## Glossary

- **Agent Spec**: YAML file defining an agent (`.agent-teams/agents/*.yml`)
- **Composed Agent**: Result of merging spec + profile + team overrides
- **Dry Run**: Sync simulation that detects changes without writing files
- **Sync Target**: Destination for agent files (e.g., `.claude/agents/`, `.github/copilot/agents/`)
- **Team Profile**: YAML file defining a team and its enabled agents
- **Workspace Signature**: Hash of all inputs that affect sync (specs, profile, teams, context packs)

---

*Last updated: 2025-04-01*
