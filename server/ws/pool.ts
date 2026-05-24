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
    this.userWss.handleUpgrade(req, socket, head, async (ws) => {
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

      const messages = await this.config.chatDb.getRecent(this.config.agentId, sessionKey, 50);
      const lastMsgs = await this.config.chatDb.getLastMessages(this.config.agentId, sessionKey, 1);
      const wip = computeWip(lastMsgs, this.isAgentConnected(), Date.now());
      const inFlight = this.getInFlightForSession(sessionKey);

      const init: UserInitFrame = {
        type: "init",
        connected: true,
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

  private async onAgentMessage(frame: unknown): Promise<void> {
    if (isBridgeReply(frame)) {
      // Skip lak progress cards — they are ephemeral status updates, not real messages
      if (frame.content.startsWith("__lak_progress_card_v1__:")) return;
      // Skip if an active stream for this session has the same content (stream_end will handle it)
      const hasActiveStream = [...this.activeStreams.values()].some(
        s => s.sessionKey === frame.session_key && s.content === frame.content
      );
      if (hasActiveStream) return;
      const id = await this.config.chatDb.insert(this.config.agentId, frame.session_key, "assistant", frame.content, "text");
      this.broadcastToUsers(frame.session_key, { type: "message", id, role: "assistant", content: frame.content, msg_type: "text", timestamp: new Date().toISOString() } as UserMessageFrame);
      await this.broadcastWip(frame.session_key);
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
          await this.config.chatDb.insert(this.config.agentId, stream.sessionKey, "assistant", frame.content, "text");
          this.broadcastToUsers(stream.sessionKey, { type: "stream_end", msg_id: frame.preview_handle, content: frame.content });
        }
        this.activeStreams.delete(frame.preview_handle);
        await this.broadcastWip(stream.sessionKey);
      }
    } else if (isBridgeStreamEnd(frame)) {
      const stream = this.activeStreams.get(frame.preview_handle);
      if (stream) {
        const isProgressCard = stream.content.startsWith("__lak_progress_card_v1__:");
        if (!isProgressCard && stream.content) {
          await this.config.chatDb.insert(this.config.agentId, stream.sessionKey, "assistant", stream.content, "text");
          this.broadcastToUsers(stream.sessionKey, { type: "stream_end", msg_id: frame.preview_handle, content: stream.content });
        }
        this.activeStreams.delete(frame.preview_handle);
        await this.broadcastWip(stream.sessionKey);
      }
    } else if (isBridgeCard(frame)) {
      const cardData = JSON.stringify(frame.card);
      const id = await this.config.chatDb.insert(this.config.agentId, frame.session_key, "assistant", "", "card", cardData);
      this.broadcastToUsers(frame.session_key, { type: "message", id, role: "assistant", content: "", msg_type: "card", card_data: frame.card, timestamp: new Date().toISOString() });
    } else if (isBridgeButtons(frame)) {
      const cardData = JSON.stringify({ buttons: frame.buttons });
      const id = await this.config.chatDb.insert(this.config.agentId, frame.session_key, "assistant", frame.content, "buttons", cardData);
      this.broadcastToUsers(frame.session_key, { type: "message", id, role: "assistant", content: frame.content, msg_type: "buttons", card_data: { buttons: frame.buttons }, timestamp: new Date().toISOString() });
    }
  }

  private async onUserMessage(uc: UserConnection, frame: { type: string; [k: string]: unknown }): Promise<void> {
    if (frame.type === "send" && typeof frame.content === "string") {
      const ts = new Date().toISOString();
      const tempId = Date.now();
      // Send user echo immediately (before DB insert) to guarantee ordering before lak reply
      uc.ws.send(JSON.stringify({ type: "message", id: tempId, role: "user", content: frame.content, msg_type: "text", timestamp: ts } as UserMessageFrame));
      const id = await this.config.chatDb.insert(this.config.agentId, uc.sessionKey, "user", frame.content, "text");
      if (this.agentConn && this.agentConn.ws.readyState === WebSocket.OPEN) {
        const bridge: BridgeOutgoing = { type: "message", msg_id: String(id), session_key: uc.sessionKey, user_id: uc.userId, user_name: uc.userName, org: "", content: frame.content, reply_ctx: uc.sessionKey, attachments: frame.attachments as any };
        this.agentConn.ws.send(JSON.stringify(bridge));
        this.broadcastToUsers(uc.sessionKey, { type: "wip_update", wip: true, session_key: uc.sessionKey });
      } else {
        this.mockReply(uc, frame.content);
      }
    } else if (frame.type === "load_more" && typeof frame.before === "number") {
      const page = await this.config.chatDb.getBefore(this.config.agentId, uc.sessionKey, frame.before, 50);
      uc.ws.send(JSON.stringify({ type: "history", messages: page.messages, hasMore: page.hasMore }));
    } else if (frame.type === "card_action" && typeof frame.action === "string") {
      if (this.agentConn && this.agentConn.ws.readyState === WebSocket.OPEN) {
        this.agentConn.ws.send(JSON.stringify({ type: "card_action", session_key: uc.sessionKey, action: frame.action, reply_ctx: uc.sessionKey }));
      }
    }
  }

  private async mockReply(uc: UserConnection, userContent: string): Promise<void> {
    const responses: Record<string, string> = {
      "你好": "你好！我是金色年华AI助手，有什么可以帮你的？",
      "帮助": "我可以帮你查询服务排期、员工信息、长者档案，也可以协助分析服务质量数据。试试问我：\n- 今天有哪些服务？\n- 王丽的服务情况怎么样？\n- 最近的服务质量趋势如何？",
    };
    const lower = userContent.trim();
    let reply = responses[lower];
    if (!reply) {
      if (lower.includes("服务") && lower.includes("今天")) {
        reply = "今天共有 18 项服务安排：\n- 已完成 12 项\n- 进行中 3 项\n- 待开始 3 项\n\n服务人员王丽、张敏正在执行助餐服务，李芳即将出发前往三墩站。需要查看详细排期吗？";
      } else if (lower.includes("质量") || lower.includes("评分")) {
        reply = "本月服务质量概览：\n- 平均 S 分：**31.8**（满分40）\n- 较上月提升 **+0.8**\n- 表现最佳：王丽（S分 34.2）\n- 需要关注：周建国（评分偏低，建议安排培训）\n\n需要查看具体某位员工的详情吗？";
      } else if (lower.includes("王丽")) {
        reply = "**王丽** 本月服务数据：\n- 服务次数：24 次\n- S 均分：34.2（较上月 +1.7）\n- 获得表扬 42 次\n- 最近表扬：「服务细心周到，阿姨很满意」\n\n她是本站表现最优秀的服务人员之一。";
      } else if (lower.includes("排期") || lower.includes("安排")) {
        reply = "本周服务排期概况：\n- 总计 98 项服务\n- 已分配 92 项\n- 待排班 6 项（缺口主要在周四下午）\n\n建议优先安排张敏填补周四助餐缺口。需要我帮你自动排班吗？";
      } else if (lower.includes("长者") || lower.includes("陈阿姨")) {
        reply = "**陈阿姨**（82岁）档案摘要：\n- 地址：翠苑一区3幢\n- 服务频次：每周三次\n- 服务项目：助餐、陪诊\n- 风险标签：独居、跌倒风险\n- 照护重点：午餐后需确认服药\n- 家属订阅：周报\n\n最近三次助餐完成稳定，建议持续关注用药提醒。";
      } else {
        reply = `收到您的问题：「${userContent}」\n\n我正在分析中，请稍候...实际部署后，这里将接入真实的AI助手为您提供专业的数据分析和操作建议。\n\n您也可以试试问我：\n- 今天有哪些服务？\n- 服务质量怎么样？\n- 王丽的情况如何？`;
      }
    }
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
    const replyId = await this.config.chatDb.insert(this.config.agentId, uc.sessionKey, "assistant", reply, "text");
    this.broadcastToUsers(uc.sessionKey, { type: "message", id: replyId, role: "assistant", content: reply, msg_type: "text", timestamp: new Date().toISOString() } as UserMessageFrame);
  }

  private broadcastToUsers(sessionKey: string, msg: object): void {
    const payload = JSON.stringify(msg);
    for (const uc of this.userConns) {
      if (uc.sessionKey === sessionKey && uc.ws.readyState === WebSocket.OPEN) uc.ws.send(payload);
    }
  }

  private broadcastStatus(_connected: boolean): void {
    const payload = JSON.stringify({ type: "status", connected: true });
    for (const uc of this.userConns) { if (uc.ws.readyState === WebSocket.OPEN) uc.ws.send(payload); }
  }

  private async broadcastWip(sessionKey: string): Promise<void> {
    const lastMsgs = await this.config.chatDb.getLastMessages(this.config.agentId, sessionKey, 1);
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
