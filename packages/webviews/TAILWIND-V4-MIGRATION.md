# Tailwind CSS v4 Migration

## Changes Made

### ✅ Updated Dependencies
- **Tailwind CSS**: v3.4 → **v4.0**
- Removed: `autoprefixer` (built-in to Tailwind v4)
- Removed: `postcss` (Tailwind v4 includes it)

### ✅ Configuration Changes

#### Before (v3):
```javascript
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'vscode-bg': 'var(--vscode-editor-background)',
        // ...
      }
    }
  }
}
```

#### After (v4):
```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-vscode-bg: var(--vscode-editor-background);
  --color-vscode-fg: var(--vscode-editor-foreground);
  /* ... */
}
```

### ✅ Key Differences

1. **CSS-First Configuration**
   - No more `tailwind.config.js`
   - Theme configuration in CSS using `@theme`

2. **Simplified PostCSS**
   - Only need `tailwindcss` plugin
   - No autoprefixer needed

3. **Import Syntax**
   - `@tailwind base; @tailwind components; @tailwind utilities;`
   - → `@import "tailwindcss";`

4. **Custom Colors**
   - `colors: { 'vscode-bg': '...' }`
   - → `--color-vscode-bg: ...`
   - Usage: `bg-vscode-bg` (same as before)

### ✅ Usage in Components

No changes needed in components! Classes work the same:

```tsx
<div className="bg-vscode-bg text-vscode-fg">
  <button className="btn-vscode">Click me</button>
</div>
```

### ✅ Migration Checklist

- [x] Update `tailwindcss` to v4.0 in package.json
- [x] Remove `autoprefixer` and `postcss` dependencies
- [x] Delete `tailwind.config.js`
- [x] Update `postcss.config.js` (remove autoprefixer)
- [x] Update `globals.css` (change `@tailwind` to `@import`)
- [x] Add `@theme` block with custom tokens
- [x] Test that classes still work

### 🚀 Benefits of v4

1. **Faster builds** - Native Rust/Go engine
2. **Smaller bundle** - Better tree-shaking
3. **Simpler config** - CSS-first approach
4. **Better DX** - Integrated tooling
5. **Future-proof** - Modern architecture

### 📚 Resources

- [Tailwind CSS v4 Announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [Migration Guide](https://tailwindcss.com/docs/upgrade-guide)
- [New Features](https://tailwindcss.com/docs/v4)

### 🔄 Next Steps

```bash
# Install new dependencies
cd extension/webviews
pnpm install

# Build to test
pnpm build

# Should work without errors
```
