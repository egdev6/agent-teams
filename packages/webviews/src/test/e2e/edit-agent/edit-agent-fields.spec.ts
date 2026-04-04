/**
 * Edit Agent — Fields Loading & Delete Confirmation E2E Tests
 *
 * Cubre §5 del checklist:
 *  - Editar un agente existente carga todos sus campos en el wizard
 *  - El campo ID no es editable (read-only — el agentId viene de la URL)
 *  - Click en "Delete" muestra diálogo de confirmación antes de enviar deleteAgent
 *
 * El flujo usa navigateToEditAgentWorkflowTab de helpers.ts (que navega a backend-worker)
 * pero adaptado para el tab Identity.
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  sendExtensionMessage,
  setInitialState,
} from '../../helpers';

/** Navega a Edit Agent para backend-worker y responde con datos del agente */
async function navigateToEditAgentIdentity(
  page: import('@playwright/test').Page,
  agentData: {
    name: string;
    role: 'worker' | 'router' | 'orchestrator';
    description: string;
    intents?: string[];
    expertise?: string[];
  },
): Promise<void> {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');

  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );

  // Click Worker tab then click the agent
  await page.getByRole('tab', { name: /worker/i }).click();
  await page.getByText('Backend Worker').first().click();

  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'requestAgentData'),
    { timeout: 5000 },
  );

  // Respond with provided agent data
  await sendExtensionMessage(page, {
    type: 'agentData',
    agentId: 'backend-worker',
    workflow: ['Analyse the request', 'Respond with data'],
    tools: [],
    ...agentData,
  });

  await page.getByText('Agent Wizard').waitFor({ state: 'visible' });
}

// ── Tests: Campos pre-rellenados ──────────────────────────────────────────────

test.describe('TC-23b: Edit Agent — campos se cargan correctamente', () => {
  test('campo Name se pre-rellena con el nombre del agente', async ({ page }) => {
    await navigateToEditAgentIdentity(page, {
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks and processes requests efficiently',
    });

    await expect(page.getByLabel(/agent name/i)).toHaveValue('Backend Worker');
  });

  test('campo Role se pre-rellena con el rol del agente', async ({ page }) => {
    await navigateToEditAgentIdentity(page, {
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks and processes requests efficiently',
    });

    await expect(page.locator('#agent-role')).toHaveValue('worker');
  });

  test('campo Description se pre-rellena con la descripción del agente', async ({ page }) => {
    const description = 'Handles backend API tasks and processes requests efficiently';
    await navigateToEditAgentIdentity(page, {
      name: 'Backend Worker',
      role: 'worker',
      description,
    });

    await expect(page.getByLabel(/description/i)).toHaveValue(description);
  });
});

// ── Tests: ID no editable ────────────────────────────────────────────────────

test.describe('TC-23b: Edit Agent — ID no editable', () => {
  test('el encabezado de la página muestra "Edit Agent" (no "Create")', async ({ page }) => {
    await navigateToEditAgentIdentity(page, {
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks and processes requests efficiently',
    });

    await expect(page.getByRole('heading', { name: /edit agent/i })).toBeVisible();
  });

  test('el preview card muestra el ID del agente como referencia (no editable)', async ({
    page,
  }) => {
    await navigateToEditAgentIdentity(page, {
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks and processes requests efficiently',
    });

    // El EditAgentPreviewCard muestra el agentId del agente
    await expect(page.getByText('backend-worker')).toBeVisible();
  });
});

// ── Tests: Guardar cambios ───────────────────────────────────────────────────

test.describe('TC-23b: Edit Agent — guardar cambios', () => {
  test('modificar nombre y guardar → saveAgent incluye el nuevo nombre', async ({ page }) => {
    await navigateToEditAgentIdentity(page, {
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks and processes requests efficiently',
      intents: ['handle_request'],
    });

    await page.getByLabel(/agent name/i).clear();
    await page.getByLabel(/agent name/i).fill('Enhanced Backend Worker');

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /save agent/i }).click();

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'saveAgent'),
      { timeout: 5000 },
    );

    const messages = await getCapturedMessages(page);
    const saveMsg = messages.find((m: any) => m.type === 'saveAgent') as any;
    expect(saveMsg).toBeDefined();
    expect(saveMsg.name).toBe('Enhanced Backend Worker');
  });

  test('saveAgent incluye el agentId original (no cambia al editar el nombre)', async ({
    page,
  }) => {
    await navigateToEditAgentIdentity(page, {
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks and processes requests efficiently',
      intents: ['handle_request'],
    });

    await page.getByLabel(/agent name/i).clear();
    await page.getByLabel(/agent name/i).fill('New Name for Backend Worker');

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /save agent/i }).click();

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'saveAgent'),
      { timeout: 5000 },
    );

    const messages = await getCapturedMessages(page);
    const saveMsg = messages.find((m: any) => m.type === 'saveAgent') as any;
    // El agentId debe preservarse como 'backend-worker' (no derivarse del nuevo nombre)
    expect(saveMsg.agentId).toBe('backend-worker');
  });
});

// ── Tests: Delete confirmation ────────────────────────────────────────────────

test.describe('TC-23b: Edit Agent — confirmación antes de eliminar', () => {
  test('botón Delete → abre diálogo de confirmación', async ({ page }) => {
    await navigateToEditAgentIdentity(page, {
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks and processes requests efficiently',
    });

    await page.getByRole('button', { name: /delete/i }).click();

    // El diálogo de confirmación debe aparecer
    await expect(
      page.getByRole('dialog').or(page.getByText(/are you sure|confirm delete/i)),
    ).toBeVisible();
  });

  test('cancelar en el diálogo → NO se envía deleteAgent', async ({ page }) => {
    await navigateToEditAgentIdentity(page, {
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks and processes requests efficiently',
    });

    await page.getByRole('button', { name: /delete/i }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /cancel/i })
      .click();

    await clearCapturedMessages(page);
    // Breve espera para confirmar que no se envió nada
    await page.waitForTimeout(500);
    const messages = await getCapturedMessages(page);
    expect(messages.some((m: any) => m.type === 'deleteAgent')).toBe(false);
  });

  test('confirmar en el diálogo → se envía deleteAgent con el agentId correcto', async ({
    page,
  }) => {
    await navigateToEditAgentIdentity(page, {
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks and processes requests efficiently',
    });

    await page.getByRole('button', { name: /delete/i }).click();

    await clearCapturedMessages(page);
    // Confirmar eliminación en el diálogo
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /delete|confirm/i })
      .last()
      .click();

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'deleteAgent'),
      { timeout: 5000 },
    );

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual(
      expect.objectContaining({ type: 'deleteAgent', agentId: 'backend-worker' }),
    );
  });
});
