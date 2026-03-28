/**
 * Team Manager — Actions E2E Tests
 *
 * Cubre TC-26: acciones de la página Team Manager.
 *  - Botón "Activate Team" envía setActiveTeam con el teamId correcto
 *  - Hacer clic en la tarjeta de un equipo envía requestTeamData
 *  - El botón "Activate Team" está deshabilitado para el equipo activo
 */

import { expect, test } from '@playwright/test';
import { UNSYNCED_TEAM_STATS } from '../../fixtures';
import { clearCapturedMessages, getCapturedMessages, navigateToTeamManager } from '../../helpers';

test.describe('TC-26: Team Manager — Activate Team', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToTeamManager(page, UNSYNCED_TEAM_STATS);
  });

  test('botón "Activate Team" de local-team envía setActiveTeam', async ({ page }) => {
    // local-team no es el equipo activo → botón habilitado
    const localTeamCard = page.locator('[class*="card"]').filter({ hasText: 'Local Team' });
    await clearCapturedMessages(page);
    await localTeamCard.getByRole('button', { name: /activate team/i }).click();

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'setActiveTeam', teamId: 'local-team' });
  });

  test('"Activate Team" de my-team está deshabilitado (ya es el equipo activo)', async ({
    page,
  }) => {
    const myTeamCard = page
      .locator('[class*="card"]')
      .filter({ hasText: /^My Team/ })
      .first();
    await expect(myTeamCard.getByRole('button', { name: /activate team/i })).toBeDisabled();
  });
});

test.describe('TC-26: Team Manager — Navegar a Edit Team', () => {
  test('clic en la tarjeta del equipo envía requestTeamData', async ({ page }) => {
    await navigateToTeamManager(page, UNSYNCED_TEAM_STATS);

    await clearCapturedMessages(page);
    // Clic en el nombre/título de la tarjeta "My Team" (no en el botón Activate)
    await page.getByText('My Team').first().click();

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'requestTeamData'),
      { timeout: 5000 },
    );

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual(
      expect.objectContaining({ type: 'requestTeamData', teamId: 'my-team' }),
    );
  });
});
