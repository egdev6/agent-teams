/**
 * Create Team — E2E Tests
 *
 * Cubre TC-25: página Create New Team.
 *  - La página renderiza el título "Create New Team"
 *  - El botón "Create Team" está deshabilitado cuando el nombre está vacío
 *  - Escribir un nombre activa el botón y envía createTeam con los datos correctos
 *  - El botón "Cancel" navega de vuelta
 */

import { expect, test } from '@playwright/test';
import { PROFILE_WITH_TEAM_NO_AGENTS_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  setInitialState,
} from '../../helpers';

async function navigateToCreateTeam(page: import('@playwright/test').Page): Promise<void> {
  await injectVscodeApi(page);
  await setInitialState(page, PROFILE_WITH_TEAM_NO_AGENTS_STATS);
  await page.goto('/dashboard.html');
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await page.getByRole('button', { name: /quick actions/i }).click();
  await page.getByRole('menuitem', { name: /manage teams/i }).click();
  await page.getByRole('heading', { name: /team manager/i }).waitFor({ state: 'visible' });
  // Click the primary "Create Team" button in the page header
  await page
    .getByRole('button', { name: /create team/i })
    .first()
    .click();
  await page.getByRole('heading', { name: /create new team/i }).waitFor({ state: 'visible' });
}

test.describe('TC-25: Create Team — render y validación', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCreateTeam(page);
  });

  test('la página muestra el heading "Create New Team"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create new team/i })).toBeVisible();
  });

  test('el botón "Create Team" está deshabilitado cuando el nombre está vacío', async ({
    page,
  }) => {
    const createButton = page.getByRole('button', { name: /^create team$/i });
    await expect(createButton).toBeDisabled();
  });

  test('escribir un nombre activa el botón "Create Team"', async ({ page }) => {
    await page.getByLabel(/team name/i).fill('My New Team');
    const createButton = page.getByRole('button', { name: /^create team$/i });
    await expect(createButton).toBeEnabled();
  });
});

test.describe('TC-25: Create Team — crear equipo', () => {
  test('crear equipo envía createTeam con teamId y name correctos', async ({ page }) => {
    await navigateToCreateTeam(page);

    await page.getByLabel(/team name/i).fill('My New Team');
    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /^create team$/i }).click();

    const messages = await getCapturedMessages(page);
    const createMsg = messages.find((m: any) => m.type === 'createTeam') as any;
    expect(createMsg).toBeDefined();
    expect(createMsg.name).toBe('My New Team');
    expect(createMsg.teamId).toBe('my-new-team');
  });

  test('botón "Cancel" navega de vuelta', async ({ page }) => {
    await navigateToCreateTeam(page);
    await page.getByRole('button', { name: /cancel/i }).click();
    await page
      .getByRole('heading', { name: /create new team/i })
      .waitFor({ state: 'hidden', timeout: 3000 });
  });
});
