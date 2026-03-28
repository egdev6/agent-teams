/**
 * Agent Manager — Actions E2E Tests
 *
 * Cubre TC-23: acciones de la página Agent Manager.
 *  - Botón "Design a new agent with AI" envía openAgentDesignerChat
 *  - Eliminar un agente desde Edit Agent envía deleteAgent
 *  - Botón "Sync Now" en el dashboard envía syncAgents (con syncNeeded:true)
 */

import { expect, test } from '@playwright/test';
import { MULTI_ROLE_AGENTS_STATS, UNSYNCED_AGENT_STATS } from '../../fixtures';
import {
  clearCapturedMessages,
  getCapturedMessages,
  injectVscodeApi,
  navigateToAgentManager,
  sendExtensionMessage,
  setInitialState,
} from '../../helpers';

test.describe('TC-23: Agent Manager — Design with AI', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToAgentManager(page, MULTI_ROLE_AGENTS_STATS);
  });

  test('botón "Design a new agent with AI" envía openAgentDesignerChat', async ({ page }) => {
    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /design a new agent with ai/i }).click();
    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'openAgentDesignerChat' });
  });
});

test.describe('TC-23: Agent Manager — Delete Agent', () => {
  test('flujo de eliminación de agente envía deleteAgent con el agentId correcto', async ({
    page,
  }) => {
    await navigateToAgentManager(page, MULTI_ROLE_AGENTS_STATS);

    // Abrir la tab Worker y navegar al agente Backend Worker
    await page.getByRole('tab', { name: /worker/i }).click();
    await page.getByText('Backend Worker').first().click();

    // Esperar a que la página de edición solicite los datos del agente
    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'requestAgentData'),
      { timeout: 5000 },
    );

    // Responder con agentData sin equipos asignados → botón delete habilitado
    await sendExtensionMessage(page, {
      type: 'agentData',
      agentId: 'backend-worker',
      name: 'Backend Worker',
      role: 'worker',
      description: 'Handles backend API tasks and processes requests efficiently',
      workflow: ['Analyse the incoming request', 'Process and generate response'],
      tools: [],
      assignedTeamIds: [],
    });

    await page.getByText('Agent Wizard').waitFor({ state: 'visible' });

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /delete agent/i }).click();

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'deleteAgent', agentId: 'backend-worker' });
  });
});

test.describe('TC-23: SyncStatusCard — Sync Now', () => {
  test('botón "Sync Now" en el dashboard envía syncAgents', async ({ page }) => {
    await injectVscodeApi(page);
    await setInitialState(page, UNSYNCED_AGENT_STATS);
    await page.goto('/dashboard.html');
    await page.waitForFunction(
      () => (window as any).__vscodeMessages?.some((m: any) => m.type === 'refresh'),
      { timeout: 5000 },
    );

    await clearCapturedMessages(page);
    await page.getByRole('button', { name: /sync now/i }).click();

    const messages = await getCapturedMessages(page);
    expect(messages).toContainEqual({ type: 'syncAgents' });
  });
});
