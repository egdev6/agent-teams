/**
 * Profile Editor — Accordion E2E Tests
 *
 * Cubre TC-17: todas las secciones del Profile Editor son paneles de accordion
 * colapsables con resumen en vivo en el header.
 *
 * Secciones esperadas:
 *  - Basic Information (abierta por defecto)
 *  - Context Packs
 *  - Sync Targets
 *  - Technologies
 *  - Paths
 *  - Commands
 *  - .gitignore
 */

import { expect, test } from '@playwright/test';
import { NO_PROFILE_STATS } from '../../fixtures';
import { injectVscodeApi, setInitialState } from '../../helpers';

const ACCORDION_SECTIONS = [
  'Basic Information',
  'Context Packs',
  'Sync Targets',
  'Technologies',
  'Paths',
  'Commands',
  '.gitignore',
];

async function navigateViaUI(page: import('@playwright/test').Page) {
  await injectVscodeApi(page);
  await setInitialState(page, NO_PROFILE_STATS);
  await page.goto('/dashboard.html');
  // Usamos el botón "Configure manually" que navega a /profile-editor
  await page.getByRole('button', { name: /configure manually/i }).click();
  await expect(page.getByText('Edit Profile')).toBeVisible();
}

test.describe('TC-17: Profile Editor como Accordion', () => {
  test.beforeEach(async ({ page }) => navigateViaUI(page));

  test('muestra el título "Edit Profile"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /edit profile/i })).toBeVisible();
  });

  for (const section of ACCORDION_SECTIONS) {
    test(`muestra la sección "${section}" en el accordion`, async ({ page }) => {
      await expect(page.getByText(section, { exact: true })).toBeVisible();
    });
  }

  test('"Basic Information" está abierta por defecto', async ({ page }) => {
    // El contenido de Basic Information (campos de nombre/id) debe ser visible sin click
    await expect(
      page
        .getByLabel(/project name/i)
        .or(page.getByLabel(/name/i))
        .first(),
    ).toBeVisible();
  });

  test('click en "Context Packs" → la sección se expande', async ({ page }) => {
    // AccordionTrigger renderiza como <button>; hacemos click en el botón del trigger
    await page.getByRole('button', { name: /context packs/i }).click();
    // Después de expandir, debe aparecer el botón "Manage Packs" (always rendered in the section)
    await expect(page.getByRole('button', { name: 'Manage Packs' })).toBeVisible();
  });

  test('click en "Sync Targets" → la sección se expande y muestra checkboxes', async ({ page }) => {
    await page.getByText('Sync Targets', { exact: true }).click();
    // Los sync targets se muestran como checkboxes
    await expect(
      page.getByRole('checkbox', { name: /claude code|github copilot|gemini|openai/i }).first(),
    ).toBeVisible();
  });

  test('expandir "Technologies" → muestra opciones de tecnología', async ({ page }) => {
    await page.getByText('Technologies', { exact: true }).click();
    await expect(
      page.getByRole('button', { name: /detect|add technology/i }).first(),
    ).toBeVisible();
  });

  test('expandir "Paths" → muestra PathsCommandsCard', async ({ page }) => {
    await page.getByText('Paths', { exact: true }).click();
    // PathsCommandsCard muestra el label "Add Path" y el placeholder de key
    await expect(page.getByText('Add Path')).toBeVisible();
  });

  test('sección colapsada muestra resumen en vivo con nombre del perfil', async ({ page }) => {
    // Introducir un nombre en Basic Information
    const nameInput = page
      .getByLabel(/project name/i)
      .or(page.getByLabel(/^name$/i))
      .first();
    await nameInput.fill('My Test Project');

    // Colapsar Basic Information haciendo click en el trigger
    await page.getByText('Basic Information', { exact: true }).click();

    // El header debe mostrar el nombre como resumen
    await expect(page.getByText('My Test Project')).toBeVisible();
  });

  test('botón "Save" y "Cancel" son visibles', async ({ page }) => {
    await expect(page.getByRole('button', { name: /save/i }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });
});
