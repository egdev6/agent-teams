/**
 * Context Packs — E2E Tests
 *
 * Cubre TC-29: página Context Packs.
 *  - La página envía requestContextPacksState al montarse
 *  - Los packs se muestran al recibir contextPacksState
 *  - "Save Selection" envía saveContextPacks con los packs seleccionados
 *  - El formulario de creación envía createContextPack con packId normalizado
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  sendExtensionMessage,
  setInitialState,
} from '../../helpers';

const PACKS_STATE = {
  type: 'contextPacksState' as const,
  availablePacks: ['pack-alpha', 'pack-beta'],
  selectedPacks: ['pack-beta'],
  packsMeta: [
    { id: 'pack-alpha', priority: 'standard' as const },
    { id: 'pack-beta', priority: 'standard' as const },
  ],
};

async function navigateToContextPacks(page: import('@playwright/test').Page): Promise<void> {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await page.getByRole('button', { name: /quick actions/i }).click();
  await page.getByRole('menuitem', { name: /context packs/i }).click();
  await page.getByRole('heading', { name: /^context packs$/i }).waitFor({ state: 'visible' });
}

test.describe('TC-29: Context Packs — carga inicial', () => {
  test('la página envía requestContextPacksState al montarse', async ({ page }) => {
    await navigateToContextPacks(page);
    await page.waitForFunction(
      () =>
        (window as any).__vscodeMessages?.filter((m: any) => m.type === 'requestContextPacksState')
          .length >= 2,
      { timeout: 5000 },
    );
    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'requestContextPacksState' });
  });
});

test.describe('TC-29: Context Packs — mostrar packs y guardar selección', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToContextPacks(page);
    await page.waitForFunction(
      () =>
        (window as any).__vscodeMessages?.filter((m: any) => m.type === 'requestContextPacksState')
          .length >= 2,
      { timeout: 5000 },
    );
    await sendExtensionMessage(page, PACKS_STATE);
  });

  test('muestra los packs recibidos en contextPacksState', async ({ page }) => {
    await expect(page.getByText('pack-alpha')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('pack-beta')).toBeVisible({ timeout: 3000 });
  });

  test('"Save Selection" envía saveContextPacks con los packs seleccionados', async ({ page }) => {
    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /save selection/i }).click();

    const messages = await getCapturedMessages(page);
    const saveMsg = messages.find((m: any) => m.type === 'saveContextPacks') as any;
    expect(saveMsg).toBeDefined();
    expect(Array.isArray(saveMsg.contextPacks)).toBe(true);
    // pack-beta estaba pre-seleccionado en el estado inicial
    expect(saveMsg.contextPacks).toContain('pack-beta');
  });

  test('crear nuevo pack envía createContextPack con el packId normalizado', async ({ page }) => {
    const input = page.getByPlaceholder(/new pack id/i);
    await input.fill('My New Pack');

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /^create$/i }).click();

    const messages = await getCapturedMessages(page);
    const createMsg = messages.find((m: any) => m.type === 'createContextPack') as any;
    expect(createMsg).toBeDefined();
    // normalizePackId convierte "My New Pack" → "my-new-pack"
    expect(createMsg.packId).toBe('my-new-pack');
    expect(createMsg.priority).toBe('standard');
  });
});
