/**
 * Profile Editor — Submit E2E Tests
 *
 * Cubre TC-24: acciones de la página Profile Editor.
 *  - "Save Profile" envía saveProfile con los datos del formulario
 *  - "Re-detect" en Technologies envía requestDetectedConfig
 *  - "Cancel" navega de vuelta al dashboard
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  setInitialState,
} from '../../helpers';

async function navigateToProfileEditor(page: import('@playwright/test').Page): Promise<void> {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await page.getByRole('button', { name: /quick actions/i }).click();
  await page.getByRole('menuitem', { name: /edit profile/i }).click();
  await page.getByRole('heading', { name: /edit profile/i }).waitFor({ state: 'visible' });
}

test.describe('TC-24: Profile Editor — Save Profile', () => {
  test('guardar perfil envía saveProfile con el nombre actualizado', async ({ page }) => {
    await navigateToProfileEditor(page);

    // La sección "Basic Information" está abierta por defecto
    const nameInput = page.locator('#project-name');
    await expect(nameInput).toBeVisible();
    await nameInput.clear();
    await nameInput.fill('Test Project');

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /save profile/i }).click();

    const messages = await getCapturedMessages(page);
    const saveMsg = messages.find((m: any) => m.type === 'saveProfile') as any;
    expect(saveMsg).toBeDefined();
    expect(saveMsg.profile.name).toBe('Test Project');
  });

  test('saveProfile incluye syncTargets del perfil inicial', async ({ page }) => {
    await navigateToProfileEditor(page);

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /save profile/i }).click();

    const messages = await getCapturedMessages(page);
    const saveMsg = messages.find((m: any) => m.type === 'saveProfile') as any;
    expect(saveMsg).toBeDefined();
    expect(Array.isArray(saveMsg.profile.syncTargets)).toBe(true);
    expect(saveMsg.profile.syncTargets.length).toBeGreaterThan(0);
  });
});

test.describe('TC-24: Profile Editor — Re-detect Technologies', () => {
  test('botón "Re-detect" envía requestDetectedConfig', async ({ page }) => {
    await navigateToProfileEditor(page);

    // Expandir el accordion "Technologies"
    await page.getByRole('button', { name: /technologies/i }).click();
    await page.getByRole('button', { name: /re-detect/i }).waitFor({ state: 'visible' });

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /re-detect/i }).click();

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'requestDetectedConfig' });
  });
});

test.describe('TC-24: Profile Editor — Cancel', () => {
  test('botón "Cancel" sale de la página de edición de perfil', async ({ page }) => {
    await navigateToProfileEditor(page);
    await page.getByRole('button', { name: /cancel/i }).click();
    await page
      .getByRole('heading', { name: /edit profile/i })
      .waitFor({ state: 'hidden', timeout: 3000 });
  });
});
