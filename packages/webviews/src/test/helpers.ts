import type { Page } from '@playwright/test';
import type { DashboardStats } from '../models/dashboard';

/**
 * Inyecta el mock de acquireVsCodeApi() en la página antes de cargar la SPA.
 * Debe llamarse ANTES de page.goto().
 */
export async function injectVscodeApi(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__vscodeMessages = [];
    (window as any).__vscodeState = undefined;
    (window as any).acquireVsCodeApi = () => ({
      postMessage: (msg: unknown) => {
        (window as any).__vscodeMessages.push(msg);
      },
      getState: () => (window as any).__vscodeState ?? {},
      setState: (state: unknown) => {
        (window as any).__vscodeState = state;
      },
    });
  });
}

/**
 * Simula un mensaje entrante de la extensión hacia la webview.
 */
export async function sendExtensionMessage(page: Page, message: unknown): Promise<void> {
  await page.evaluate((msg) => {
    window.dispatchEvent(new MessageEvent('message', { data: msg }));
  }, message as any);
}

/**
 * Envía un updateStats a la webview simulando el push de la extensión.
 *
 * Espera a que el componente haya enviado el mensaje 'refresh' para asegurar
 * que React (incluyendo el doble-montaje de Strict Mode) ha completado el
 * ciclo de effects y el listener de mensajes está activo.
 */
export async function updateStats(page: Page, stats: Partial<DashboardStats>): Promise<void> {
  // Esperar a que el dashboard envíe 'refresh' (confirma que el effect listener está activo)
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await sendExtensionMessage(page, { type: 'updateStats', stats });
}

/**
 * Recupera los mensajes que la webview envió hacia la extensión.
 */
export async function getCapturedMessages(page: Page): Promise<unknown[]> {
  return page.evaluate(() => (window as any).__vscodeMessages ?? []);
}

/**
 * Limpia los mensajes capturados.
 */
export async function clearCapturedMessages(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).__vscodeMessages = [];
  });
}

/**
 * Inyecta el estado inicial de la webview antes de que React monte el árbol.
 * Simula el __INITIAL_STATE__ que la extensión inserta en el HTML.
 */
export async function setInitialState(page: Page, stats: Partial<DashboardStats>): Promise<void> {
  await page.addInitScript((s) => {
    (window as any).__INITIAL_STATE__ = s;
  }, stats as any);
}

/**
 * Navega al wizard de edición de un agente worker pre-existente y
 * responde con agentData que incluye workflow steps para que todos
 * los tabs del wizard estén habilitados.
 *
 * Requiere que el estado inicial contenga al menos un agente worker con
 * id 'backend-worker' (como en FULL_SETUP_STATS).
 *
 * Devuelve con el wizard en el tab 'workflow' activo.
 */
export async function navigateToEditAgentWorkflowTab(page: Page): Promise<void> {
  // Wait for dashboard refresh (confirms React listener is active)
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );

  // Click the Worker tab in TeamAgentsCard (default is Router)
  await page.getByRole('tab', { name: /worker/i }).click();

  // Click Backend Worker agent card → navigates to /edit-agent/backend-worker
  await page.getByText('Backend Worker').first().click();

  // Wait for Edit Agent page to request agent data
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'requestAgentData'),
    { timeout: 5000 },
  );

  // Respond with agentData including workflow steps (enables isConfigurationEnabled)
  await sendExtensionMessage(page, {
    type: 'agentData',
    agentId: 'backend-worker',
    name: 'Backend Worker',
    role: 'worker',
    description: 'Handles backend API tasks and processes requests efficiently',
    workflow: ['Analyse the incoming request', 'Process and generate response'],
    tools: [],
  });

  // Wait for wizard to load
  await page.getByText('Agent Wizard').waitFor({ state: 'visible' });

  // Click the Workflow tab (now enabled)
  await page.getByRole('tab', { name: /workflow/i }).click();
}

/**
 * Navega al wizard de edición de un agente worker pre-existente y
 * activa el tab Rules (donde está el toggle de Engram).
 *
 * Requiere que el estado inicial contenga al menos un agente worker con
 * id 'backend-worker' (como en FULL_SETUP_STATS).
 */
export async function navigateToEditAgentRulesTab(page: Page): Promise<void> {
  // Wait for dashboard refresh (confirms React listener is active)
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );

  // Click the Worker tab in TeamAgentsCard (default is Router)
  await page.getByRole('tab', { name: /worker/i }).click();

  // Click Backend Worker agent card → navigates to /edit-agent/backend-worker
  await page.getByText('Backend Worker').first().click();

  // Wait for Edit Agent page to request agent data
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'requestAgentData'),
    { timeout: 5000 },
  );

  // Respond with agentData including workflow steps (enables isConfigurationEnabled)
  await sendExtensionMessage(page, {
    type: 'agentData',
    agentId: 'backend-worker',
    name: 'Backend Worker',
    role: 'worker',
    description: 'Handles backend API tasks and processes requests efficiently',
    workflow: ['Analyse the incoming request', 'Process and generate response'],
    tools: [],
  });

  // Wait for wizard to load
  await page.getByText('Agent Wizard').waitFor({ state: 'visible' });

  // Click the Rules tab (now enabled)
  await page.getByRole('tab', { name: /rules/i }).click();
}

/**
 * Navega al wizard de edición de un agente worker pre-existente y
 * activa el tab Skills.
 *
 * Requiere que el estado inicial contenga al menos un agente worker con
 * id 'backend-worker' (como en FULL_SETUP_STATS).
 */
export async function navigateToEditAgentSkillsTab(page: Page): Promise<void> {
  // Wait for dashboard refresh (confirms React listener is active)
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );

  // Click the Worker tab in TeamAgentsCard (default is Router)
  await page.getByRole('tab', { name: /worker/i }).click();

  // Click Backend Worker agent card → navigates to /edit-agent/backend-worker
  await page.getByText('Backend Worker').first().click();

  // Wait for Edit Agent page to request agent data
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'requestAgentData'),
    { timeout: 5000 },
  );

  // Respond with agentData including workflow steps (enables isConfigurationEnabled)
  await sendExtensionMessage(page, {
    type: 'agentData',
    agentId: 'backend-worker',
    name: 'Backend Worker',
    role: 'worker',
    description: 'Handles backend API tasks and processes requests efficiently',
    workflow: ['Analyse the incoming request', 'Process and generate response'],
    tools: [],
  });

  // Wait for wizard to load
  await page.getByText('Agent Wizard').waitFor({ state: 'visible' });

  // Click the Skills tab (now enabled)
  await page.getByRole('tab', { name: /skills/i }).click();
}

/**
 * Navega al wizard de creación de agente (Create Agent) desde el dashboard.
 * Requiere que el estado inicial tenga perfil configurado (PROFILE_WITH_TEAM_NO_AGENTS_STATS o similar).
 */
export async function navigateToCreateAgent(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await page
    .getByRole('button', { name: /create manually/i })
    .first()
    .click();
  await page.getByText('Create New Agent').waitFor({ state: 'visible' });
}

/**
 * Navega al wizard de edición de un agente existente y espera a que el wizard cargue.
 * Requiere stats con el agente populado y su id (por defecto 'backend-worker').
 *
 * Devuelve con el wizard en el tab 'Identity' activo y listo para usar.
 */
export async function navigateToEditAgent(
  page: Page,
  agentId: string,
  agentData: Record<string, unknown>,
): Promise<void> {
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );

  // Click on the agent card (by name or id in the team agents card)
  await page.getByRole('tab', { name: /worker/i }).click();
  await page
    .getByText(agentData.name as string)
    .first()
    .click();

  // Wait for the edit page to request agent data
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'requestAgentData'),
    { timeout: 5000 },
  );

  // Respond with full agent data
  await page.evaluate(
    (msg) => {
      window.dispatchEvent(new MessageEvent('message', { data: msg }));
    },
    { type: 'agentData', agentId, ...agentData } as any,
  );

  // Wait for the wizard to mount
  await page.getByText('Agent Wizard').waitFor({ state: 'visible' });
}

/**
 * Navega a la página Profile Editor desde el dashboard.
 * Requiere que el estado inicial tenga perfil configurado (FULL_SETUP_STATS o similar).
 */
export async function navigateToProfileEditor(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await page.getByRole('button', { name: /quick actions/i }).click();
  await page.getByRole('menuitem', { name: /edit profile/i }).click();
  await page.getByRole('heading', { name: /edit profile/i }).waitFor({ state: 'visible' });
}

/**
 * Navega a la página Agent Manager desde el dashboard.
 * Requiere que el estado inicial tenga agentes con globalCatalog.agents[] populado.
 */
export async function navigateToAgentManager(
  page: Page,
  stats: Partial<DashboardStats>,
): Promise<void> {
  await injectVscodeApi(page);
  await setInitialState(page, stats);
  await page.goto('/dashboard.html');
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await page.getByRole('button', { name: /quick actions/i }).click();
  await page.getByRole('menuitem', { name: /manage agents/i }).click();
  await page.getByRole('heading', { name: /agent manager/i }).waitFor({ state: 'visible' });
}

/**
 * Navega a la página Team Manager desde el dashboard.
 * Requiere que el estado inicial tenga teams con globalCatalog.teams[] populado.
 */
export async function navigateToTeamManager(
  page: Page,
  stats: Partial<DashboardStats>,
): Promise<void> {
  await injectVscodeApi(page);
  await setInitialState(page, stats);
  await page.goto('/dashboard.html');
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await page.getByRole('button', { name: /quick actions/i }).click();
  await page.getByRole('menuitem', { name: /manage teams/i }).click();
  await page.getByRole('heading', { name: /team manager/i }).waitFor({ state: 'visible' });
}
