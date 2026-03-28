/**
 * Agent Wizard — Skills Step E2E Tests
 *
 * Cubre TC-22: el paso Skills muestra el catálogo de skills disponibles,
 * permite añadir skills a la lista de seleccionadas y muestra el title
 * legible en lugar del ID raw.
 *
 * Se accede vía Edit Agent (agente pre-existente con workflow ya definido)
 * para que isConfigurationEnabled=true y el tab Skills esté habilitado.
 */

import { expect, test } from '@playwright/test';
import { FULL_SETUP_STATS } from '../../fixtures';
import {
  injectVscodeApi,
  navigateToEditAgentSkillsTab,
  sendExtensionMessage,
  setInitialState,
} from '../../helpers';

const SAMPLE_CATALOG_SKILL = {
  id: 'my-skill',
  title: 'My Skill Title',
  materialized: true,
  tags: [],
  version: '1.0.0',
  source: { type: 'skills-lc' as const, ref: 'my-skill' },
};

async function setup(page: import('@playwright/test').Page) {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');
  await navigateToEditAgentSkillsTab(page);
}

test.describe('TC-22: Skills Step — catálogo y selección', () => {
  test.beforeEach(async ({ page }) => setup(page));

  test('muestra el catálogo de skills cuando hay skills disponibles', async ({ page }) => {
    await sendExtensionMessage(page, { type: 'catalogSkills', skills: [SAMPLE_CATALOG_SKILL] });
    await expect(page.getByText('My Skill Title')).toBeVisible();
  });

  test('el botón Add añade la skill a la lista de seleccionadas', async ({ page }) => {
    await sendExtensionMessage(page, { type: 'catalogSkills', skills: [SAMPLE_CATALOG_SKILL] });
    await expect(page.getByText('My Skill Title')).toBeVisible();

    await page.getByRole('button', { name: /^add$/i }).first().click();

    // Button switches to disabled "Added" state
    await expect(page.getByRole('button', { name: /^added$/i })).toBeVisible();
    // Title appears once in catalog and once in selected section
    await expect(page.getByText('My Skill Title')).toHaveCount(2);
  });

  test('TC-22: la skill seleccionada muestra el title legible, no el id raw', async ({ page }) => {
    await sendExtensionMessage(page, { type: 'catalogSkills', skills: [SAMPLE_CATALOG_SKILL] });
    await page.getByRole('button', { name: /^add$/i }).first().click();
    await expect(page.getByRole('button', { name: /^added$/i })).toBeVisible();

    // Human-readable title visible in the selected skills section (second occurrence)
    await expect(page.getByText('My Skill Title')).toHaveCount(2);

    // Raw ID must NOT be shown as a visible text label in the UI
    await expect(page.getByText('my-skill', { exact: true })).not.toBeVisible();
  });

  test('muestra empty state cuando no hay skills seleccionadas', async ({ page }) => {
    // No catalogSkills message sent — skills list is empty
    await expect(page.getByText('No skills added yet')).toBeVisible();
  });
});
