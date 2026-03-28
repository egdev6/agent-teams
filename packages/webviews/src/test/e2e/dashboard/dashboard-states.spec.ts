/**
 * Dashboard States E2E Tests
 *
 * Cubre los TCs del plan de QA:
 *  TC-06: Estado "sin perfil" — ConfigureProjectCard con 2 botones
 *  TC-07: Estado "perfil configurado, sin teams" — DesignTeamCard
 *  TC-08: Estado "perfil + team + agente" — ConsultantCard encima de TeamAgentsCard
 *  TC-09: Transiciones de estado del dashboard
 */

import { expect, test } from '@playwright/test';
import {
  FULL_SETUP_STATS,
  NO_PROFILE_STATS,
  PROFILE_NO_TEAMS_STATS,
  PROFILE_WITH_TEAM_NO_AGENTS_STATS,
} from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  setInitialState,
  updateStats,
} from '../../helpers';

test.describe('TC-06: Sin perfil — ConfigureProjectCard', () => {
  test.beforeEach(async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, NO_PROFILE_STATS);
    await page.goto('/dashboard.html');
  });

  test('muestra el título "Configure Your Project"', async ({ page }) => {
    await expect(page.getByText('Configure Your Project')).toBeVisible();
  });

  test('muestra el botón primario "Auto-configure with AI"', async ({ page }) => {
    await expect(page.getByRole('button', { name: /auto-configure with ai/i })).toBeVisible();
  });

  test('muestra el botón secundario "Configure manually"', async ({ page }) => {
    await expect(page.getByRole('button', { name: /configure manually/i })).toBeVisible();
  });

  test('click "Auto-configure with AI" → envía openProjectConfiguratorChat', async ({ page }) => {
    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /auto-configure with ai/i }).click();
    const msgs = await getCapturedMessages(page);
    expect(msgs).toContainEqual({ type: 'openProjectConfiguratorChat' });
  });

  test('click "Configure manually" → carga la página del Profile Editor', async ({ page }) => {
    await page.getByRole('button', { name: /configure manually/i }).click();
    // createMemoryRouter no cambia la URL del browser; verificamos el contenido
    await expect(page.getByRole('heading', { name: /edit profile/i })).toBeVisible();
  });

  test('NO muestra DesignTeamCard', async ({ page }) => {
    await expect(page.getByText('Design your first team')).not.toBeVisible();
  });

  test('NO muestra ConsultantCard', async ({ page }) => {
    await expect(page.getByText('Consultant')).not.toBeVisible();
  });
});

test.describe('TC-07: Perfil configurado, sin teams — DesignTeamCard', () => {
  test.beforeEach(async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, PROFILE_NO_TEAMS_STATS);
    await page.goto('/dashboard.html');
  });

  test('muestra la card de diseño de equipo', async ({ page }) => {
    await expect(page.getByText(/no active team/i)).toBeVisible();
  });

  test('NO muestra ConfigureProjectCard', async ({ page }) => {
    await expect(page.getByText('Configure Your Project')).not.toBeVisible();
  });
});

test.describe('TC-08: Perfil + team + agentes — ConsultantCard', () => {
  test.beforeEach(async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, FULL_SETUP_STATS);
    await page.goto('/dashboard.html');
  });

  test('muestra el botón "Ask AI for team improvements"', async ({ page }) => {
    await expect(page.getByRole('button', { name: /ask ai for team improvements/i })).toBeVisible();
  });

  test('click "Ask AI for team improvements" → envía openConsultantChat', async ({ page }) => {
    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /ask ai for team improvements/i }).click();
    const msgs = await getCapturedMessages(page);
    expect(msgs).toContainEqual({ type: 'openConsultantChat' });
  });

  test('botón "Ask AI" aparece antes que TeamAgentsCard en el DOM', async ({ page }) => {
    const consultButton = page.getByRole('button', { name: /ask ai for team improvements/i });
    // TeamAgentsCard tiene el heading "Team Agents"
    const teamAgentsCard = page.getByText('Team Agents').first();

    await expect(consultButton).toBeVisible();
    await expect(teamAgentsCard).toBeVisible();

    const consultBox = await consultButton.boundingBox();
    const teamBox = await teamAgentsCard.boundingBox();

    expect(consultBox).not.toBeNull();
    expect(teamBox).not.toBeNull();
    expect(consultBox?.y).toBeLessThan(teamBox?.y ?? 0);
  });

  test('NO muestra ConfigureProjectCard', async ({ page }) => {
    await expect(page.getByText('Configure Your Project')).not.toBeVisible();
  });
});

test.describe('TC-09: Transiciones de estado del dashboard', () => {
  test('de sin-perfil a con-perfil → aparece DesignTeamCard vía updateStats', async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, NO_PROFILE_STATS);
    await page.goto('/dashboard.html');

    // Estado inicial: sin perfil
    await expect(page.getByText('Configure Your Project')).toBeVisible();

    // La extensión envía un updateStats con perfil configurado pero sin teams
    await updateStats(page, PROFILE_NO_TEAMS_STATS);

    // La UI actualiza sin recargar la página
    await expect(page.getByText(/no active team/i)).toBeVisible();
    await expect(page.getByText('Configure Your Project')).not.toBeVisible();
  });

  test('de sin-agentes a con-agentes → aparece ConsultantCard vía updateStats', async ({
    page,
  }) => {
    await injectVscodeApi(page);
    await setInitialState(page, PROFILE_WITH_TEAM_NO_AGENTS_STATS);
    await page.goto('/dashboard.html');

    // Sin agentes: no hay botón de consultar equipo
    await expect(
      page.getByRole('button', { name: /ask ai for team improvements/i }),
    ).not.toBeVisible();

    // La extensión envía stats con agentes
    await updateStats(page, FULL_SETUP_STATS);
    // Esperar a que React procese el event y re-renderice
    await page.waitForFunction(() =>
      document.body.textContent?.includes('Ask AI for team improvements'),
    );

    await expect(page.getByRole('button', { name: /ask ai for team improvements/i })).toBeVisible();
  });
});
