import type { WebSocket } from "ws";

export interface AgentConnection {
  agentId: string;
  ws: WebSocket;
  connectedAt: number;
  capabilities: string[];
}

export interface UserConnection {
  userId: string;
  userName: string;
  agentId: string;
  sessionKey: string;
  ws: WebSocket;
}

export interface StreamState {
  agentId: string;
  sessionKey: string;
  previewHandle: string;
  content: string;
  startedAt: number;
}
