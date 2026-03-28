/**
 * Agent Manager — Not Synced Badge E2E Tests
 *
 * Cubre TC-18 (agentes): badges de estado en las tarjetas de agente.
 *  - Badge "Not synced" aparece cuando agent.unsynced === true
 *  - No badge cuando agent.unsynced === false
 *  - Tres tabs (Router, Orchestrator, Worker) con conteos correctos
 *  - Contenido correcto por tab al navegar entre roles
 *
 * Nota: useAgentManagerLogic construye AgentItem[] desde stats.globalCatalog.agents.
 * El campo unsynced precisa ser mapeado desde stats.agents para que el badge
 * se muestre; los fixtures incluyen globalCatalog.agents para que los agentes
 * aparezcan en la lista.
 */

import { expect, test } from '@playwright/test';
import { MULTI_ROLE_AGENTS_STATS, UNSYNCED_AGENT_STATS } from '../../fixtures';
import { navigateToAgentManager } from '../../helpers';

test.describe('TC-18: Not synced badge — agentes', () => {
  test.beforeEach(async ({ page }) => navigateToAgentManager(page, UNSYNCED_AGENT_STATS));

  test('agente con unsynced:true muestra el badge "Not synced"', async ({ page }) => {
    await page.getByRole('tab', { name: /worker/i }).click();
    // backend-worker tiene unsynced: true → badge visible
    await expect(page.getByText('Not synced').first()).toBeVisible();
  });

  test('agente con unsynced:false NO muestra badge adicional', async ({ page }) => {
    await page.getByRole('tab', { name: /worker/i }).click();
    // Sólo backend-worker (unsynced:true) debe mostrar badge — total 1
    await expect(page.getByText('Not synced')).toHaveCount(1);
  });
});

test.describe('TC-18: Tabs multirol — AgentManagerPage', () => {
  test.beforeEach(async ({ page }) => navigateToAgentManager(page, MULTI_ROLE_AGENTS_STATS));

  test('muestra tres tabs: Router, Orchestrator, Worker con sus conteos', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /router \(1\)/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /orchestrator \(1\)/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /worker \(1\)/i })).toBeVisible();
  });

  test('cada tab muestra el agente del rol correspondiente', async ({ page }) => {
    // Router tab → Main Router
    await page.getByRole('tab', { name: /router/i }).click();
    await expect(page.getByText('Main Router')).toBeVisible();

    // Orchestrator tab → Feature Orchestrator
    await page.getByRole('tab', { name: /orchestrator/i }).click();
    await expect(page.getByText('Feature Orchestrator')).toBeVisible();

    // Worker tab → Backend Worker
    await page.getByRole('tab', { name: /worker/i }).click();
    await expect(page.getByText('Backend Worker')).toBeVisible();
  });
});
