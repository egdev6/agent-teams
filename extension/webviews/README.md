# Agent Teams Webviews (React)

Este directorio contiene todas las webviews de la extensión construidas con **React + TypeScript + Vite**.

## 🏗️ Estructura

```
webviews/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   ├── Stepper.tsx
│   │   └── TopBar.tsx
│   ├── views/               # Vistas principales
│   │   └── Dashboard.tsx
│   ├── dashboard.tsx        # Entry point para Dashboard
│   ├── theme.ts             # Sistema de diseño centralizado
│   └── types.ts             # TypeScript types compartidos
├── dashboard.html           # HTML template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🎨 Sistema de Diseño

El tema está centralizado en `src/theme.ts`:

```typescript
colors: {
  background: {
    primary: '#0a0e27',    // Fondo principal
    secondary: '#0f1535',  // Fondo secciones
    sidebar: '#070b1f',    // Fondo sidebar
  },
  accent: {
    blue: '#2563eb',       // Azul principal
  },
  status: {
    success: '#10b981',    // Verde
    warning: '#f59e0b',    // Amarillo
    error: '#ef4444',      // Rojo
  }
}
```

## 🛠️ Comandos

### Desarrollo
```bash
pnpm run dev         # Dev server con hot reload
pnpm run watch       # Build en modo watch
```

### Producción
```bash
pnpm run build       # Build para producción
```

El build genera:
- `../dist/webviews/dashboard.html`
- `../dist/webviews/dashboard.js` (~155KB, ~49KB gzipped)

## ✨ Agregar Nueva Webview

1. **Crear vista React** en `src/views/MyView.tsx`
2. **Crear entry point** `src/myview.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MyView } from './views/MyView';

const vscode = acquireVsCodeApi();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MyView onMessage={(msg) => vscode.postMessage(msg)} />
);
```

3. **Crear HTML** `myview.html`
4. **Actualizar** `vite.config.ts`:
```typescript
input: {
  dashboard: resolve(__dirname, 'dashboard.html'),
  myview: resolve(__dirname, 'myview.html'),  // ← Agregar
}
```

5. **Crear Panel** en `extension/src/myViewPanel.ts`:
```typescript
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(distPath, 'myview.js')
);
```

## 🔄 Comunicación Extension ↔ Webview

### Extension → Webview (Update State)
```typescript
// En el panel
this._panel.webview.postMessage({
  type: 'updateStats',
  stats: newStats
});
```

### Webview → Extension (User Actions)
```typescript
// En React
onMessage({ type: 'createAgent' });

// En el panel
onDidReceiveMessage((message) => {
  if (message.type === 'createAgent') {
    // Handle action
  }
});
```

## 📦 Componentes Disponibles

- **`<Button>`** - Botones con variantes (primary, secondary, danger)
- **`<Badge>`** - Badges con colores de estado y roles
- **`<StatCard>`** - Tarjetas de estadísticas
- **`<Stepper>`** - Indicador de progreso por pasos
- **`<Sidebar>`** - Navegación lateral
- **`<TopBar>`** - Barra superior con estado y acciones

Todos los componentes usan inline styles basados en el tema para evitar problemas de CSP en webviews.

## 🚀 Ventajas de React

- ✅ **Componentización** - Reutilización de UI
- ✅ **Estado reactivo** - Updates automáticos
- ✅ **TypeScript nativo** - Type safety completo
- ✅ **Mantenibilidad** - Código más limpio y organizado
- ✅ **Ecosistema** - Acceso a librerías React
