/**
 * Agent Wizard — MCP Server Env Validation E2E Tests
 *
 * Cubre §4 (Paso 3 Workflow & Tools) del checklist:
 *  - Error inline si el env JSON de un MCP server es inválido (mostrado como
 *    createError cuando el usuario intenta guardar)
 *  - JSON válido → no hay error y el mensaje createAgent se envía correctamente
 *
 * El flujo de validación ocurre en `handleCreate` (useCreateAgentLogic):
 *   si algún mcpServer tiene env != '' y no parsea como JSON, se muestra
 *   createError antes de enviar el mensaje.
 *
 * Los MCP servers regulares aparecen sólo si hay projectMcpServers en el
 * estado, pero los Claude Code sub-agent MCP servers aparecen en el tab
 * Workflow cuando el target 'claude_code' está activo.
 *
 * Para testear la validación de env se usa el flujo completo de Create Agent
 * con el agente mínimamente válido y luego se intenta guardar.
 */

import { expect, test } from '@playwright/test';
import { PROFILE_WITH_TEAM_NO_AGENTS_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  navigateToCreateAgent,
  setInitialState,
} from '../../helpers';

/** Estado con project MCP servers para activar la sección MCP en el wizard */
const STATS_WITH_MCP = {
  ...PROFILE_WITH_TEAM_NO_AGENTS_STATS,
  projectMcpServers: [{ id: 'my-server', command: 'npx', args: ['-y', 'my-mcp'] }],
};

async function navigateToWorkflowTab(page: import('@playwright/test').Page): Promise<void> {
  await injectVscodeApi(page);
  await setInitialState(page, STATS_WITH_MCP);
  await page.goto('/dashboard.html');
  await navigateToCreateAgent(page);

  // Fill identity to make the form valid and enable other tabs
  await page.getByLabel(/agent name/i).fill('API Worker');
  await page.getByLabel(/description/i).fill('Handles API requests and responses efficiently');
  await page.locator('#agent-role').selectOption('worker');
  const intentInput = page.locator('#agent-intents');
  await intentInput.fill('handle_api_request');
  await intentInput.press('Enter');

  // Navigate to Workflow tab
  await page.getByRole('tab', { name: /workflow/i }).click();
}

test.describe('TC-22c: MCP Server env JSON — validación al guardar', () => {
  test.beforeEach(async ({ page }) => navigateToWorkflowTab(page));

  test('env inválido → error aparece al intentar guardar (no envía createAgent)', async ({
    page,
  }) => {
    // Enable claude_code target to show Claude sub-agent MCP servers section
    // (targets are enabled by default in PROFILE_WITH_TEAM_NO_AGENTS_STATS)
    await page.getByRole('button', { name: /add sub-agent mcp server/i }).click();

    // Fill server name (required to be included)
    const nameInput = page.locator('input[placeholder*="my-server"]').last();
    await nameInput.fill('test-server');

    // Enter invalid JSON in the Env textarea
    const envTextarea = page.locator('textarea[placeholder*="API_KEY"]').last();
    await envTextarea.fill('{ invalid json }');

    // Try to save — go back to Identity first to find Save button
    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /^save agent$|^create agent$/i }).click();

    // createAgent message should NOT have been sent
    const messages = await getCapturedMessages(page);
    expect(messages.some((m: any) => m.type === 'createAgent')).toBe(false);

    // Error message should appear
    await expect(page.getByText(/env must be a valid json object/i)).toBeVisible();
  });

  test('env vacío → sin error, createAgent se envía', async ({ page }) => {
    await page.getByRole('button', { name: /add sub-agent mcp server/i }).click();

    const nameInput = page.locator('input[placeholder*="my-server"]').last();
    await nameInput.fill('test-server');

    // Leave env empty (valid case)
    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /^save agent$|^create agent$/i }).click();

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'createAgent'),
      { timeout: 5000 },
    );

    const messages = await getCapturedMessages(page);
    expect(messages.some((m: any) => m.type === 'createAgent')).toBe(true);
    await expect(page.getByText(/env must be a valid json object/i)).not.toBeVisible();
  });

  test('env JSON válido → sin error, createAgent se envía', async ({ page }) => {
    await page.getByRole('button', { name: /add sub-agent mcp server/i }).click();

    const nameInput = page.locator('input[placeholder*="my-server"]').last();
    await nameInput.fill('test-server');

    const envTextarea = page.locator('textarea[placeholder*="API_KEY"]').last();
    await envTextarea.fill('{"API_KEY": "my-key"}');

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /^save agent$|^create agent$/i }).click();

    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'createAgent'),
      { timeout: 5000 },
    );

    const messages = await getCapturedMessages(page);
    expect(messages.some((m: any) => m.type === 'createAgent')).toBe(true);
  });
});
