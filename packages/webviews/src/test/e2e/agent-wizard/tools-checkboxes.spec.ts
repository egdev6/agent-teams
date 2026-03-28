/**
 * Agent Wizard — Standard Tools Checkboxes E2E Tests
 *
 * Cubre TC-19: el paso Workflow & Tools muestra los VS Code built-in tools
 * como un grid de checkboxes (vscode, execute, read, agent, browser, edit,
 * search, web, todo, complete-subtask).
 *
 * Nota: se accede vía Edit Agent (agente pre-existente con workflow ya definido)
 * para que isConfigurationEnabled=true y el tab Workflow esté habilitado.
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS } from '../../fixtures';
import { injectVscodeApi, navigateToEditAgentWorkflowTab, setInitialState } from '../../helpers';

const STANDARD_TOOLS = [
  'vscode',
  'execute',
  'read',
  'agent',
  'browser',
  'edit',
  'search',
  'web',
  'todo',
  'complete-subtask',
];

async function setup(page: import('@playwright/test').Page) {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');
  await navigateToEditAgentWorkflowTab(page);
}

test.describe('TC-19: Standard tools como checkboxes', () => {
  test.beforeEach(async ({ page }) => setup(page));

  for (const tool of STANDARD_TOOLS) {
    test(`muestra checkbox para la tool "${tool}"`, async ({ page }) => {
      await expect(page.getByRole('checkbox', { name: new RegExp(tool, 'i') })).toBeVisible();
    });
  }

  test('activar checkbox "read" → queda marcado', async ({ page }) => {
    const readCheckbox = page.getByRole('checkbox', { name: /^read$/i });
    await readCheckbox.check();
    await expect(readCheckbox).toBeChecked();
  });

  test('activar y desactivar checkbox "edit" → vuelve a desmarcado', async ({ page }) => {
    const editCheckbox = page.getByRole('checkbox', { name: /^edit$/i });
    await editCheckbox.check();
    await expect(editCheckbox).toBeChecked();
    await editCheckbox.uncheck();
    await expect(editCheckbox).not.toBeChecked();
  });

  test('existe sección de custom tools (fila de texto libre) debajo de los checkboxes', async ({
    page,
  }) => {
    // El placeholder "Custom tool name..." identifica la sección de custom tools
    await expect(page.getByPlaceholder(/custom tool name/i)).toBeVisible();
  });
});
