/**
 * Root Layout Component
 * Provides consistent layout structure across all pages
 */

import { Button } from '@components/ui/button';
import { ArrowLeft, Bot, Coffee } from 'lucide-react';
import type React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { vscode } from '@/lib/vscode';
import type { DashboardStats } from '@/models';

declare global {
  interface Window {
    __INITIAL_STATE__?: DashboardStats;
  }
}

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  return (
    <div
      className='flex min-h-screen flex-col text-vscode-fg min-w-150'
      style={{
        background:
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px) 0 0 / 40px 40px, linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px) 0 0 / 40px 40px, rgb(27, 27, 29)',
      }}
    >
      {/* Header */}
      <header className='sticky top-0 right-0 left-0 z-50 w-full border-b border-[rgba(255,255,255,0.07)] bg-[rgb(27, 27, 29)] backdrop-blur supports-backdrop-filter:bg-[rgba(27, 27, 29, 0.8)]'>
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
              <Button
                variant='vscode'
                onClick={() => {
                  console.log(
                    '[RootLayout] Go back clicked, navigating from:',
                    location.pathname,
                    'at',
                    performance.now(),
                  );
                  navigate(-1);
                }}
              >
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
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer
        className='border-t border-[rgba(255,255,255,0.07)]'
        style={{ background: 'rgb(27, 27, 29)' }}
      >
        <div className='container flex h-12 items-center justify-between px-4 text-sm text-muted-foreground'>
          <a
            href='https://agent-teams-docs.netlify.app/es/releases'
            target='_blank'
            rel='noopener noreferrer'
            className='text-vscode-link underline'
          >
            Agent Teams v{window.__INITIAL_STATE__?.extensionVersion ?? '—'}
          </a>
          <div className='flex gap-4'>
            <a
              href='https://github.com/egdev6/agent-teams-docs'
              target='_blank'
              rel='noopener noreferrer'
              className='text-vscode-link underline'
            >
              Github
            </a>
            -
            <a
              href='https://github.com/egdev6/agent-teams-docs/issues'
              target='_blank'
              rel='noopener noreferrer'
              className='text-vscode-link underline'
            >
              Issues
            </a>
            -
            <a
              href='https://agent-teams-docs.netlify.app/es/'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary underline'
            >
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
