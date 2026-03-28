/**
 * Skills Browser — E2E Tests
 *
 * Cubre TC-28: página Skills Browser.
 *  - La página envía requestSkillsCatalog al montarse
 *  - Los skills se muestran al recibir skillsCatalog
 *  - "Delete Skill" envía deleteSkill con el skillId correcto
 *  - Skill con canDelete:false no muestra el botón de eliminar
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

const DELETABLE_SKILL = {
  id: 'test-skill',
  name: 'Test Skill',
  description: 'A test skill for automated testing',
  tags: ['testing'],
  version: '1.0.0',
  source: 'workspace',
  installed: true,
  canDelete: true,
};

async function navigateToSkillsBrowser(page: import('@playwright/test').Page): Promise<void> {
  await injectVscodeApi(page);
  await setInitialState(page, FULL_SETUP_STATS);
  await page.goto('/dashboard.html');
  await page.waitForFunction(
    () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
    { timeout: 5000 },
  );
  await page.getByRole('button', { name: /quick actions/i }).click();
  await page.getByRole('menuitem', { name: /manage skills/i }).click();
  await page.getByRole('heading', { name: /^skills browser$/i }).waitFor({ state: 'visible' });
}

test.describe('TC-28: Skills Browser — carga inicial', () => {
  test('la página envía requestSkillsCatalog al montarse', async ({ page }) => {
    await navigateToSkillsBrowser(page);
    await page.waitForFunction(
      () =>
        (window as any).__vscodeMessages?.filter((m: any) => m.type === 'requestSkillsCatalog')
          .length >= 2,
      { timeout: 5000 },
    );
    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'requestSkillsCatalog' });
  });
});

test.describe('TC-28: Skills Browser — mostrar y eliminar skills', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSkillsBrowser(page);
    await page.waitForFunction(
      () =>
        (window as any).__vscodeMessages?.filter((m: any) => m.type === 'requestSkillsCatalog')
          .length >= 2,
      { timeout: 5000 },
    );
  });

  test('muestra los skills recibidos en skillsCatalog', async ({ page }) => {
    await sendExtensionMessage(page, {
      type: 'skillsCatalog',
      skills: [DELETABLE_SKILL],
      selectedSkillIds: [],
    });
    await expect(page.getByText(DELETABLE_SKILL.name, { exact: true })).toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByText(DELETABLE_SKILL.description)).toBeVisible({ timeout: 3000 });
  });

  test('"Delete Skill" envía deleteSkill con el skillId correcto', async ({ page }) => {
    await sendExtensionMessage(page, {
      type: 'skillsCatalog',
      skills: [DELETABLE_SKILL],
      selectedSkillIds: [],
    });
    await page
      .getByText(DELETABLE_SKILL.name, { exact: true })
      .waitFor({ state: 'visible', timeout: 3000 });

    await clearCapturedMessages(page);
    await page
      .getByRole('button', { name: /delete skill/i })
      .first()
      .click();

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'deleteSkill', skillId: 'test-skill' });
  });

  test('skill con canDelete:false no muestra botón "Delete Skill"', async ({ page }) => {
    const lockedSkill = {
      ...DELETABLE_SKILL,
      id: 'locked-skill',
      name: 'Locked Skill',
      canDelete: false,
    };
    await sendExtensionMessage(page, {
      type: 'skillsCatalog',
      skills: [lockedSkill],
      selectedSkillIds: [],
    });
    await page.getByText(lockedSkill.name).waitFor({ state: 'visible', timeout: 3000 });
    await expect(page.getByRole('button', { name: /delete skill/i })).toBeDisabled();
  });
});
