import * as vscode from 'vscode';

interface HandoffInput {
  targetAgentId: string;
  taskId: string;
  assessment: string;
  supervised?: boolean;
}

/**
 * LanguageModelTool that enables a Router agent to delegate a task to an
 * Orchestrator in a new VS Code chat session.
 *
 * Flow:
 * 1. Router writes assessment to Engram via `engram_remember` (key: `handoff:{taskId}`)
 * 2. Router calls this tool with targetAgentId + taskId + assessment
 * 3. Tool opens a new chat pre-filled with @orchestrator + handoff reference
 * 4. Orchestrator reads assessment from Engram at session start
 */
export class HandoffTool implements vscode.LanguageModelTool<HandoffInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<HandoffInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const { targetAgentId, taskId, assessment, supervised = true } = options.input ?? {};

    if (!targetAgentId || !taskId || !assessment) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          'Error: agent-teams-handoff requires targetAgentId, taskId, and assessment parameters.',
        ),
      ]);
    }

    // Truncate assessment to a short one-liner for the chat query
    const summary =
      assessment
        .split('\n')
        .find((line) => line.trim().length > 0)
        ?.trim()
        .slice(0, 200) ?? assessment.slice(0, 200);

    const query = `@${targetAgentId} [Handoff:${taskId}] ${summary}`;

    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query,
      isPartialQuery: supervised,
    });

    const mode = supervised ? 'supervised (review before sending)' : 'auto-executed';
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        `Handoff initiated (${mode}). Opened new chat with @${targetAgentId} for task \`${taskId}\`. ` +
          `The orchestrator will recall the full assessment from Engram using key \`handoff:${taskId}\`.`,
      ),
    ]);
  }

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<HandoffInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation> {
    const { targetAgentId, taskId } = options.input ?? {};
    return {
      invocationMessage: `Delegating task \`${taskId ?? '?'}\` to @${targetAgentId ?? '?'}…`,
    };
  }
}
