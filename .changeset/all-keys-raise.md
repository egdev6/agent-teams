---
"agent-teams": patch
---

### Engram integration updated to support v1.9.9+

- Agents now call `mem_session_end` at the end of every session to ensure memories are properly consolidated before closing — this applies to all roles: worker, orchestrator, router and aggregator.
- When a recall result appears truncated, agents are now instructed to follow up with `mem_get_observation` to retrieve the full entry.
- Setup now detects the installed Engram version and warns if it's below the minimum required (1.9.9), with a direct link to download the latest release.

### Agent Manager and Team Manager now show local-only entries

Previously, agents and teams that existed on disk (in `.agent-teams/agents/` and `.agent-teams/teams/`) but hadn't been registered in the catalog were invisible in the UI until you explicitly ran a catalog capture. Now they appear immediately — no capture step needed.

- **"Local only" badge**: any agent or team that lives on disk but is not yet in the catalog is tagged with an amber *Local only* badge directly on its card, so you always know which entries still need to be saved to the catalog.
- The existing **"Unregistered files detected"** alert on the dashboard continues to work as before — clicking *Import to catalog* removes the badge and registers the entries.
- No behaviour changes for entries already in the catalog.

### Dashboard UI/UX improvements

The dashboard has been tidied up so it feels less cluttered, especially once teams, agents, and pending changes start accumulating.

- **Collapsible notification details**: the "Unregistered files detected" and sync status alerts now show only a summary line by default. Tap **See details** to expand the full list of files or pending changes — the noise is gone until you actually need it.
- **Compact stats row**: the six status indicators (Profile, Team, Engram, Skills, Teams, Agents) now render as a tight single-line row on smaller panels instead of wrapping into a two-column grid that pushed everything else down.
- **Quick actions menu**: the Quick Actions card has been replaced by a small **☰ menu button** sitting on the right side of the Dashboard header. All the same shortcuts are one click away without occupying a full card on the page.
