# React Router Navigation Guide

## Overview

Esta guía documenta la implementación de navegación usando React Router v6 con Memory Router en los webviews de Agent Teams.

## Conceptos Clave

### Memory Router

**¿Por qué Memory Router?**
- VSCode webviews no tienen acceso a `window.location` o `window.history`
- Memory Router mantiene el historial de navegación en memoria
- Funciona perfectamente en entornos aislados como webviews

**No usar BrowserRouter**: Causará errores en VSCode webviews.

## Estructura de Rutas

```tsx
// src/routes/index.tsx
import { RouteObject } from 'react-router-dom';
import { lazy } from 'react';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'profile-editor',
        element: <ProfileEditorPage />,
      },
      // ... más rutas
    ],
  },
];
```

## Navegación Programática

### Hook useNavigate

```tsx
import { useNavigate } from 'react-router-dom';

const MyComponent = () => {
  const navigate = useNavigate();

  // Navegar a ruta específica
  const goToProfile = () => {
    navigate('/profile-editor');
  };

  // Navegar hacia atrás
  const goBack = () => {
    navigate(-1);
  };

  // Navegar con state
  const goWithData = () => {
    navigate('/kit-browser', { state: { filter: 'installed' } });
  };

  return (
    <button onClick={goToProfile}>Edit Profile</button>
  );
};
```

### Hook useLocation

```tsx
import { useLocation } from 'react-router-dom';

const MyComponent = () => {
  const location = useLocation();

  // Current path
  console.log(location.pathname); // '/profile-editor'

  // State passed from navigate
  console.log(location.state); // { filter: 'installed' }

  // Check if on specific route
  const isHome = location.pathname === '/';

  return <div>Current: {location.pathname}</div>;
};
```

## Navegación Declarativa

### Link Component

```tsx
import { Link } from 'react-router-dom';

const Navigation = () => (
  <nav>
    <Link to="/">Dashboard</Link>
    <Link to="/profile-editor">Profile</Link>
    <Link to="/kit-browser">Kits</Link>
  </nav>
);
```

### NavLink (con estilos activos)

```tsx
import { NavLink } from 'react-router-dom';

const Navigation = () => (
  <nav>
    <NavLink
      to="/dashboard"
      className={({ isActive }) =>
        isActive ? 'text-vscode-link font-bold' : 'text-vscode-fg'
      }
    >
      Dashboard
    </NavLink>
  </nav>
);
```

## Layouts Compartidos

### RootLayout Pattern

```tsx
// src/components/layout/RootLayout.tsx
import { Outlet } from 'react-router-dom';

export const RootLayout = () => (
  <div>
    <Header />
    <main>
      <Outlet /> {/* Aquí se renderizan las páginas hijas */}
    </main>
    <Footer />
  </div>
);
```

### Suspense para Lazy Loading

```tsx
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const RootLayout = () => (
  <div>
    <Header />
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <Outlet />
    </Suspense>
    <Footer />
  </div>
);
```

## Lazy Loading de Páginas

### Definición

```tsx
// src/routes/index.tsx
import { lazy } from 'react';

// Lazy load de páginas
const DashboardPage = lazy(() => import('@pages/DashboardPage'));
const ProfileEditorPage = lazy(() => import('@pages/ProfileEditorPage'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'profile-editor', element: <ProfileEditorPage /> },
    ],
  },
];
```

### Requisitos

1. El componente debe ser default export:
```tsx
// ✅ Correcto
const DashboardPage = () => <div>Dashboard</div>;
export default DashboardPage;

// ❌ Incorrecto
export const DashboardPage = () => <div>Dashboard</div>;
```

2. Debe estar envuelto en Suspense (ya está en RootLayout).

## Comunicación con VSCode Extension

### Enviar Mensajes

```tsx
import { vscode } from '@lib/vscode';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const navigate = useNavigate();

  const handleCreateAgent = () => {
    // Enviar comando a extensión
    vscode.postMessage({ type: 'createAgent' });
  };

  const handleEditProfile = () => {
    // Primero navegar, luego pedir datos
    navigate('/profile-editor');
    vscode.postMessage({ type: 'requestProfileData' });
  };

  return (
    <div>
      <button onClick={handleCreateAgent}>Create Agent</button>
      <button onClick={handleEditProfile}>Edit Profile</button>
    </div>
  );
};
```

### Recibir Mensajes

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const App = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.type) {
        case 'navigateTo':
          navigate(message.path);
          break;
        case 'showProfile':
          navigate('/profile-editor', { state: message.data });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  return <RouterProvider router={router} />;
};
```

## Patterns Comunes

### 1. Navegación Condicional

```tsx
const MyComponent = () => {
  const navigate = useNavigate();

  const handleSave = async () => {
    const success = await saveData();
    if (success) {
      navigate('/'); // Ir a home si éxito
    } else {
      // Mostrar error
    }
  };
};
```

### 2. Breadcrumbs

```tsx
import { useLocation } from 'react-router-dom';

const Breadcrumbs = () => {
  const location = useLocation();

  const pathSegments = location.pathname
    .split('/')
    .filter(Boolean);

  return (
    <nav>
      <Link to="/">Home</Link>
      {pathSegments.map((segment, index) => (
        <span key={segment}>
          {' / '}
          <Link to={`/${pathSegments.slice(0, index + 1).join('/')}`}>
            {segment}
          </Link>
        </span>
      ))}
    </nav>
  );
};
```

### 3. Botón Back Condicional

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  if (isHome) return null;

  return (
    <button onClick={() => navigate(-1)}>
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
};
```

### 4. Navegación con Confirmación

```tsx
const ProfileEditor = () => {
  const navigate = useNavigate();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('Discard changes?');
      if (!confirm) return;
    }
    navigate('/');
  };
};
```

## Debugging

### Inspeccionar Estado de Router

```tsx
import { useLocation, useNavigate } from 'react-router-dom';

const DebugInfo = () => {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 right-0 bg-black/80 text-white p-2 text-xs">
      <div>Path: {location.pathname}</div>
      <div>State: {JSON.stringify(location.state)}</div>
    </div>
  );
};
```

### Console Logging

```tsx
useEffect(() => {
  console.log('[Navigation]', location.pathname);
}, [location]);
```

## Mejores Prácticas

1. **Usar Memory Router**: Siempre en webviews de VSCode
2. **Lazy Loading**: Para páginas grandes, reduce bundle inicial
3. **Suspense Boundaries**: Siempre proporciona fallback
4. **Type Safety**: Define tipos para location.state:
```tsx
type ProfileEditorState = {
  config: DetectedConfig;
  mode: 'create' | 'edit';
};

navigate('/profile-editor', {
  state: { config, mode: 'edit' } as ProfileEditorState
});
```

5. **Evitar navigate() en renders**: Solo en event handlers o effects
6. **Clean URLs**: Usar paths simples sin query strings (no funcionan bien en Memory Router)

## Troubleshooting

### Error: "useNavigate must be used within RouterProvider"
**Solución**: Asegúrate de que el componente está dentro del árbol de RouterProvider.

### Error: "Cannot read property 'location' of undefined"
**Solución**: Verifica que estás usando Memory Router, no BrowserRouter.

### Navegación no funciona
1. Verifica que la ruta está definida en routes/index.tsx
2. Chequea que el path no tiene typos
3. Confirma que RouterProvider está correctamente configurado

---

**Más información**: [React Router v6 Docs](https://reactrouter.com/en/main)
