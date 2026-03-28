/**
 * Team Manager — Not Synced Badge E2E Tests
 *
 * Cubre TC-18 (equipos): badges de estado en las tarjetas de equipo.
 *  - Badge "Not synced" aparece cuando useTeamManagerLogic resuelve unsynced: true
 *    (desde stats.teams enriched with globalCatalog.teams)
 *  - Badge "Local only" aparece cuando globalCatalog.teams[x].localOnly === true
 *  - Sin flags → sin badges
 *
 * useTeamManagerLogic mapea: globalCatalog.teams → TeamItem[], enriquecido con
 * unsynced desde stats.teams y localOnly desde globalCatalog.teams[x].localOnly.
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS, UNSYNCED_TEAM_STATS } from '../../fixtures';
import { injectVscodeApi, setInitialState } from '../../helpers';

async function navigateToTeamManager(
  page: import('@playwright/test').Page,
  stats: typeof UNSYNCED_TEAM_STATS,
) {
  await injectVscodeApi(page);
  await setInitialState(page, stats);
  await page.goto('/dashboard.html');
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  // Open the QuickActionsDropdown (Menu icon button with sr-only label)
  await page.getByRole('button', { name: /quick actions/i }).click();
  // Click the "Manage Teams" dropdown menu item
  await page.getByRole('menuitem', { name: /manage teams/i }).click();
  await page.getByRole('heading', { name: /team manager/i }).waitFor({ state: 'visible' });
}

test.describe('TC-18: Not synced badge — equipos', () => {
  test('equipo con unsynced:true muestra el badge "Not synced"', async ({ page }) => {
    await navigateToTeamManager(page, UNSYNCED_TEAM_STATS);
    // my-team tiene unsynced:true en stats.teams → useTeamManagerLogic lo mapea
    await expect(page.getByText('Not synced')).toBeVisible();
  });

  test('equipo con localOnly:true muestra el badge "Local only"', async ({ page }) => {
    await navigateToTeamManager(page, UNSYNCED_TEAM_STATS);
    // local-team tiene localOnly:true en globalCatalog.teams
    await expect(page.getByText('Local only')).toBeVisible();
  });

  test('equipo sin flags no muestra badges', async ({ page }) => {
    // FULL_SETUP_STATS tiene globalCatalog.teams vacío → ninguna tarjeta renderizada
    // → ningún badge de estado visible
    await navigateToTeamManager(page, FULL_SETUP_STATS);
    await expect(page.getByText('Not synced')).toHaveCount(0);
    await expect(page.getByText('Local only')).toHaveCount(0);
  });
});
