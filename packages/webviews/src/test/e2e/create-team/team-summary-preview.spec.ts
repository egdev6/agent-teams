/**
 * Create Team — Team Summary Card Preview E2E Tests
 *
 * Cubre §7 del checklist (preview en el sidebar):
 *  - El TeamSummaryCard muestra el nombre del equipo en tiempo real al escribir
 *  - El TeamSummaryCard muestra la descripción al escribir
 *  - El TeamSummaryCard muestra el conteo de agentes seleccionados
 *  - Los agentes seleccionados aparecen como badges en la sección Members
 *
 * TeamSummaryCard no es un YAML literal sino un preview visual estructurado.
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS } from '../../fixtures';
import { injectVscodeApi, setInitialState } from '../../helpers';

async function navigateToCreateTeam(page: import('@playwright/test').Page): Promise<void> {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await page.getByRole('button', { name: /quick actions/i }).click();
  await page.getByRole('menuitem', { name: /manage teams/i }).click();
  await page.getByRole('heading', { name: /team manager/i }).waitFor({ state: 'visible' });
  await page
    .getByRole('button', { name: /create team/i })
    .first()
    .click();
  await page.getByRole('heading', { name: /create new team/i }).waitFor({ state: 'visible' });
}

// ── Tests: Summary Card actualización en tiempo real ─────────────────────────

test.describe('TC-25b: Team Summary Card — preview en tiempo real', () => {
  test.beforeEach(async ({ page }) => navigateToCreateTeam(page));

  test('escribir nombre → aparece en el Summary Card', async ({ page }) => {
    await page.getByLabel(/team name/i).fill('Frontend Quality Team');

    await expect(page.getByText('Frontend Quality Team')).toBeVisible();
  });

  test('sin nombre → summary muestra "Unnamed Team"', async ({ page }) => {
    await expect(page.getByText('Unnamed Team')).toBeVisible();
  });

  test('escribir descripción → aparece en el Summary Card', async ({ page }) => {
    await page.getByLabel(/team name/i).fill('My Team');
    await page.getByLabel(/description/i).fill('Responsible for frontend quality');

    await expect(page.getByText('Responsible for frontend quality')).toBeVisible();
  });

  test('seleccionar agente → conteo aumenta en el Summary Card', async ({ page }) => {
    await page.getByLabel(/team name/i).fill('My Team');

    // FULL_SETUP_STATS tiene backend-worker y frontend-worker
    const _backendAgentToggle = page
      .getByText('Backend Worker')
      .locator('xpath=ancestor::*[contains(@class,"flex")]')
      .first();

    // Toggle el agente (puede ser un Switch o un checkbox)
    const agentRow = page.locator('[class*="flex"]').filter({ hasText: 'Backend Worker' }).first();
    const agentSwitch = agentRow.getByRole('switch').or(agentRow.getByRole('checkbox'));
    await agentSwitch.click();

    // El summary debe mostrar "1 agents"
    await expect(page.getByText(/1 agent/i)).toBeVisible();
  });

  test('seleccionar agente → nombre del agente aparece como badge en Members', async ({ page }) => {
    await page.getByLabel(/team name/i).fill('My Team');

    // Seleccionar Backend Worker
    const agentRow = page.locator('[class*="flex"]').filter({ hasText: 'Backend Worker' }).first();
    const agentSwitch = agentRow.getByRole('switch').or(agentRow.getByRole('checkbox'));
    await agentSwitch.click();

    // El nombre debe aparecer en la sección Members del Summary Card
    const summaryCard = page
      .getByText('Summary')
      .locator('xpath=ancestor::*[contains(@class,"card")]')
      .first();
    await expect(summaryCard.getByText('Backend Worker')).toBeVisible();
  });
});
