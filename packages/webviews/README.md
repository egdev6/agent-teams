# Agent Teams Webviews (React)

Este directorio contiene todas las webviews de la extensión construidas con **React + TypeScript + Vite**.

## 🎯 Arquitectura SPA

La extensión ahora usa **navegación SPA (Single Page Application)** en vez de múltiples webviews:
- ✅ Una sola pestaña para todas las vistas
- ✅ Navegación instantánea sin recargas
- ✅ Botón "Back" para volver al Dashboard
- ✅ Estado compartido entre vistas

## 🏗️ Estructura

```
webviews/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── BackButton.tsx   # ← Botón de navegación
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   ├── Stepper.tsx
│   │   └── TopBar.tsx
│   ├── views/               # Vistas principales
│   │   ├── Dashboard.tsx    # Vista principal
│   │   └── ProfileEditor.tsx # ← Editor de perfil (migrado)
│   ├── dashboard.tsx        # Entry point con router
│   ├── navigation.ts        # Sistema de navegación
│   ├── theme.ts             # Sistema de diseño centralizado
│   └── types.ts             # TypeScript types compartidos
├── dashboard.html           # HTML template
├── package.json
├── tsconfig.json
└──🧭 Navegación SPA

El sistema de navegación permite cambiar entre vistas sin cerrar el webview:

```typescript
// En dashboard.tsx (App component)
const [currentView, setCurrentView] = useState<ViewType>('dashboard');

const handleNavigate = (view: string) => {
  setCurrentView(view as ViewType);
};

// Render según vista actual
switch (currentView) {
  case 'profile-editor':
    return <ProfileEditor onCancel={() => setCurrentView('dashboard')} />;
  case 'dashboard':
  default:
    return <Dashboard onNavigate={handleNavigate} />;
}
```

### Vistas disponibles:
- **`dashboard`** - Vista principal con stats y agentes
- **`profile-editor`** - Editor de configuración de proyecto (con Back button)
- **`team-browser`** - Navegador de equipos (próximamente)
- **`kit-browser`** - Navegador de kits (próximamente)

##  vite.config.ts
```

## 🎨 Sistema de Diseño

El tema está centralizado en `src/theme.ts`:

```typescript
colors: {
  background: {64KB, ~51KB gzipped - incluye ProfileEditor
    primary: '#0a0e27',    // Fondo principal
    secondary: '#0fVista

1. **Crear componente de vista** en `src/views/MyView.tsx`:
```typescript
import React from 'react';
import { BackButton } from '../components/BackButton';

interface MyViewProps {
  onBack: () => void;
}

export const MyView: React.FC<MyViewProps> = ({ onBack }) => {
  return (
    <div>
      <BackButton onClick={onBack} />
      <h1>My New View</h1>
    </div>
  );
};
```

2. **Agregar al tipo de navegación** en `src/navigation.ts`:
```typescript
export type ViewType = 'dashboard' | 'profile-editor' | 'my-view';
```

3. **Actualizar el router** en `src/dashboard.tsx`:
```typescript
switch (currentView) {
  case 'my-view':
    return <MyView onBack={handleGoBack} />;
  // ... otros casos
}
```

4. **Agregar navegación** desde otra vista:
```typescript (dashboardPanel.ts)
this._panel.webview.postMessage({
  type: 'updateStats',
  stats: newStats
});

// Enviar config detectada
this._panel.webview.postMessage({
  type: 'detectedConfig',
  config: detectedConfig,
  workspaceName: folderName
});
```

### Webview → Extension (User Actions & Navigation)
```typescript
// En React (navegación interna)
onNavigate('profile-editor');  // Cambia de vista SIN mensaje

// En React (acciones que requieren extensión)
onMessage({ type: 'saveProfile', profile: profileData });
onMessage({ type: 'createAgent' });
onMessage({ type: 'syncAgents' });

// En el panel (dashboardPanel.ts)
case 'saveProfile':
  await this._saveProfile(message.profile);
  this._update(); // Refresh stats
- **`<BackButton>`** - Botón de navegación atrás (con hover effect)

Todos los componentes usan inline styles basados en el tema para evitar problemas de CSP en webviews.

## 🚀 Ventajas de React + SPA

- ✅ **Una sola pestaña** - No abre múltiples webviews
- ✅ **Navegación instantánea** - Sin recargas
- ✅ **Componentización** - Reutilización de UI
- ✅ **Estado reactivo** - Updates automáticos
- ✅ **TypeScript nativo** - Type safety completo
- ✅ **Mantenibilidad** - Código más limpio y organizado
- ✅ **Escalabilidad** - Fácil agregar nuevas vistas
- ✅ **Mejor UX** - Transiciones suaves, estado compartido

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
