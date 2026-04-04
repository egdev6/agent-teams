/**
 * Agent Wizard — Save Button & ID Collision E2E Tests
 *
 * Cubre §4 (Guardado) y §5 del checklist:
 *  - Botón Save deshabilitado cuando faltan campos requeridos, con tooltip explicativo
 *  - Botón Save habilitado cuando el formulario es válido
 *  - El ID se auto-deriva del nombre con kebab-case
 *  - Error de colisión: si la extensión responde con success=false, el error aparece en la UI
 */

import { expect, test } from '@playwright/test';
import { PROFILE_WITH_TEAM_NO_AGENTS_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  navigateToCreateAgent,
  sendExtensionMessage,
  setInitialState,
} from '../../helpers';

const DEBOUNCE_MS = 350;

async function setup(page: import('@playwright/test').Page) {
  await injectVscodeApi(page);
  await setInitialState(page, PROFILE_WITH_TEAM_NO_AGENTS_STATS);
  await page.goto('/dashboard.html');
  await navigateToCreateAgent(page);
}

// ── Tests: Save button disabled state ────────────────────────────────────────

test.describe('TC-22d: Save button — estado deshabilitado', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('formulario vacío → botón Save está deshabilitado', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^save agent$|^create agent$/i })).toBeDisabled();
  });

  test('sólo nombre rellenado → Save aún deshabilitado', async ({ page }) => {
    await page.getByLabel(/agent name/i).fill('My Agent');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByRole('button', { name: /^save agent$|^create agent$/i })).toBeDisabled();
  });

  test('nombre + descripción pero sin rol → Save deshabilitado', async ({ page }) => {
    await page.getByLabel(/agent name/i).fill('My Agent');
    await page.getByLabel(/description/i).fill('A description long enough to pass validation');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByRole('button', { name: /^save agent$|^create agent$/i })).toBeDisabled();
  });

  test('worker sin intents → Save deshabilitado', async ({ page }) => {
    await page.getByLabel(/agent name/i).fill('My Agent');
    await page.getByLabel(/description/i).fill('A description long enough to pass validation');
    await page.locator('#agent-role').selectOption('worker');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByRole('button', { name: /^save agent$|^create agent$/i })).toBeDisabled();
  });
});

// ── Tests: Save button enabled state ─────────────────────────────────────────

test.describe('TC-22d: Save button — estado habilitado', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('formulario válido para worker → botón Save habilitado', async ({ page }) => {
    await page.getByLabel(/agent name/i).fill('My Worker Agent');
    await page.getByLabel(/description/i).fill('A description long enough to pass validation');
    await page.locator('#agent-role').selectOption('worker');

    const intentInput = page.locator('#agent-intents');
    await intentInput.fill('handle_request');
    await intentInput.press('Enter');

    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByRole('button', { name: /^save agent$|^create agent$/i })).toBeEnabled();
  });

  test('formulario válido para router (sin intents) → botón Save habilitado', async ({ page }) => {
    await page.getByLabel(/agent name/i).fill('My Router');
    await page.getByLabel(/description/i).fill('Routes requests to the right agent domain');
    await page.locator('#agent-role').selectOption('router');

    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByRole('button', { name: /^save agent$|^create agent$/i })).toBeEnabled();
  });
});

// ── Tests: ID derivado del nombre ─────────────────────────────────────────────

test.describe('TC-22d: ID derivado del nombre', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('el payload createAgent incluye id derivado en kebab-case del nombre', async ({ page }) => {
    await page.getByLabel(/agent name/i).fill('My Backend Worker');
    await page.getByLabel(/description/i).fill('Handles backend tasks for the API layer');
    await page.locator('#agent-role').selectOption('router');

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /^save agent$|^create agent$/i }).click();

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'createAgent'),
      { timeout: 5000 },
    );

    const messages = await getCapturedMessages(page);
    const createMsg = messages.find((m: any) => m.type === 'createAgent') as any;
    expect(createMsg.id).toBe('my-backend-worker');
  });
});

// ── Tests: Collision error from extension ────────────────────────────────────

test.describe('TC-22d: Colisión de ID — error desde extensión', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('extensión responde con error → mensaje de error aparece en UI', async ({ page }) => {
    await page.getByLabel(/agent name/i).fill('Backend Worker');
    await page.getByLabel(/description/i).fill('An agent that already exists in the workspace');
    await page.locator('#agent-role').selectOption('router');

    await page.getByRole('button', { name: /^save agent$|^create agent$/i }).click();

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'createAgent'),
      { timeout: 5000 },
    );

    // Simulate the extension responding with a collision error
    await sendExtensionMessage(page, {
      type: 'createAgentResult',
      success: false,
      error: 'Agent with id "backend-worker" already exists',
    });

    await expect(page.getByText(/already exists/i)).toBeVisible();
  });
});
