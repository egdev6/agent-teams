/**
 * Agent Teams MCP Server — dispatch_task tool
 *
 * Provides a `dispatch_task` tool for Claude Code / CLI users to coordinate
 * multi-agent delegation via the file-based coordination protocol.
 *
 * Transport: stdio (JSON-RPC 2.0)
 * Usage: node dist/mcp/dispatch-server.js
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

// ── MCP protocol types ──────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ── Tool definitions ────────────────────────────────────────────────────────

const DISPATCH_TOOL = {
  name: 'dispatch_task',
  description:
    'Dispatch a task to a target agent by writing a coordination record. ' +
    'Before calling this tool, write the full task context to Engram using ' +
    '`engram_remember` with key `task:{taskId}:subtask:{agentId}`. ' +
    'This tool records the delegation so the TaskCoordinator can track completion.',
  inputSchema: {
    type: 'object',
    properties: {
      agentId: {
        type: 'string',
        description: 'ID of the target agent (orchestrator or worker)',
      },
      taskId: {
        type: 'string',
        description: 'Unique task identifier, e.g. task-1741788000',
      },
      description: {
        type: 'string',
        description: 'Short description of the sub-task being dispatched',
      },
      workspaceRoot: {
        type: 'string',
        description: 'Absolute path to the workspace root (default: current working directory)',
      },
    },
    required: ['agentId', 'taskId', 'description'],
  },
} as const;

const COMPLETE_TOOL = {
  name: 'complete_subtask',
  description:
    'Mark a dispatched subtask as completed. Call this after writing your results to Engram ' +
    '(key: `task:{taskId}:subtask:{agentId}:result`). The TaskCoordinator will detect the update ' +
    'and open the Aggregator chat once all subtasks for the task are complete.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'Task identifier that was received in the [Parallel:{taskId}] prefix',
      },
      agentId: {
        type: 'string',
        description: 'Your own agent ID (as listed in the `.agent.md` filename)',
      },
      summary: {
        type: 'string',
        description: 'One-line summary of what was accomplished',
      },
      workspaceRoot: {
        type: 'string',
        description: 'Absolute path to the workspace root (default: current working directory)',
      },
    },
    required: ['taskId', 'agentId', 'summary'],
  },
} as const;

// ── Handlers ─────────────────────────────────────────────────────────────────

interface DispatchInput {
  agentId: string;
  taskId: string;
  description: string;
  workspaceRoot?: string;
}

interface CompleteInput {
  taskId: string;
  agentId: string;
  summary: string;
  workspaceRoot?: string;
}

function handleCompleteSubtask(input: CompleteInput): string {
  const root = input.workspaceRoot ?? process.cwd();
  const coordinationDir = path.join(root, '.agent-teams', 'coordination');
  const filePath = path.join(coordinationDir, `${input.taskId}-${input.agentId}.json`);

  if (!fs.existsSync(filePath)) {
    return (
      `Warning: coordination file not found at ${filePath}. ` +
      'The TaskCoordinator may not detect this completion. ' +
      'Ensure dispatch_task was called first with the same taskId and agentId.'
    );
  }

  const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  const updated = {
    ...existing,
    status: 'completed',
    completedAt: new Date().toISOString(),
    summary: input.summary,
  };

  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');

  return (
    `Subtask marked as completed. Coordination file updated: ${filePath}\n` +
    `The TaskCoordinator will detect this change and open the Aggregator ` +
    `once all subtasks for task \`${input.taskId}\` are done.`
  );
}

function handleDispatchTask(input: DispatchInput): string {
  const root = input.workspaceRoot ?? process.cwd();
  const coordinationDir = path.join(root, '.agent-teams', 'coordination');

  fs.mkdirSync(coordinationDir, { recursive: true });

  const record = {
    taskId: input.taskId,
    agentId: input.agentId,
    description: input.description,
    status: 'pending' as const,
    dispatchedAt: new Date().toISOString(),
    engramKey: `task:${input.taskId}:subtask:${input.agentId}`,
  };

  const filePath = path.join(coordinationDir, `${input.taskId}-${input.agentId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');

  return (
    `Task dispatched. Coordination record written to: ${filePath}\n\n` +
    `The target agent (@${input.agentId}) should:\n` +
    `1. Recall task context from Engram: key \`${record.engramKey}\`\n` +
    `2. Execute the task\n` +
    `3. Write results to Engram: key \`task:${input.taskId}:subtask:${input.agentId}:result\`\n` +
    `4. Update coordination file status to 'completed'`
  );
}

// ── JSON-RPC server ──────────────────────────────────────────────────────────

function send(response: JsonRpcResponse): void {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

function handleRequest(req: JsonRpcRequest): JsonRpcResponse {
  switch (req.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'agent-teams-mcp', version: '1.0.0' },
        },
      };

    case 'notifications/initialized':
      // No response for notifications
      return { jsonrpc: '2.0', id: null, result: null };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: { tools: [DISPATCH_TOOL, COMPLETE_TOOL] },
      };

    case 'tools/call': {
      const params = req.params as { name: string; arguments: unknown };

      if (params.name !== 'dispatch_task' && params.name !== 'complete_subtask') {
        return {
          jsonrpc: '2.0',
          id: req.id,
          error: { code: -32601, message: `Unknown tool: ${params.name}` },
        };
      }

      try {
        const text =
          params.name === 'complete_subtask'
            ? handleCompleteSubtask(params.arguments as CompleteInput)
            : handleDispatchTask(params.arguments as DispatchInput);
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: { content: [{ type: 'text', text }] },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [{ type: 'text', text: `Error: ${message}` }],
            isError: true,
          },
        };
      }
    }

    case 'ping':
      return { jsonrpc: '2.0', id: req.id, result: {} };

    default:
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32601, message: `Method not found: ${req.method}` },
      };
  }
}

// ── Main loop ────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let req: JsonRpcRequest;
  try {
    req = JSON.parse(trimmed) as JsonRpcRequest;
  } catch {
    send({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    });
    return;
  }

  // Notifications have no id and expect no response
  if (req.id === undefined || req.id === null) {
    if (req.method === 'notifications/initialized') return;
  }

  const response = handleRequest(req);
  // Don't send responses for server-sent notifications
  if (response.id !== null || req.id !== undefined) {
    send(response);
  }
});

rl.on('close', () => process.exit(0));
