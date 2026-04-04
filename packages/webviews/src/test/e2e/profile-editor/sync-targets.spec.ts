/**
 * Profile Editor — Sync Targets E2E Tests
 *
 * Cubre §3 (Sección Sync Targets) del checklist:
 *  - Seleccionar/deseleccionar targets (Claude Code, Copilot, Codex, Gemini, OpenAI)
 *  - Toggle "Add to .gitignore" aparece sólo cuando el target está seleccionado
 *  - Los cambios en targets se reflejan en el payload saveProfile
 *
 * El perfil inicial tiene syncTargets = ['claude_code', 'github_copilot']
 * (definido en INITIAL_PROFILE de useProfileEditorLogic.ts).
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  navigateToProfileEditor,
  setInitialState,
} from '../../helpers';

async function setup(page: import('@playwright/test').Page) {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');
  await navigateToProfileEditor(page);
}

async function expandSyncTargets(page: import('@playwright/test').Page) {
  await page.getByText('Sync Targets', { exact: true }).click();
  // Esperar a que la sección esté expandida (Switch de Claude Code visible)
  await page.getByRole('switch', { name: /claude code/i }).waitFor({ state: 'visible' });
}

// ── Tests: Toggles de targets ─────────────────────────────────────────────────

test.describe('TC-28: Sync Targets — activar y desactivar targets', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('Claude Code está activado por defecto', async ({ page }) => {
    await expandSyncTargets(page);
    await expect(page.getByRole('switch', { name: /claude code/i })).toBeChecked();
  });

  test('GitHub Copilot está activado por defecto', async ({ page }) => {
    await expandSyncTargets(page);
    await expect(page.getByRole('switch', { name: /github copilot/i })).toBeChecked();
  });

  test('Codex está desactivado por defecto', async ({ page }) => {
    await expandSyncTargets(page);
    await expect(page.getByRole('switch', { name: /codex/i })).not.toBeChecked();
  });

  test('activar Gemini CLI → switch pasa a checked', async ({ page }) => {
    await expandSyncTargets(page);
    const geminiSwitch = page.getByRole('switch', { name: /gemini cli/i });
    await expect(geminiSwitch).not.toBeChecked();
    await geminiSwitch.click();
    await expect(geminiSwitch).toBeChecked();
  });

  test('desactivar Claude Code → switch pasa a unchecked', async ({ page }) => {
    await expandSyncTargets(page);
    const claudeSwitch = page.getByRole('switch', { name: /claude code/i });
    await expect(claudeSwitch).toBeChecked();
    await claudeSwitch.click();
    await expect(claudeSwitch).not.toBeChecked();
  });

  test('desactivar Claude Code → saveProfile ya no incluye claude_code en syncTargets', async ({
    page,
  }) => {
    await expandSyncTargets(page);
    await page.getByRole('switch', { name: /claude code/i }).click();

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /save profile/i }).click();

    const messages = await getCapturedMessages(page);
    const saveMsg = messages.find((m: any) => m.type === 'saveProfile') as any;
    expect(saveMsg).toBeDefined();
    expect(saveMsg.profile.syncTargets).not.toContain('claude_code');
  });

  test('activar OpenAI Agents SDK → saveProfile incluye openai en syncTargets', async ({
    page,
  }) => {
    await expandSyncTargets(page);
    await page.getByRole('switch', { name: /openai agents sdk/i }).click();

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /save profile/i }).click();

    const messages = await getCapturedMessages(page);
    const saveMsg = messages.find((m: any) => m.type === 'saveProfile') as any;
    expect(saveMsg.profile.syncTargets).toContain('openai');
  });
});

// ── Tests: Toggle gitignore por target ───────────────────────────────────────

test.describe('TC-28: Sync Targets — gitignore por target', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('Claude Code activo → muestra checkbox de gitignore para .claude/', async ({ page }) => {
    await expandSyncTargets(page);
    // gitignore checkbox sólo aparece cuando el target está activo
    await expect(page.getByRole('checkbox', { name: /\.claude\//i })).toBeVisible();
  });

  test('target desactivado → checkbox de gitignore no aparece', async ({ page }) => {
    await expandSyncTargets(page);
    // Codex está desactivado → no debe mostrar checkbox de gitignore
    await expect(page.getByRole('checkbox', { name: /agents\.md/i })).not.toBeVisible();
  });

  test('activar gitignore de Copilot → saveProfile incluye github_copilot en gitignoreTargets', async ({
    page,
  }) => {
    await expandSyncTargets(page);
    // GitHub Copilot ya está activo → su checkbox gitignore debe ser visible
    const copilotGitignoreCheckbox = page.getByRole('checkbox', { name: /\.github\//i }).first();
    await expect(copilotGitignoreCheckbox).toBeVisible();
    await copilotGitignoreCheckbox.click();

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /save profile/i }).click();

    const messages = await getCapturedMessages(page);
    const saveMsg = messages.find((m: any) => m.type === 'saveProfile') as any;
    expect(saveMsg.profile.gitignoreTargets).toContain('github_copilot');
  });
});
