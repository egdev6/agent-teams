# Sync System Documentation - Image Manifest

This file lists all images referenced in `sync-system.md`. Create these diagrams and place them in `docs/images/`.

## Required Images

### Architecture Diagrams

#### `sync-architecture.png`
High-level architecture diagram showing the sync system components and their relationships.

**Elements:**
- Dashboard UI (top layer) - user interface
- DashboardPanel (extension layer) - state management
- TeamManager (extension layer) - sync operations
- AgentComposer (core layer) - spec composition
- Disk/Filesystem (bottom layer) - target files
- Arrows showing data flow between components

**Suggested Tool:** draw.io, Excalidraw, or Mermaid

**Mermaid Code:**
```mermaid
graph TD
    A[Dashboard UI<br/>React Component] -->|User Actions| B[DashboardPanel<br/>Extension]
    B -->|Orchestrates| C[TeamManager<br/>Extension]
    C -->|Composes| D[AgentComposer<br/>Core]
    D -->|Reads| E[Agent Specs<br/>.yml files]
    C -->|Writes| F[Sync Targets<br/>.claude/agents/, etc.]
    B -->|Caches| G[Dry Run Cache<br/>In-Memory]
    B -->|Tracks| H[File Watchers<br/>VS Code API]
```

---

#### `sync-flow.png`
Complete sync lifecycle flowchart from dashboard open to sync complete.

**Elements:**
- Start: User opens dashboard
- CHECKING state box
- Dry run execution (detailed steps)
- Decision diamond: Changes detected?
- NEEDS_SYNC / SUCCESS state boxes
- User action: Click "Sync Now"
- Real sync execution (detailed steps)
- Post-sync dry run
- Final SUCCESS state
- Error paths (validation error, sync error)

**Mermaid Code:**
```mermaid
flowchart TD
    Start([User Opens Dashboard]) --> Checking[CHECKING State]
    Checking --> Schedule[Schedule Dry Run<br/>500ms delay]
    Schedule --> DryRun{Execute Dry Run}
    DryRun --> CheckCache[Check Cache<br/>M4]
    CheckCache --> CacheHit{Cache Valid?}
    CacheHit -->|Yes| SkipDryRun[Use Cached Results]
    CacheHit -->|No| DetectChanges[Detect Changes<br/>M1]
    DetectChanges --> HasChanges{Changes?}
    HasChanges -->|No| KeepCache[Keep Cache<br/>Update Signature]
    HasChanges -->|Yes| Compose[Compose Agents]
    Compose --> Compare[Compare with Targets<br/>M2]
    Compare --> BuildSummary[Build Change Summary]
    BuildSummary --> CacheResults[Cache Results]
    SkipDryRun --> UpdateUI[Update Dashboard UI]
    KeepCache --> UpdateUI
    CacheResults --> UpdateUI
    UpdateUI --> CheckState{Pending<br/>Changes?}
    CheckState -->|No| Success[SUCCESS State]
    CheckState -->|Yes| NeedsSync[NEEDS_SYNC State]
    NeedsSync --> UserSync[User Clicks<br/>Sync Now]
    UserSync --> RealSync[Real Sync Execution]
    RealSync --> WriteFiles[Write Files to Disk]
    WriteFiles --> ClearCache[Clear Cache]
    ClearCache --> PostDryRun[Post-Sync Dry Run<br/>Non-Blocking]
    PostDryRun --> FinalSuccess[SUCCESS State]
```

---

### Optimization Diagrams

#### `m1-incremental-detection.png`
Flowchart showing M1 incremental detection logic with hash comparison and cache hit/miss paths.

**Elements:**
- Start: File change detected
- Check: Cache populated?
- First run path: Populate cache, report changes
- Hash comparison loop for each agent
- Cache hit: Skip composition
- Cache miss: Re-compose agent
- End: Report changed agents count

**Mermaid Code:**
```mermaid
flowchart TD
    Start([File Change Detected]) --> Check{Cache<br/>Populated?}
    Check -->|No| FirstRun[First Run:<br/>Populate Cache]
    FirstRun --> ReportAll[Report All Changes]
    Check -->|Yes| Loop[For Each Agent Spec]
    Loop --> GetHash[Get Current Hash]
    GetHash --> CompareHash{Hash<br/>Changed?}
    CompareHash -->|No| Skip[Skip: Use Cache]
    CompareHash -->|Yes| Changed[Mark as Changed]
    Skip --> Next{More<br/>Agents?}
    Changed --> Next
    Next -->|Yes| Loop
    Next -->|No| Report[Report Changed Count]
    Report --> End([End])
```

---

#### `m2-lazy-diff.png`
Comparison diagram showing old approach (always generate diff) vs new (hash first, diff only if requested).

**Elements:**
- Side-by-side comparison:
  - **OLD (Slow):** Generate markdown → Generate diff → Compare content → Return result
  - **NEW (Fast):** Generate markdown → Hash comparison → Skip if identical → Generate diff only if showDiff=true

**Mermaid Code:**
```mermaid
graph LR
    subgraph OLD[❌ Old Approach - Always Generate Diff]
        O1[Compose Agent] --> O2[Generate Markdown]
        O2 --> O3[Read Existing File]
        O3 --> O4[Generate Full Diff]
        O4 --> O5[Compare Content]
        O5 --> O6[Return Result]
    end
    
    subgraph NEW[✅ New Approach - Hash First]
        N1[Compose Agent] --> N2[Generate Markdown]
        N2 --> N3[Read Existing File]
        N3 --> N4[Hash Comparison]
        N4 --> N5{Identical?}
        N5 -->|Yes| N6[Return SKIP<br/>~18ms]
        N5 -->|No| N7{ShowDiff?}
        N7 -->|Yes| N8[Generate Diff]
        N7 -->|No| N9[Return UPDATE<br/>~50ms]
        N8 --> N10[Return UPDATE + Diff]
    end
```

---

#### `m3-smart-invalidation.png`
Before/after diagram showing full cache clear vs selective invalidation when one agent changes.

**Elements:**
- **BEFORE:** Single agent spec change → Clear entire cache → Re-compose all 8 agents
- **AFTER:** Single agent spec change → Invalidate only that agent's hash → Re-compose only 1 agent

**Visual Suggestion:** 
Show 8 agent boxes. On change:
- Before: All 8 boxes turn red (invalidated), all get re-composed
- After: Only 1 box turns red, only that one gets re-composed

---

### UI State Screenshots

These should be actual screenshots from the extension running in VS Code.

#### `sync-ui-states.png`
State machine diagram showing all sync states and transitions.

**Mermaid Code:**
```mermaid
stateDiagram-v2
    [*] --> CHECKING: Dashboard Opens
    CHECKING --> SUCCESS: No Changes
    CHECKING --> NEEDS_SYNC: Changes Detected
    CHECKING --> NOT_SYNCED: No Target Files
    CHECKING --> VALIDATION_ERROR: Spec Invalid
    CHECKING --> ERROR: Dry Run Failed
    
    SUCCESS --> NEEDS_SYNC: File Changed
    NEEDS_SYNC --> Syncing: User Clicks Sync
    Syncing --> SUCCESS: Sync Complete
    Syncing --> ERROR: Sync Failed
    
    NOT_SYNCED --> Syncing: User Clicks Sync
    ERROR --> Syncing: User Clicks Retry
    
    VALIDATION_ERROR --> CHECKING: Spec Fixed
```

---

#### `state-checking.png`
Screenshot of dashboard in CHECKING state.

**What to show:**
- Sync status card with blue background
- Loader2 icon (spinning)
- Title: "Checking for changes"
- Description: "Verifying current sync status..."
- No sync button visible
- Badge: "Checking..."

---

#### `state-success.png`
Screenshot of dashboard in SUCCESS state.

**What to show:**
- Sync status card with green background
- CheckCircle2 icon
- Title: "Up to date"
- Description: "Last synced just now" (or time ago)
- Badge: Shows last sync time
- No sync button (nothing to sync)

---

#### `state-needs-sync.png`
Screenshot of dashboard in NEEDS_SYNC state with expanded change list.

**What to show:**
- Sync status card with yellow/amber background
- ArrowDownUp icon
- Title: "Sync needed"
- Badge: "8 pending"
- Description: "8 updated — changes pending sync"
- Expanded list showing:
  - • claude_code/test-frontend (modified)
  - • github_copilot/router (modified)
  - • ... more agents
- Eye icon button to toggle details
- "Sync Now" button (yellow/amber, enabled)

---

#### `state-error.png`
Screenshot of dashboard in ERROR state.

**What to show:**
- Sync status card with red background
- AlertTriangle icon
- Title: "Sync failed"
- Description: "Last sync encountered an error"
- Error message shown (e.g., "EACCES: permission denied")
- "Retry Sync" button (red/destructive)

---

#### `state-validation-error.png`
Screenshot of dashboard in VALIDATION_ERROR state.

**What to show:**
- Sync status card with red background
- AlertTriangle icon
- Title: "Validation error"
- Badge: "1 agent"
- Description: "Fix the validation error below before syncing"
- Inline error block showing:
  - Failed agent: `test-frontend`
  - Error message: "Missing required field 'description'"
- **NO sync button** (not actionable)

---

## Creating the Images

### Tools Recommended

1. **Diagrams/Flowcharts:** 
   - [Mermaid Live Editor](https://mermaid.live/) - Use the provided Mermaid code above
   - [draw.io](https://app.diagrams.net/) - Free, web-based
   - [Excalidraw](https://excalidraw.com/) - Hand-drawn style

2. **Screenshots:**
   - VS Code extension running locally
   - Ensure high resolution (at least 1920px wide)
   - Crop to show only relevant UI (sync status card area)
   - Annotate with arrows/labels if needed

3. **Export Settings:**
   - Format: PNG
   - Resolution: 2x or higher for Retina displays
   - Compression: Optimize with ImageOptim or similar

---

## Adding Images to Sync Targets

To ensure images sync to documentation sites, add this directory to `project.profile.yml`:

```yaml
paths:
  docs_images: docs/images
```

And update sync configuration to include image files in relevant targets.

---

## Checklist

- [ ] `sync-architecture.png` - Architecture diagram
- [ ] `sync-flow.png` - Complete sync flow
- [ ] `m1-incremental-detection.png` - M1 optimization
- [ ] `m2-lazy-diff.png` - M2 optimization comparison
- [ ] `m3-smart-invalidation.png` - M3 before/after
- [ ] `sync-ui-states.png` - State machine diagram
- [ ] `state-checking.png` - CHECKING state screenshot
- [ ] `state-success.png` - SUCCESS state screenshot
- [ ] `state-needs-sync.png` - NEEDS_SYNC with list expanded
- [ ] `state-error.png` - ERROR state screenshot
- [ ] `state-validation-error.png` - VALIDATION_ERROR screenshot

---

*Note: This manifest should be updated whenever new images are added to sync-system.md*
