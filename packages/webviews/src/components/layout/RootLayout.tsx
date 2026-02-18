/**
 * Root Layout Component
 * Provides consistent layout structure across all pages
 */

import { Button } from '@components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type React from 'react';
import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  // Get page title based on route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard';
      case '/profile-editor':
        return 'Project Profile Editor';
      case '/kit-browser':
        return 'Kit Browser';
      case '/team-manager':
        return 'Team Manager';
      default:
        return 'Agent Teams';
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-vscode-bg text-vscode-fg">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-vscode-border bg-vscode-bg/95 backdrop-blur supports-backdrop-filter:bg-vscode-bg/60">
        <div className="container flex h-14 items-center px-4">
          <div className="flex items-center gap-4">
            {!isHome && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Go back</span>
              </Button>
            )}
            <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6 px-4">
        <Suspense
          fallback={
            <div className="flex h-[50vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-vscode-link" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-vscode-border">
        <div className="container flex h-12 items-center justify-between px-4 text-sm text-muted-foreground">
          <div>Agent Teams v2.1</div>
          <div className="flex items-center gap-4">
            <span className="text-xs">
              {location.pathname !== '/' && `Route: ${location.pathname}`}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
