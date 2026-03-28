/**
 * Agent Wizard — Field Validation E2E Tests
 *
 * Cubre TC-20: validación por campo con debounce de 300ms
 *  - Name: mínimo 3 chars, máximo 80
 *  - Description: mínimo 10 chars, máximo 600
 *  - Role: requerido
 *  - Workflow Steps: al menos uno requerido
 *
 * Nota: la página create-agent se accede navegando desde el dashboard
 * (Create manually) porque el router es createMemoryRouter y no acepta URLs directas.
 * Los tests de Workflow Steps usan Edit Agent para poder acceder al tab Workflow.
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS, PROFILE_WITH_TEAM_NO_AGENTS_STATS } from '../../fixtures';
import { injectVscodeApi, navigateToEditAgentWorkflowTab, setInitialState } from '../../helpers';

/** Navega al wizard de creación de agente desde el dashboard */
async function navigateToCreateAgent(page: import('@playwright/test').Page) {
  await injectVscodeApi(page);
  await setInitialState(page, PROFILE_WITH_TEAM_NO_AGENTS_STATS);
  await page.goto('/dashboard.html');
  // El TeamAgentsCard muestra el estado vacío con botón "Create manually"
  await page
    .getByRole('button', { name: /create manually/i })
    .first()
    .click();
  // Esperamos que cargue la página del wizard
  await expect(page.getByText('Create New Agent')).toBeVisible();
}

const DEBOUNCE_MS = 350; // 300ms + margen

test.describe('TC-20: Validación inline con debounce — campo Name', () => {
  test.beforeEach(async ({ page }) => navigateToCreateAgent(page));

  test('nombre vacío → muestra error "Agent name is required"', async ({ page }) => {
    // El campo empieza vacío, el error aparece al iniciar el componente
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/agent name is required/i)).toBeVisible();
  });

  test('nombre de 2 chars → muestra error de longitud mínima', async ({ page }) => {
    const nameInput = page.getByLabel(/agent name/i);
    await nameInput.fill('ab');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/name is too short — minimum 3 characters/i)).toBeVisible();
  });

  test('nombre de 3 chars → error de nombre desaparece', async ({ page }) => {
    const nameInput = page.getByLabel(/agent name/i);
    await nameInput.fill('ab');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/name is too short/i)).toBeVisible();

    await nameInput.fill('abc');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/name is too short/i)).not.toBeVisible();
  });

  test('nombre de 81 chars → muestra error de longitud máxima', async ({ page }) => {
    const nameInput = page.getByLabel(/agent name/i);
    await nameInput.fill('a'.repeat(81));
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/name is too long — maximum 80 characters/i)).toBeVisible();
  });
});

test.describe('TC-20: Validación inline con debounce — campo Description', () => {
  test.beforeEach(async ({ page }) => navigateToCreateAgent(page));

  test('descripción vacía → muestra error "Description is required"', async ({ page }) => {
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/description is required/i)).toBeVisible();
  });

  test('descripción de 5 chars → muestra error de longitud mínima', async ({ page }) => {
    const descInput = page.getByLabel(/description/i);
    await descInput.fill('hello');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/description is too short — minimum 10 characters/i)).toBeVisible();
  });

  test('descripción de 10 chars → error de descripción desaparece', async ({ page }) => {
    const descInput = page.getByLabel(/description/i);
    await descInput.fill('hello');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/description is too short/i)).toBeVisible();

    await descInput.fill('hello world');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/description is too short/i)).not.toBeVisible();
  });
});

test.describe('TC-20: Validación inline con debounce — campo Role', () => {
  test.beforeEach(async ({ page }) => navigateToCreateAgent(page));

  test('sin role seleccionado → muestra error "Please select a role"', async ({ page }) => {
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/please select a role/i)).toBeVisible();
  });

  test('seleccionando un role válido → error de role desaparece', async ({ page }) => {
    const roleSelect = page.locator('#agent-role');
    await roleSelect.selectOption('worker');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/please select a role/i)).not.toBeVisible();
  });
});

test.describe('TC-20: Workflow Steps — al menos uno requerido', () => {
  // Estos tests requieren el tab Workflow activo → Edit Agent flow
  async function setupEditAgentWorkflow(page: import('@playwright/test').Page) {
    await injectVscodeApi(page);
    await setInitialState(page, FULL_SETUP_STATS);
    await page.goto('/dashboard.html');
    await navigateToEditAgentWorkflowTab(page);
  }

  /**
   * Elimina todos los workflow steps usando los botones X de cada fila.
   * Los step inputs tienen className 'flex-1 h-8 text-sm' (clase h-8 única en ese contexto).
   */
  async function deleteAllSteps(page: import('@playwright/test').Page): Promise<void> {
    const stepInputs = page.locator('input.h-8');
    const count = await stepInputs.count();
    // Eliminar de atrás hacia adelante para evitar desplazamiento de índices
    for (let i = count - 1; i >= 0; i--) {
      const row = stepInputs.nth(i).locator('xpath=..');
      await row.hover();
      await row.getByRole('button').last().click({ force: true });
    }
  }

  test('eliminar todos los steps → muestra error en Workflow tab', async ({ page }) => {
    await setupEditAgentWorkflow(page);

    await deleteAllSteps(page);

    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/add at least one workflow step/i)).toBeVisible();
  });

  test('añadir un step → error de workflow desaparece', async ({ page }) => {
    await setupEditAgentWorkflow(page);

    // Eliminar todos los steps primero
    await deleteAllSteps(page);

    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/add at least one workflow step/i)).toBeVisible();

    // Añadir un step nuevo (Enter en el input, el botón no tiene texto accesible)
    const stepInput = page.getByPlaceholder(/add a step/i);
    await stepInput.fill('Analyse the request');
    await stepInput.press('Enter');
    await page.waitForTimeout(DEBOUNCE_MS);
    await expect(page.getByText(/add at least one workflow step/i)).not.toBeVisible();
  });
});
