# Documentation Images

This directory contains diagrams and screenshots for Agent Teams documentation.

## Contents

See [IMAGE_MANIFEST.md](./IMAGE_MANIFEST.md) for the complete list of required images and instructions for creating them.

## Guidelines

### Image Formats
- **Diagrams:** PNG, SVG preferred
- **Screenshots:** PNG only
- **Resolution:** Minimum 1920px wide for screenshots, 2x for Retina displays

### Naming Convention
- Use kebab-case: `sync-architecture.png`, `state-checking.png`
- Prefix by category:
  - `sync-*` - Sync system diagrams
  - `state-*` - UI state screenshots
  - `m1-*`, `m2-*`, etc. - Optimization diagrams

### File Size
- Keep images under 500KB when possible
- Use PNG compression tools (ImageOptim, TinyPNG, etc.)
- SVG preferred for diagrams (smaller file size, scalable)

### Creating Diagrams

**Recommended Tools:**
1. **Mermaid** - Text-based diagrams, version-controllable
   - Use [Mermaid Live Editor](https://mermaid.live/)
   - See IMAGE_MANIFEST.md for ready-to-use Mermaid code
2. **draw.io** - Free, feature-rich diagramming
3. **Excalidraw** - Hand-drawn style, good for sketches

**Diagram Style:**
- Use consistent colors across diagrams
- Agent Teams brand colors:
  - Primary: `#FF0066` (pink/red)
  - Success: `#10B981` (green)
  - Warning: `#F59E0B` (amber)
  - Error: `#EF4444` (red)
  - Info: `#3B82F6` (blue)
- Include labels and arrows for clarity
- Export at 2x resolution for Retina displays

### Taking Screenshots

1. Run VS Code with Agent Teams extension installed
2. Use actual project data (not mock data)
3. Show relevant UI area only (crop unnecessary parts)
4. Use high-DPI display (Retina) if available
5. Annotate with arrows/highlights if needed (use draw.io or similar)

### Updating Images

When updating an image:
1. Replace the file in this directory
2. Update the date in IMAGE_MANIFEST.md
3. If adding new images, update both:
   - The documentation file (e.g., `sync-system.md`)
   - IMAGE_MANIFEST.md

---

*Last updated: 2025-04-01*
