/**
 * Dashboard — Orphan Notification Card E2E Tests
 *
 * Cubre §19 (Error Handling) del checklist:
 *  - La Orphan Notification Card aparece cuando hay entidades huérfanas
 *  - La card muestra el conteo correcto de huérfanos
 *  - El botón "Import to catalog" envía el mensaje preserveOrphans a la extensión
 *  - Sin huérfanos la card no se muestra
 *
 * OrphanNotificationCard se renderiza en el dashboard cuando las propiedades
 * validOrphanAgents, invalidOrphanAgents, validOrphanTeams o invalidOrphanTeams
 * de DashboardStats tienen elementos.
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS, ORPHAN_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  sendExtensionMessage,
  setInitialState,
  updateStats,
} from '../../helpers';

// ── Tests: Card no aparece sin huérfanos ──────────────────────────────────────

test.describe('TC-29: Orphan Notification Card — sin huérfanos', () => {
  test('sin orphans en el estado → card "Unregistered files" no aparece', async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, FULL_SETUP_STATS);
    await page.goto('/dashboard.html');

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
      { timeout: 5000 },
    );

    await expect(page.getByText(/unregistered files detected/i)).not.toBeVisible();
  });
});

// ── Tests: Card aparece con huérfanos válidos ─────────────────────────────────

test.describe('TC-29: Orphan Notification Card — con huérfanos', () => {
  test('con validOrphanAgents → card "Unregistered files detected" aparece', async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, ORPHAN_STATS);
    await page.goto('/dashboard.html');

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
      { timeout: 5000 },
    );

    await expect(page.getByText(/unregistered files detected/i)).toBeVisible();
  });

  test('badge muestra el total de huérfanos encontrados', async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, ORPHAN_STATS);
    await page.goto('/dashboard.html');

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
      { timeout: 5000 },
    );

    // ORPHAN_STATS tiene 1 validOrphanAgent
    await expect(page.getByText('1 found')).toBeVisible();
  });

  test('descripción indica cuántos pueden importarse', async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, ORPHAN_STATS);
    await page.goto('/dashboard.html');

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
      { timeout: 5000 },
    );

    await expect(page.getByText(/1 can be imported/i)).toBeVisible();
  });

  test('botón "Import to catalog" → envía preserveOrphans a la extensión', async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, ORPHAN_STATS);
    await page.goto('/dashboard.html');

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
      { timeout: 5000 },
    );

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /import to catalog/i }).click();

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'preserveOrphans' });
  });
});

// ── Tests: Card aparece vía updateStats ──────────────────────────────────────

test.describe('TC-29: Orphan Notification Card — via updateStats dinámico', () => {
  test('estado sin huérfanos → updateStats con huérfanos → card aparece', async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, FULL_SETUP_STATS);
    await page.goto('/dashboard.html');
    await updateStats(page, FULL_SETUP_STATS);

    await expect(page.getByText(/unregistered files detected/i)).not.toBeVisible();

    // Enviar updateStats con huérfanos
    await sendExtensionMessage(page, {
      type: 'updateStats',
      stats: {
        ...FULL_SETUP_STATS,
        validOrphanAgents: [{ id: 'orphan-agent', name: 'Orphan Agent', errors: [] }],
      },
    });

    await expect(page.getByText(/unregistered files detected/i)).toBeVisible();
  });
});

// ── Tests: Card con huérfanos inválidos ───────────────────────────────────────

test.describe('TC-29: Orphan Notification Card — con errores de validación', () => {
  test('invalidOrphanAgents → card aparece, sin botón "Import to catalog"', async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, {
      ...FULL_SETUP_STATS,
      invalidOrphanAgents: [
        { id: 'bad-agent', name: 'Bad Agent', errors: ['Missing required field: description'] },
      ],
    });
    await page.goto('/dashboard.html');

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
      { timeout: 5000 },
    );

    await expect(page.getByText(/unregistered files detected/i)).toBeVisible();
    // Import button sólo aparece cuando hay validCount > 0
    await expect(page.getByRole('button', { name: /import to catalog/i })).not.toBeVisible();
  });

  test('invalidOrphanAgents → descripción indica errores de validación', async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, {
      ...FULL_SETUP_STATS,
      invalidOrphanAgents: [
        { id: 'bad-agent', name: 'Bad Agent', errors: ['Missing required field: description'] },
      ],
    });
    await page.goto('/dashboard.html');

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
      { timeout: 5000 },
    );

    await expect(page.getByText(/1 have validation errors/i)).toBeVisible();
  });
});
