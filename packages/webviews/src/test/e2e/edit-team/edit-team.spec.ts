/**
 * Edit Team — E2E Tests
 *
 * Cubre TC-27: página de edición de equipo (EditTeamPage).
 *  - La página envía requestTeamData al montarse
 *  - El formulario se pre-rellena cuando llegan los datos del equipo
 *  - "Save Changes" envía saveTeam con los datos actualizados
 *  - "Set as Active Team" envía setActiveTeam
 *  - "Delete Team" envía deleteTeam
 *
 * Nota: se usa local-team (no activo) para que "Delete Team" y "Set as Active Team"
 * estén habilitados (ambos se deshabilitan cuando isActiveTeam === true).
 */

import { expect, test } from '@playwright/test';
import { UNSYNCED_TEAM_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  navigateToTeamManager,
  sendExtensionMessage,
} from '../../helpers';

async function navigateToEditLocalTeam(page: import('@playwright/test').Page): Promise<void> {
  await navigateToTeamManager(page, UNSYNCED_TEAM_STATS);
  // Clic en la tarjeta local-team → navega a /edit-team/local-team
  await page.getByText('Local Team').first().click();
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'requestTeamData'),
    { timeout: 5000 },
  );
}

async function hydrate(page: import('@playwright/test').Page): Promise<void> {
  await sendExtensionMessage(page, {
    type: 'teamData',
    teamId: 'local-team',
    name: 'Local Team',
    description: 'A local-only team',
    agents: [],
    tags: [],
  });
  // Esperar a que el formulario muestre el nombre recibido
  await expect(page.getByRole('textbox', { name: /team name/i })).toHaveValue('Local Team', {
    timeout: 3000,
  });
}

test.describe('TC-27: Edit Team — carga de datos', () => {
  test('la página envía requestTeamData al montarse', async ({ page }) => {
    await navigateToTeamManager(page, UNSYNCED_TEAM_STATS);
    await clearCapturedMessages(page);
    await page.getByText('Local Team').first().click();

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'requestTeamData'),
      { timeout: 5000 },
    );

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual(
      expect.objectContaining({ type: 'requestTeamData', teamId: 'local-team' }),
    );
  });

  test('el formulario muestra el nombre del equipo recibido', async ({ page }) => {
    await navigateToEditLocalTeam(page);
    await hydrate(page);
    await expect(page.getByRole('textbox', { name: /team name/i })).toHaveValue('Local Team');
  });
});

test.describe('TC-27: Edit Team — acciones', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToEditLocalTeam(page);
    await hydrate(page);
  });

  test('"Save Changes" envía saveTeam con el nombre actualizado', async ({ page }) => {
    const nameInput = page.getByRole('textbox', { name: /team name/i });
    await nameInput.clear();
    await nameInput.fill('Updated Team Name');

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /save changes/i }).click();

    const messages = await getCapturedMessages(page);
    const saveMsg = messages.find((m: any) => m.type === 'saveTeam') as any;
    expect(saveMsg).toBeDefined();
    expect(saveMsg.teamId).toBe('local-team');
    expect(saveMsg.name).toBe('Updated Team Name');
  });

  test('"Set as Active Team" envía setActiveTeam', async ({ page }) => {
    // local-team no es el activo → botón habilitado
    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /set as active team/i }).click();

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'setActiveTeam', teamId: 'local-team' });
  });

  test('"Delete Team" envía deleteTeam', async ({ page }) => {
    // local-team no es el activo → botón de eliminar habilitado
    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /delete team/i }).click();

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'deleteTeam', teamId: 'local-team' });
  });
});
