/**
 * Profile Editor — Context Packs Budget Preview E2E Tests
 *
 * Cubre §3 (Sección Context Packs) del checklist:
 *  - El botón "Preview" muestra/oculta la sección de preview
 *  - Al hacer click en Preview se envía previewContextPacks a la extensión
 *  - Con la respuesta de la extensión se renderiza la barra de progreso
 *  - Packs inlineados aparecen en verde (Inlined)
 *  - Packs referenciados (overflow) aparecen en ámbar (Referenced)
 *
 * La respuesta de la extensión es de tipo 'contextPacksPreviewResult'.
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  navigateToProfileEditor,
  sendExtensionMessage,
  setInitialState,
} from '../../helpers';

async function setup(page: import('@playwright/test').Page) {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');
  await navigateToProfileEditor(page);
}

async function expandContextPacksSection(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /context packs/i }).click();
  await page
    .getByRole('button', { name: /preview|manage packs/i })
    .first()
    .waitFor({
      state: 'visible',
    });
}

/** Simula la respuesta de la extensión con un preview de context packs */
async function sendPreviewResult(
  page: import('@playwright/test').Page,
  opts: {
    budget?: number;
    charsUsed?: number;
    inlined?: Array<{ id: string; priority: 'essential' | 'standard'; charCount: number }>;
    referenced?: Array<{ id: string; priority: 'reference' | 'standard'; charCount: number }>;
  } = {},
) {
  const {
    budget = 8000,
    charsUsed = 3000,
    inlined = [{ id: 'architecture', priority: 'essential', charCount: 2000 }],
    referenced = [],
  } = opts;

  await sendExtensionMessage(page, {
    type: 'contextPacksPreviewResult',
    preview: {
      budgeted: {
        budget,
        charsUsed,
        inlined,
        referenced,
      },
      copilotLinked: inlined,
    },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('TC-27: Context Packs Budget — botón Preview', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('click en Preview → envía previewContextPacks a la extensión', async ({ page }) => {
    await expandContextPacksSection(page);
    await clearCapturedMessages(page);

    await page.getByRole('button', { name: /preview budget usage|^preview$/i }).click();

    const messages = await getCapturedMessages(page);
    expect(messages.some((m: any) => m.type === 'previewContextPacks')).toBe(true);
  });

  test('click en Preview → la sección de preview aparece (loader o resultado)', async ({
    page,
  }) => {
    await expandContextPacksSection(page);

    await page.getByRole('button', { name: /preview budget usage|^preview$/i }).click();

    // El loader o el contenido aparecen tras el click
    const _previewSection = page
      .getByText(/budget targets/i)
      .or(page.getByText(/loading preview/i));
    await sendPreviewResult(page);
    await expect(page.getByText(/budget targets/i)).toBeVisible();
  });

  test('click en Hide → la sección de preview desaparece', async ({ page }) => {
    await expandContextPacksSection(page);
    await page.getByRole('button', { name: /preview budget usage|^preview$/i }).click();
    await sendPreviewResult(page);
    await page.getByText(/budget targets/i).waitFor({ state: 'visible' });

    // Click Hide
    await page.getByRole('button', { name: /hide/i }).click();
    await expect(page.getByText(/budget targets/i)).not.toBeVisible();
  });
});

test.describe('TC-27: Context Packs Budget — barra de progreso', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('barra de progreso muestra chars usados / budget', async ({ page }) => {
    await expandContextPacksSection(page);
    await page.getByRole('button', { name: /preview budget usage|^preview$/i }).click();
    await sendPreviewResult(page, { budget: 8000, charsUsed: 3000 });

    // Chars y budget se muestran como texto
    await expect(page.getByText(/3,000.*8,000|3000.*8000/)).toBeVisible();
  });

  test('packs inlineados aparecen en la sección verde "Inlined"', async ({ page }) => {
    await expandContextPacksSection(page);
    await page.getByRole('button', { name: /preview budget usage|^preview$/i }).click();
    await sendPreviewResult(page, {
      inlined: [{ id: 'architecture', priority: 'essential', charCount: 2000 }],
    });

    await expect(page.getByText(/inlined/i)).toBeVisible();
    await expect(page.getByText('architecture')).toBeVisible();
  });

  test('packs referenciados aparecen en la sección ámbar "Referenced"', async ({ page }) => {
    await expandContextPacksSection(page);
    await page.getByRole('button', { name: /preview budget usage|^preview$/i }).click();
    await sendPreviewResult(page, {
      budget: 8000,
      charsUsed: 7500,
      inlined: [{ id: 'architecture', priority: 'essential', charCount: 2000 }],
      referenced: [{ id: 'api-docs', priority: 'standard', charCount: 5500 }],
    });

    await expect(page.getByText(/referenced/i)).toBeVisible();
    await expect(page.getByText('api-docs')).toBeVisible();
  });

  test('sin packs seleccionados → muestra "No packs selected"', async ({ page }) => {
    await expandContextPacksSection(page);
    await page.getByRole('button', { name: /preview budget usage|^preview$/i }).click();
    await sendPreviewResult(page, {
      budget: 8000,
      charsUsed: 0,
      inlined: [],
      referenced: [],
    });

    await expect(page.getByText(/no packs selected/i)).toBeVisible();
  });
});
