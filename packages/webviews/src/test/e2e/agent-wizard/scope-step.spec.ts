/**
 * Agent Wizard — Scope Step E2E Tests
 *
 * Cubre §4 (Paso 2 Scope) del checklist:
 *  - Expertise chips: añadir y que aparezcan en la lista
 *  - Intents: error inline cuando no hay intents en rol worker (validación de
 *    "Add at least one intent" vía useAgentFieldErrors)
 *  - Path Globs: visible para worker, ocultos para orchestrator
 *  - Scope Excludes: visible para worker, ocultos para orchestrator
 *
 * Usa Edit Agent para tener isConfigurationEnabled=true y poder navegar al
 * tab Scope directamente.
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS, PROFILE_WITH_TEAM_NO_AGENTS_STATS } from '../../fixtures';
import {
  injectVscodeApi,
  navigateToCreateAgent,
  sendExtensionMessage,
  setInitialState,
} from '../../helpers';

const DEBOUNCE_MS = 350;

// ── Create Agent flow helpers ─────────────────────────────────────────────────

async function setupCreateAgent(page: import('@playwright/test').Page) {
  await injectVscodeApi(page);
  await setInitialState(page, PROFILE_WITH_TEAM_NO_AGENTS_STATS);
  await page.goto('/dashboard.html');
  await navigateToCreateAgent(page);
}

async function _fillIdentityAndEnableScope(
  page: import('@playwright/test').Page,
  role: 'worker' | 'orchestrator',
) {
  await page.getByLabel(/agent name/i).fill('Test Agent');
  await page.getByLabel(/description/i).fill('A description long enough to pass');
  await page.locator('#agent-role').selectOption(role);
  if (role === 'worker') {
    // Add one intent to make the form valid and enable other tabs
    const intentInput = page.locator('#agent-intents');
    await intentInput.fill('my_intent');
    await intentInput.press('Enter');
  } else {
    // Orchestrator requires intent too (role !== 'router')
    const intentInput = page.locator('#agent-intents');
    await intentInput.fill('orchestrate_task');
    await intentInput.press('Enter');
  }
}

// ── Edit Agent flow helpers ───────────────────────────────────────────────────

async function setupEditAgentScopeTab(
  page: import('@playwright/test').Page,
  role: 'worker' | 'orchestrator' = 'worker',
) {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');

  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );

  await page.getByRole('tab', { name: /worker/i }).click();
  await page.getByText('Backend Worker').first().click();

  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'requestAgentData'),
    { timeout: 5000 },
  );

  await sendExtensionMessage(page, {
    type: 'agentData',
    agentId: 'backend-worker',
    name: 'Backend Worker',
    role,
    description: 'Handles backend API tasks and processes requests efficiently',
    workflow: ['Analyse the incoming request', 'Process and generate response'],
    intents: ['handle_request'],
    tools: [],
  });

  await page.getByText('Agent Wizard').waitFor({ state: 'visible' });
  await page.getByRole('tab', { name: /scope/i }).click();
}

// ── Tests: Expertise chips ────────────────────────────────────────────────────

test.describe('TC-22b: Scope Step — Expertise chips', () => {
  test('añadir expertise chip → aparece en la lista como badge', async ({ page }) => {
    await setupEditAgentScopeTab(page);

    const expertiseInput = page.locator('#agent-expertise');
    await expertiseInput.fill('REST APIs');
    await expertiseInput.press('Enter');

    await expect(page.getByText('REST APIs')).toBeVisible();
  });

  test('añadir varios expertise chips → todos aparecen', async ({ page }) => {
    await setupEditAgentScopeTab(page);

    const input = page.locator('#agent-expertise');
    for (const chip of ['REST APIs', 'GraphQL', 'SQL']) {
      await input.fill(chip);
      await input.press('Enter');
    }

    await expect(page.getByText('REST APIs')).toBeVisible();
    await expect(page.getByText('GraphQL')).toBeVisible();
    await expect(page.getByText('SQL')).toBeVisible();
  });
});

// ── Tests: Intent empty validation ───────────────────────────────────────────

test.describe('TC-22b: Scope Step — Intent vacío en worker', () => {
  test('worker sin intents → error "Add at least one intent" visible en Scope', async ({
    page,
  }) => {
    await setupCreateAgent(page);

    // Fill name + description + select worker role (no intents)
    await page.getByLabel(/agent name/i).fill('My Worker');
    await page.getByLabel(/description/i).fill('Handles API requests and responses');
    await page.locator('#agent-role').selectOption('worker');

    await page.waitForTimeout(DEBOUNCE_MS);
    // Error is shown in the Intents ChipInput on the Identity step
    await expect(page.getByText(/add at least one intent/i)).toBeVisible();
  });

  test('añadir intent → error de intents desaparece', async ({ page }) => {
    await setupCreateAgent(page);

    await page.getByLabel(/agent name/i).fill('My Worker');
    await page.getByLabel(/description/i).fill('Handles API requests and responses');
    await page.locator('#agent-role').selectOption('worker');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/add at least one intent/i)).toBeVisible();

    const intentInput = page.locator('#agent-intents');
    await intentInput.fill('handle_request');
    await intentInput.press('Enter');

    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/add at least one intent/i)).not.toBeVisible();
  });

  test('router → no muestra error de intents aunque no haya ninguno', async ({ page }) => {
    await setupCreateAgent(page);

    await page.getByLabel(/agent name/i).fill('My Router');
    await page.getByLabel(/description/i).fill('Routes requests to the right agent');
    await page.locator('#agent-role').selectOption('router');

    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/add at least one intent/i)).not.toBeVisible();
  });
});

// ── Tests: Path Globs visibilidad por rol ────────────────────────────────────

test.describe('TC-22b: Scope Step — Path Globs visibilidad por rol', () => {
  test('worker → sección Path Globs es visible', async ({ page }) => {
    await setupEditAgentScopeTab(page, 'worker');
    await expect(page.getByText('Path Globs')).toBeVisible();
  });

  test('orchestrator → sección Path Globs no es visible', async ({ page }) => {
    await setupEditAgentScopeTab(page, 'orchestrator');
    await expect(page.getByText('Path Globs')).not.toBeVisible();
  });

  test('worker → añadir path glob → aparece como badge', async ({ page }) => {
    await setupEditAgentScopeTab(page, 'worker');

    const globInput = page.getByPlaceholder(/e\.g\. src\/api/i);
    await globInput.fill('src/api/**/*.ts');
    await globInput.press('Enter');

    await expect(page.getByText('src/api/**/*.ts')).toBeVisible();
  });
});

// ── Tests: Scope Excludes visibilidad por rol ────────────────────────────────

test.describe('TC-22b: Scope Step — Scope Excludes visibilidad por rol', () => {
  test('worker → sección Scope Excludes es visible', async ({ page }) => {
    await setupEditAgentScopeTab(page, 'worker');
    await expect(page.getByText('Scope Excludes')).toBeVisible();
  });

  test('orchestrator → sección Scope Excludes no es visible', async ({ page }) => {
    await setupEditAgentScopeTab(page, 'orchestrator');
    await expect(page.getByText('Scope Excludes')).not.toBeVisible();
  });
});
