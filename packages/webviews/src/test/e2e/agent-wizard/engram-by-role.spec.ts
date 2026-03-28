/**
 * Agent Wizard — Engram description por rol E2E Tests
 *
 * Cubre TC-21: el toggle de Engram en BehaviorStep muestra una descripción
 * específica al rol seleccionado (worker, router, orchestrator).
 *
 * El toggle de Engram está en el tab "Behavior" (paso 4).
 * Se usa Edit Agent para poder navegar a tabs no-Identity (isConfigurationEnabled=true).
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS } from '../../fixtures';
import {
  injectVscodeApi,
  navigateToEditAgentRulesTab,
  sendExtensionMessage,
  setInitialState,
} from '../../helpers';

async function setup(page: import('@playwright/test').Page) {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');
  await navigateToEditAgentRulesTab(page);
}

/** Activa el toggle de Engram si no está ya activado */
async function enableEngram(page: import('@playwright/test').Page) {
  const engramSwitch = page.getByRole('switch').first();
  if (!(await engramSwitch.isChecked())) {
    await engramSwitch.click();
  }
}

/** Cambia el rol volviendo al tab Identity y seleccionando el nuevo rol */
async function changeRoleTo(
  page: import('@playwright/test').Page,
  role: 'worker' | 'router' | 'orchestrator',
) {
  await page.getByRole('tab', { name: /identity/i }).click();
  await page.locator('#agent-role').selectOption(role);
  await page.getByRole('tab', { name: /rules/i }).click();
}

test.describe('TC-21: Engram description por rol', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('rol worker → descripción menciona "Recall task context"', async ({ page }) => {
    // El agente ya está cargado como worker
    await enableEngram(page);
    await expect(page.getByText(/recall task context/i)).toBeVisible();
  });

  test('rol router → descripción menciona "Enable Engram MCP access"', async ({ page }) => {
    await changeRoleTo(page, 'router');
    await enableEngram(page);
    await expect(page.getByText(/enable engram mcp access/i)).toBeVisible();
  });

  test('rol orchestrator → descripción menciona "Enable Engram MCP access"', async ({ page }) => {
    await changeRoleTo(page, 'orchestrator');
    await enableEngram(page);
    await expect(page.getByText(/enable engram mcp access/i)).toBeVisible();
  });

  test('cambiar de worker a router → la descripción cambia', async ({ page }) => {
    // Engram activado como worker
    await enableEngram(page);
    await expect(page.getByText(/recall task context/i)).toBeVisible();

    // Cambiar a router
    await changeRoleTo(page, 'router');
    // No need to re-enable: engram toggle state persists

    await expect(page.getByText(/enable engram mcp access/i)).toBeVisible();
    await expect(page.getByText(/recall task context/i)).not.toBeVisible();
  });

  test('Engram no visible si engramConfigured=false', async ({ page }) => {
    // Enviar stats sin engram configurado
    await sendExtensionMessage(page, {
      type: 'updateStats',
      stats: { ...FULL_SETUP_STATS, engramConfigured: false },
    });
    await expect(page.getByText('Engram')).not.toBeVisible();
  });
});
