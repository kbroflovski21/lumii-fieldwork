import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import { randomUUID } from "crypto";
import {
  isBridgeRegister, isBridgeReply, isBridgePreviewStart,
  isBridgeReplyStream, isBridgeUpdateMessage, isBridgeStreamEnd,
  isBridgeCard, isBridgeButtons,
  type BridgeOutgoing, type BridgeRegisterAck, type UserInitFrame, type UserMessageFrame,
} from "./protocol";
import type { AgentConnection, UserConnection, StreamState } from "./types";
import { verifyJwt, verifyWsToken } from "./auth";
import { computeWip } from "./wip";
import type { ChatDb } from "../db/chat";

export interface PoolConfig {
  chatDb: ChatDb;
  jwtSecret: string;
  wsToken: string;
  agentId: string;
}

export class AgentConnectionPool {
  private agentWss: WebSocketServer;
  private userWss: WebSocketServer;
  private agentConn: AgentConnection | null = null;
  private userConns = new Set<UserConnection>();
  private activeStreams = new Map<string, StreamState>();
  private config: PoolConfig;

  constructor(config: PoolConfig) {
    this.config = config;
    this.agentWss = new WebSocketServer({ noServer: true });
    this.userWss = new WebSocketServer({ noServer: true });
  }

  isAgentConnected(): boolean {
    return this.agentConn !== null && this.agentConn.ws.readyState === WebSocket.OPEN;
  }

  handleAgentUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.agentWss.handleUpgrade(req, socket, head, (ws) => this.onAgentConnection(ws));
  }

  handleUserUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.userWss.handleUpgrade(req, socket, head, (ws) => {
      const url = new URL(req.url!, "http://localhost");
      const tokenParam = url.searchParams.get("token") ?? "";
      const sessionId = url.searchParams.get("sessionId") ?? "home";

      const payload = verifyJwt(tokenParam, this.config.jwtSecret);
      if (!payload) {
        ws.send(JSON.stringify({ type: "error", error: "auth: invalid token" }));
        ws.close(4001, "unauthorized");
        return;
      }

      const sessionKey = `web:${this.config.agentId}:${payload.userId}:${sessionId}`;
      const uc: UserConnection = {
        userId: payload.userId,
        userName: payload.name ?? "User",
        agentId: this.config.agentId,
        sessionKey,
        ws,
      };
      this.userConns.add(uc);

      const messages = this.config.chatDb.getRecent(this.config.agentId, sessionKey, 50);
      const lastMsgs = this.config.chatDb.getLastMessages(this.config.agentId, sessionKey, 1);
      const wip = computeWip(lastMsgs, this.isAgentConnected(), Date.now());
      const inFlight = this.getInFlightForSession(sessionKey);

      const init: UserInitFrame = {
        type: "init",
        connected: this.isAgentConnected(),
        messages,
        wip,
        in_flight: inFlight,
        capabilities: this.agentConn?.capabilities ?? [],
      };
      ws.send(JSON.stringify(init));

      ws.on("message", (raw) => {
        try { this.onUserMessage(uc, JSON.parse(raw.toString())); } catch {}
      });
      ws.on("close", () => { this.userConns.delete(uc); });
    });
  }

  shutdown(): void {
    for (const uc of this.userConns) uc.ws.close();
    this.userConns.clear();
    if (this.agentConn) this.agentConn.ws.close();
    this.agentConn = null;
    this.agentWss.close();
    this.userWss.close();
  }

  private onAgentConnection(ws: WebSocket): void {
    let registered = false;
    const timeout = setTimeout(() => { if (!registered) ws.close(4000, "registration timeout"); }, 10_000);

    ws.on("message", (raw) => {
      try {
        const frame = JSON.parse(raw.toString());
        if (!registered) {
          if (!isBridgeRegister(frame)) { ws.close(4000, "expected register"); return; }
          clearTimeout(timeout);
          const token = frame.metadata?.token ?? "";
          if (!verifyWsToken(token, this.config.wsToken)) {
            ws.send(JSON.stringify({ type: "register_ack", ok: false, error: "auth: invalid ws_token" } as BridgeRegisterAck));
            ws.close(4001, "auth failed");
            return;
          }
          registered = true;
          if (this.agentConn) this.agentConn.ws.close();
          this.agentConn = { agentId: this.config.agentId, ws, connectedAt: Date.now(), capabilities: frame.capabilities };
          ws.send(JSON.stringify({ type: "register_ack", ok: true, max_active_sessions: 8 } as BridgeRegisterAck));
          this.broadcastStatus(true);
          return;
        }
        this.onAgentMessage(frame);
      } catch {}
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      if (this.agentConn?.ws === ws) { this.agentConn = null; this.broadcastStatus(false); }
    });
  }

  private onAgentMessage(frame: unknown): void {
    if (isBridgeReply(frame)) {
      // Skip lak progress cards — they are ephemeral status updates, not real messages
      if (frame.content.startsWith("__lak_progress_card_v1__:")) return;
      const id = this.config.chatDb.insert(this.config.agentId, frame.session_key, "assistant", frame.content, "text");
      this.broadcastToUsers(frame.session_key, { type: "message", id, role: "assistant", content: frame.content, msg_type: "text", timestamp: new Date().toISOString() } as UserMessageFrame);
      this.broadcastWip(frame.session_key);
    } else if (isBridgePreviewStart(frame)) {
      const isProgressCard = frame.content.startsWith("__lak_progress_card_v1__:");
      const handle = randomUUID();
      this.activeStreams.set(handle, { agentId: this.config.agentId, sessionKey: frame.session_key, previewHandle: handle, content: frame.content, startedAt: Date.now() });
      this.agentConn?.ws.send(JSON.stringify({ type: "preview_ack", ref_id: frame.ref_id, preview_handle: handle }));
      if (!isProgressCard) {
        this.broadcastToUsers(frame.session_key, { type: "stream_start", msg_id: handle, content: frame.content });
      }
    } else if (isBridgeReplyStream(frame)) {
      const stream = this.activeStreams.get(frame.preview_handle);
      if (stream) {
        const isProgressCard = frame.content.startsWith("__lak_progress_card_v1__:");
        stream.content = frame.content;
        if (!isProgressCard) {
          this.broadcastToUsers(stream.sessionKey, { type: "stream_chunk", msg_id: frame.preview_handle, content: frame.content });
        }
      }
    } else if (isBridgeUpdateMessage(frame)) {
      const stream = this.activeStreams.get(frame.preview_handle);
      if (stream) {
        const isProgressCard = frame.content.startsWith("__lak_progress_card_v1__:");
        if (!isProgressCard) {
          this.config.chatDb.insert(this.config.agentId, stream.sessionKey, "assistant", frame.content, "text");
          this.broadcastToUsers(stream.sessionKey, { type: "stream_end", msg_id: frame.preview_handle, content: frame.content });
        }
        this.activeStreams.delete(frame.preview_handle);
        this.broadcastWip(stream.sessionKey);
      }
    } else if (isBridgeStreamEnd(frame)) {
      const stream = this.activeStreams.get(frame.preview_handle);
      if (stream) {
        const isProgressCard = stream.content.startsWith("__lak_progress_card_v1__:");
        if (!isProgressCard && stream.content) {
          this.config.chatDb.insert(this.config.agentId, stream.sessionKey, "assistant", stream.content, "text");
          this.broadcastToUsers(stream.sessionKey, { type: "stream_end", msg_id: frame.preview_handle, content: stream.content });
        }
        this.activeStreams.delete(frame.preview_handle);
        this.broadcastWip(stream.sessionKey);
      }
    } else if (isBridgeCard(frame)) {
      const cardData = JSON.stringify(frame.card);
      const id = this.config.chatDb.insert(this.config.agentId, frame.session_key, "assistant", "", "card", cardData);
      this.broadcastToUsers(frame.session_key, { type: "message", id, role: "assistant", content: "", msg_type: "card", card_data: frame.card, timestamp: new Date().toISOString() });
    } else if (isBridgeButtons(frame)) {
      const cardData = JSON.stringify({ buttons: frame.buttons });
      const id = this.config.chatDb.insert(this.config.agentId, frame.session_key, "assistant", frame.content, "buttons", cardData);
      this.broadcastToUsers(frame.session_key, { type: "message", id, role: "assistant", content: frame.content, msg_type: "buttons", card_data: { buttons: frame.buttons }, timestamp: new Date().toISOString() });
    }
  }

  private onUserMessage(uc: UserConnection, frame: { type: string; [k: string]: unknown }): void {
    if (frame.type === "send" && typeof frame.content === "string") {
      const id = this.config.chatDb.insert(this.config.agentId, uc.sessionKey, "user", frame.content, "text");
      uc.ws.send(JSON.stringify({ type: "message", id, role: "user", content: frame.content, msg_type: "text", timestamp: new Date().toISOString() } as UserMessageFrame));
      if (this.agentConn && this.agentConn.ws.readyState === WebSocket.OPEN) {
        const bridge: BridgeOutgoing = { type: "message", msg_id: String(id), session_key: uc.sessionKey, user_id: uc.userId, user_name: uc.userName, org: "", content: frame.content, reply_ctx: uc.sessionKey, attachments: frame.attachments as any };
        this.agentConn.ws.send(JSON.stringify(bridge));
      }
      this.broadcastToUsers(uc.sessionKey, { type: "wip_update", wip: true, session_key: uc.sessionKey });
    } else if (frame.type === "load_more" && typeof frame.before === "number") {
      const page = this.config.chatDb.getBefore(this.config.agentId, uc.sessionKey, frame.before, 50);
      uc.ws.send(JSON.stringify({ type: "history", messages: page.messages, hasMore: page.hasMore }));
    } else if (frame.type === "card_action" && typeof frame.action === "string") {
      if (this.agentConn && this.agentConn.ws.readyState === WebSocket.OPEN) {
        this.agentConn.ws.send(JSON.stringify({ type: "card_action", session_key: uc.sessionKey, action: frame.action, reply_ctx: uc.sessionKey }));
      }
    }
  }

  private broadcastToUsers(sessionKey: string, msg: object): void {
    const payload = JSON.stringify(msg);
    for (const uc of this.userConns) {
      if (uc.sessionKey === sessionKey && uc.ws.readyState === WebSocket.OPEN) uc.ws.send(payload);
    }
  }

  private broadcastStatus(connected: boolean): void {
    const payload = JSON.stringify({ type: "status", connected });
    for (const uc of this.userConns) { if (uc.ws.readyState === WebSocket.OPEN) uc.ws.send(payload); }
  }

  private broadcastWip(sessionKey: string): void {
    const lastMsgs = this.config.chatDb.getLastMessages(this.config.agentId, sessionKey, 1);
    const wip = computeWip(lastMsgs, this.isAgentConnected(), Date.now());
    this.broadcastToUsers(sessionKey, { type: "wip_update", wip, session_key: sessionKey });
  }

  private getInFlightForSession(sessionKey: string): unknown[] {
    const streams: unknown[] = [];
    for (const [handle, state] of this.activeStreams) {
      if (state.sessionKey === sessionKey) streams.push({ msg_id: handle, content: state.content });
    }
    return streams;
  }
}
