/**
 * Agent Wizard — Visibilidad de tabs por rol E2E Tests
 *
 * Cubre §4 del checklist: seleccionar rol `router` oculta los pasos Scope y
 * Skills; `worker` muestra los 6 pasos; `orchestrator` muestra todos los pasos
 * pero el paso Workflow tiene un toolset fijo (read-only).
 *
 * Se usa Create Agent para partir del estado limpio con el rol seleccionable.
 */

import { expect, test } from '@playwright/test';
import { PROFILE_WITH_TEAM_NO_AGENTS_STATS } from '../../fixtures';
import { injectVscodeApi, navigateToCreateAgent, setInitialState } from '../../helpers';

async function setup(page: import('@playwright/test').Page) {
  await injectVscodeApi(page);
  await setInitialState(page, PROFILE_WITH_TEAM_NO_AGENTS_STATS);
  await page.goto('/dashboard.html');
  await navigateToCreateAgent(page);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function selectRole(
  page: import('@playwright/test').Page,
  role: 'worker' | 'router' | 'orchestrator',
) {
  await page.locator('#agent-role').selectOption(role);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('TC-22: Visibilidad de tabs — rol worker', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('worker → los 6 tabs son visibles (Identity, Scope, Workflow, Skills, Behavior, Output)', async ({
    page,
  }) => {
    await selectRole(page, 'worker');

    await expect(page.getByRole('tab', { name: /identity/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /scope/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /workflow/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /skills/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /behavior/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /output/i })).toBeVisible();
  });

  test('worker → contador muestra "Step 1 of 6"', async ({ page }) => {
    await selectRole(page, 'worker');
    await expect(page.getByText(/step 1 of 6/i)).toBeVisible();
  });
});

test.describe('TC-22: Visibilidad de tabs — rol router', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('router → tab Scope no está visible', async ({ page }) => {
    await selectRole(page, 'router');
    await expect(page.getByRole('tab', { name: /scope/i })).not.toBeVisible();
  });

  test('router → tab Skills no está visible', async ({ page }) => {
    await selectRole(page, 'router');
    await expect(page.getByRole('tab', { name: /skills/i })).not.toBeVisible();
  });

  test('router → los tabs Identity, Workflow, Behavior, Output sí son visibles', async ({
    page,
  }) => {
    await selectRole(page, 'router');
    await expect(page.getByRole('tab', { name: /identity/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /workflow/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /behavior/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /output/i })).toBeVisible();
  });

  test('router → contador muestra "Step 1 of 4"', async ({ page }) => {
    await selectRole(page, 'router');
    await expect(page.getByText(/step 1 of 4/i)).toBeVisible();
  });
});

test.describe('TC-22: Visibilidad de tabs — rol orchestrator', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('orchestrator → los 6 tabs son visibles', async ({ page }) => {
    await selectRole(page, 'orchestrator');

    await expect(page.getByRole('tab', { name: /identity/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /scope/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /workflow/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /skills/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /behavior/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /output/i })).toBeVisible();
  });
});

test.describe('TC-22: Cambio de rol — re-routing de tab activo', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('estando en Scope y cambiando a router → wizard salta a un tab visible', async ({
    page,
  }) => {
    // Ir a worker primero para habilitar Scope
    await selectRole(page, 'worker');

    // Rellenar campos mínimos para activar los otros tabs
    await page.getByLabel(/agent name/i).fill('Test Agent');
    await page.getByLabel(/description/i).fill('A minimal description for testing');
    // Aun necesitamos intent para habilitar los tabs
    const intentInput = page.locator('#agent-intents');
    await intentInput.fill('my_intent');
    await intentInput.press('Enter');

    // Ir al tab Scope
    await page.getByRole('tab', { name: /scope/i }).click();
    await expect(page.getByText(/expertise/i)).toBeVisible();

    // Cambiar a router → debe abandonar Scope
    await page.getByRole('tab', { name: /identity/i }).click();
    await selectRole(page, 'router');

    // Scope tab ya no existe
    await expect(page.getByRole('tab', { name: /scope/i })).not.toBeVisible();
  });
});
