/**
 * Parses agent IDs from platform/agent-id format
 * @param items Array of pending change items with id in format "platform/agent-id"
 * @returns Set of agent IDs
 */
export function parseAgentIds(
  items: Array<{ id: string; action: 'create' | 'update' | 'delete' }>,
): Set<string> {
  return new Set(items.map((item) => item.id.split('/')[1] || ''));
}
