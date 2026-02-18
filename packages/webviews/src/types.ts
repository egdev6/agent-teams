export interface DashboardStats {
  hasProfile: boolean;
  totalAgents: number;
  specCount: number;
  validSpecs: number;
  syncStatus: 'SUCCESS' | 'WARNING' | 'NOT_SYNCED';
  syncTime: string;
  agents: Agent[];
}

export interface Agent {
  id: string;
  name: string;
  role: 'worker' | 'router' | 'orchestrator';
  lastModified: string;
}

export type MessageType =
  | { type: 'initProject' }
  | { type: 'createAgent' }
  | { type: 'syncAgents' }
  | { type: 'browseKits' }
  | { type: 'openChat' }
  | { type: 'editAgent'; agentId: string }
  | { type: 'deleteAgent'; agentId: string }
  | { type: 'viewSpec'; agentId: string }
  | { type: 'refresh' }
  | { type: 'saveProfile'; profile: any }
  | { type: 'requestDetectedConfig' };
