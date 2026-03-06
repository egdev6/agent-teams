/**
 * Root Layout Component
 * Provides consistent layout structure across all pages
 */

import { Button } from '@components/ui/button';
import { ArrowLeft, Bot, Coffee, Loader2 } from 'lucide-react';
import type React from 'react';
import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { vscode } from '@/lib/vscode';

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  return (
    <div className='flex min-h-screen flex-col bg-vscode-bg text-vscode-fg'>
      {/* Header */}
      <header className='sticky top-0 right-0 left-0 z-50 w-full border-b border-vscode-border bg-vscode-bg/95 backdrop-blur supports-backdrop-filter:bg-vscode-bg/60'>
        <div className='w-full flex h-14 items-center justify-between px-4'>
          <button
            type='button'
            className='flex items-center gap-4 cursor-pointer hover:bg-transparent'
            onClick={() => navigate('/')}
          >
            <Bot className='h-8 w-8 text-primary text-2xl' />
            <span className='text-sm font-medium'>Agent Teams</span>
          </button>
          <div className='flex gap-2'>
            {!isHome && (
              <Button variant='vscode' onClick={() => navigate(-1)}>
                <ArrowLeft className='h-8 w-8' />
                <p>Go back</p>
              </Button>
            )}
            <Button
              variant='secondary'
              onClick={() => {
                const url = 'https://www.buymeacoffee.com/egdev';
                vscode.postMessage({ type: 'openExternal', url });
              }}
            >
              <Coffee className='h-8 w-8' />
              Buy me a coffee
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='w-full flex-1 py-6 px-4 flex flex-col justify-start items-center'>
        <div className='container'>
          <Suspense
            fallback={
              <div className='flex h-[50vh] items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin text-vscode-link' />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className='border-t border-vscode-border'>
        <div className='container flex h-12 items-center justify-between px-4 text-sm text-muted-foreground'>
          <div>Agent Teams v1.0</div>
        </div>
      </footer>
    </div>
  );
};
