/**
 * Import / Export — E2E Tests
 *
 * Cubre TC-30: página Import / Export.
 *  - La página renderiza el título "Import / Export"
 *  - La sección JSON Import/Export está abierta por defecto con sus botones
 *  - "Export Catalog" envía exportCatalog
 *  - La sección ZIP es accesible y "Export Profile as ZIP" envía exportProfile
 *
 * Nota: "Import Catalog" e "Import Profile" requieren un selector de archivos del
 * sistema operativo y se documentan como tests manuales (TC-30-M).
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  setInitialState,
} from '../../helpers';

async function navigateToImportExport(page: import('@playwright/test').Page): Promise<void> {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await page.getByRole('button', { name: /quick actions/i }).click();
  await page.getByRole('menuitem', { name: /import.*export/i }).click();
  await page.getByRole('heading', { name: /import.*export/i }).waitFor({ state: 'visible' });
}

test.describe('TC-30: Import / Export — render', () => {
  test('la página renderiza el título "Import / Export"', async ({ page }) => {
    await navigateToImportExport(page);
    await expect(page.getByRole('heading', { name: /import.*export/i })).toBeVisible();
  });

  test('la sección JSON está abierta por defecto con el botón "Export Catalog"', async ({
    page,
  }) => {
    await navigateToImportExport(page);
    await expect(page.getByRole('button', { name: /export catalog/i })).toBeVisible();
  });

  test('el botón "Import Catalog" es visible (test manual: requiere selector de archivos)', async ({
    page,
  }) => {
    await navigateToImportExport(page);
    await expect(page.getByRole('button', { name: /import catalog/i })).toBeVisible();
  });
});

test.describe('TC-30: Import / Export — Export Catalog', () => {
  test('"Export Catalog" envía exportCatalog', async ({ page }) => {
    await navigateToImportExport(page);
    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /export catalog/i }).click();

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'exportCatalog' });
  });
});

test.describe('TC-30: Import / Export — Export Profile ZIP', () => {
  test('"Export Profile as ZIP" envía exportProfile', async ({ page }) => {
    await navigateToImportExport(page);

    // Expandir la sección ZIP (accordion type='single' — cierra la JSON abierta)
    await page.getByRole('button', { name: /import.*export zip/i }).click();

    await page
      .getByRole('button', { name: /export profile as zip/i })
      .waitFor({ state: 'visible' });

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /export profile as zip/i }).click();

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'exportProfile' });
  });
});
