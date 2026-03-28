/**
 * Mock de acquireVsCodeApi() para tests E2E con Playwright.
 *
 * Se inyecta como initScript en cada test via page.addInitScript().
 * Captura los mensajes salientes (webview → extensión) en window.__vscodeMessages
 * y expone setState/getState para persistencia de estado.
 */

import type { DashboardStats } from '../../models/dashboard';

declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: unknown) => void;
      setState: (state: unknown) => void;
      getState: () => unknown;
    };
    __vscodeMessages: unknown[];
    __vscodeState: unknown;
    __INITIAL_STATE__?: DashboardStats;
  }
}

window.__vscodeMessages = [];
window.__vscodeState = undefined;

window.acquireVsCodeApi = (() => ({
  postMessage: (msg: unknown) => {
    window.__vscodeMessages.push(msg);
  },
  getState: () => window.__vscodeState,
  setState: (state: unknown) => {
    window.__vscodeState = state;
  },
})) as typeof window.acquireVsCodeApi;
