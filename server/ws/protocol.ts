// server/ws/protocol.ts

// --- Agent → Dashboard (Bridge inbound) ---

export interface BridgeRegister {
  type: "register";
  platform: string;
  capabilities: string[];
  metadata?: { agent_id?: string; token?: string };
}

export interface BridgeReply {
  type: "reply";
  content: string;
  reply_ctx: string;
  session_key: string;
  attachments?: BridgeAttachment[];
}

export interface BridgePreviewStart {
  type: "preview_start";
  ref_id: string;
  session_key: string;
  reply_ctx: string;
  content: string;
}

export interface BridgeReplyStream {
  type: "reply_stream";
  session_key: string;
  preview_handle: string;
  content: string;
}

export interface BridgeUpdateMessage {
  type: "update_message";
  session_key: string;
  preview_handle: string;
  content: string;
}

export interface BridgeStreamEnd {
  type: "stream_end";
  preview_handle: string;
  session_key: string;
}

export interface BridgeCard {
  type: "card";
  session_key: string;
  reply_ctx: string;
  card: { header?: { title: string; color: string }; elements: unknown[]; note?: string };
}

export interface BridgeButtons {
  type: "buttons";
  session_key: string;
  reply_ctx: string;
  content: string;
  buttons: Array<Array<{ text: string; btn_type: string; value: string }>>;
}

export interface BridgeAttachment {
  kind: "image" | "file";
  filepath: string;
  filename: string;
  mime: string;
  size: number;
}

// --- Dashboard → Agent (Bridge outbound) ---

export interface BridgeOutgoing {
  type: "message";
  msg_id: string;
  session_key: string;
  user_id: string;
  user_name: string;
  org: string;
  content: string;
  reply_ctx: string;
  attachments?: BridgeAttachment[];
}

export interface BridgeRegisterAck {
  type: "register_ack";
  ok: boolean;
  error?: string;
  max_active_sessions?: number;
}

export interface BridgeCardAction {
  type: "card_action";
  session_key: string;
  action: string;
  reply_ctx: string;
}

// --- Browser → Dashboard (User WS frames) ---

export interface UserSendFrame {
  type: "send";
  content: string;
  attachments?: BridgeAttachment[];
}

export interface UserLoadMoreFrame {
  type: "load_more";
  before: number;
}

export interface UserCardActionFrame {
  type: "card_action";
  msg_id: string;
  action: string;
}

// --- Dashboard → Browser ---

export interface UserInitFrame {
  type: "init";
  connected: boolean;
  messages: PersistedMessage[];
  wip: boolean;
  in_flight: unknown[];
  capabilities: string[];
}

export interface UserMessageFrame {
  type: "message";
  id: number;
  role: "user" | "assistant";
  content: string;
  msg_type: string;
  card_data?: unknown;
  timestamp: string;
  attachments?: BridgeAttachment[];
}

export interface UserStreamStartFrame { type: "stream_start"; msg_id: string; content: string; }
export interface UserStreamChunkFrame { type: "stream_chunk"; msg_id: string; content: string; }
export interface UserStreamEndFrame { type: "stream_end"; msg_id: string; content: string; }
export interface UserWipUpdateFrame { type: "wip_update"; wip: boolean; session_key: string; }
export interface UserStatusFrame { type: "status"; connected: boolean; }
export interface UserHistoryFrame { type: "history"; messages: PersistedMessage[]; hasMore: boolean; }
export interface UserErrorFrame { type: "error"; error: string; }

// --- Shared ---

export interface PersistedMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  msg_type: string;
  card_data?: string | null;
  timestamp: string;
  attachments?: BridgeAttachment[];
}

// --- Type guards ---

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

export function isBridgeRegister(v: unknown): v is BridgeRegister {
  return isObj(v) && v.type === "register" && typeof v.platform === "string" && Array.isArray(v.capabilities);
}

export function isBridgeReply(v: unknown): v is BridgeReply {
  return isObj(v) && v.type === "reply" && typeof v.content === "string" && typeof v.reply_ctx === "string" && typeof v.session_key === "string";
}

export function isBridgePreviewStart(v: unknown): v is BridgePreviewStart {
  return isObj(v) && v.type === "preview_start" && typeof v.ref_id === "string" && typeof v.session_key === "string";
}

export function isBridgeReplyStream(v: unknown): v is BridgeReplyStream {
  return isObj(v) && v.type === "reply_stream" && typeof v.preview_handle === "string" && typeof v.session_key === "string";
}

export function isBridgeUpdateMessage(v: unknown): v is BridgeUpdateMessage {
  return isObj(v) && v.type === "update_message" && typeof v.preview_handle === "string" && typeof v.session_key === "string";
}

export function isBridgeStreamEnd(v: unknown): v is BridgeStreamEnd {
  return isObj(v) && v.type === "stream_end" && typeof v.preview_handle === "string";
}

export function isBridgeCard(v: unknown): v is BridgeCard {
  return isObj(v) && v.type === "card" && typeof v.session_key === "string" && isObj(v.card);
}

export function isBridgeButtons(v: unknown): v is BridgeButtons {
  return isObj(v) && v.type === "buttons" && typeof v.session_key === "string" && Array.isArray(v.buttons);
}
