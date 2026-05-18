# Chat & Copilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full AI chat chain: frontend ↔ WSS relay ↔ lak ↔ CC session ↔ agent sidecar, covering home page chat + tab copilot + orchestrator skill with TDD and E2E coverage.

**Architecture:** Frontend uses useAgentChat hook over WebSocket to goldenyears-api relay layer. API relay bridges to lak via WSS (lak initiates connection). lak runs CC sessions with goldenyears-agent sidecar providing hooks + orchestrator skill. All CRUD happens via agent curl-ing the existing REST API.

**Tech Stack:** TypeScript (Express + React + Vite), Go (agent sidecar), SQLite, WebSocket (ws library), Vitest, Playwright, lak

**Testing Strategy:**
- Unit tests: Vitest with mock WebSocket (ws library's `WebSocketServer`)
- Integration tests: Real WebSocket connections between test client and Express server
- E2E tests: Playwright + fresh local lak instance (separate data_dir at `/tmp/lak-fieldwork-test/`)

---

## Phase 1: WSS Relay Layer

### File Structure (P1)

```
server/
├── index.ts                    # MODIFY: Add HTTP upgrade handling for WS
├── ws/
│   ├── pool.ts                 # CREATE: AgentConnectionPool (relay core)
│   ├── protocol.ts             # CREATE: Bridge message type definitions
│   ├── wip.ts                  # CREATE: computeWip pure function
│   ├── auth.ts                 # CREATE: JWT verify + ws_token verify
│   └── types.ts                # CREATE: Shared WS types
├── db/
│   ├── init.ts                 # MODIFY: Add chat_messages table
│   └── chat.ts                 # CREATE: Chat message persistence queries
├── routes/
│   └── files.ts                # CREATE: File staging upload endpoint
└── middleware/
    └── gy-token.ts             # CREATE: GY_API_TOKEN validation middleware

tests/
├── ws/
│   ├── pool.test.ts            # Unit tests for AgentConnectionPool
│   ├── wip.test.ts             # Unit tests for computeWip
│   ├── auth.test.ts            # Unit tests for JWT/ws_token auth
│   └── integration.test.ts    # Integration: real WS connections
└── middleware/
    └── gy-token.test.ts        # Unit tests for token middleware
```

---

### Task 1: WebSocket Protocol Types

**Files:**
- Create: `server/ws/protocol.ts`
- Create: `server/ws/types.ts`
- Test: `tests/ws/protocol.test.ts`

- [ ] **Step 1: Write the failing test for protocol types**

```typescript
// tests/ws/protocol.test.ts
import { describe, it, expect } from "vitest";
import {
  isBridgeRegister,
  isBridgeReply,
  isBridgePreviewStart,
  isBridgeReplyStream,
  isBridgeUpdateMessage,
  isBridgeStreamEnd,
  isBridgeCard,
  isBridgeButtons,
  type BridgeRegister,
  type BridgeOutgoing,
  type UserSendFrame,
} from "../../server/ws/protocol";

describe("protocol type guards", () => {
  it("validates BridgeRegister", () => {
    const valid: BridgeRegister = {
      type: "register",
      platform: "dashboard",
      capabilities: ["attachments"],
      metadata: { agent_id: "lumii-goldenyears", token: "secret" },
    };
    expect(isBridgeRegister(valid)).toBe(true);
    expect(isBridgeRegister({ type: "other" })).toBe(false);
    expect(isBridgeRegister(null)).toBe(false);
  });

  it("validates BridgeReply", () => {
    expect(isBridgeReply({ type: "reply", content: "hi", reply_ctx: "ctx1", session_key: "web:a:b:home" })).toBe(true);
    expect(isBridgeReply({ type: "reply" })).toBe(false);
  });

  it("validates BridgePreviewStart", () => {
    expect(isBridgePreviewStart({
      type: "preview_start", ref_id: "r1", session_key: "sk", reply_ctx: "rc", content: ""
    })).toBe(true);
  });

  it("validates BridgeReplyStream", () => {
    expect(isBridgeReplyStream({
      type: "reply_stream", session_key: "sk", preview_handle: "ph", content: "chunk"
    })).toBe(true);
  });

  it("validates BridgeUpdateMessage", () => {
    expect(isBridgeUpdateMessage({
      type: "update_message", session_key: "sk", preview_handle: "ph", content: "final"
    })).toBe(true);
  });

  it("validates BridgeStreamEnd", () => {
    expect(isBridgeStreamEnd({ type: "stream_end", preview_handle: "ph", session_key: "sk" })).toBe(true);
  });

  it("validates BridgeCard", () => {
    expect(isBridgeCard({
      type: "card", session_key: "sk", reply_ctx: "rc",
      card: { elements: [{ type: "text", content: "hi" }] }
    })).toBe(true);
  });

  it("validates BridgeButtons", () => {
    expect(isBridgeButtons({
      type: "buttons", session_key: "sk", reply_ctx: "rc", content: "choose",
      buttons: [[{ text: "Yes", btn_type: "primary", value: "yes" }]]
    })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ws/protocol.test.ts`
Expected: FAIL — cannot find module `../../server/ws/protocol`

- [ ] **Step 3: Implement protocol types and guards**

```typescript
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

// --- Dashboard → Browser (User WS frames) ---

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

export interface UserStreamStartFrame {
  type: "stream_start";
  msg_id: string;
  content: string;
}

export interface UserStreamChunkFrame {
  type: "stream_chunk";
  msg_id: string;
  content: string;
}

export interface UserStreamEndFrame {
  type: "stream_end";
  msg_id: string;
  content: string;
}

export interface UserWipUpdateFrame {
  type: "wip_update";
  wip: boolean;
  session_key: string;
}

export interface UserStatusFrame {
  type: "status";
  connected: boolean;
}

export interface UserHistoryFrame {
  type: "history";
  messages: PersistedMessage[];
  hasMore: boolean;
}

export interface UserErrorFrame {
  type: "error";
  error: string;
}

// --- Shared ---

export interface PersistedMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  msg_type: string;
  card_data?: unknown;
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
```

```typescript
// server/ws/types.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ws/protocol.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/ws/protocol.ts server/ws/types.ts tests/ws/protocol.test.ts
git commit -m "feat(ws): add Bridge protocol types and type guards"
```

---

### Task 2: computeWip Pure Function

**Files:**
- Create: `server/ws/wip.ts`
- Test: `tests/ws/wip.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/ws/wip.test.ts
import { describe, it, expect } from "vitest";
import { computeWip, WIP_TIMEOUT_MS } from "../../server/ws/wip";

describe("computeWip", () => {
  const now = Date.now();

  it("returns false when agent is disconnected", () => {
    expect(computeWip([{ role: "user", timestamp: new Date(now - 1000).toISOString() }], false, now)).toBe(false);
  });

  it("returns false when no messages", () => {
    expect(computeWip([], true, now)).toBe(false);
  });

  it("returns false when last message is from assistant", () => {
    expect(computeWip([{ role: "assistant", timestamp: new Date(now - 1000).toISOString() }], true, now)).toBe(false);
  });

  it("returns true when last message is from user within timeout", () => {
    expect(computeWip([{ role: "user", timestamp: new Date(now - 1000).toISOString() }], true, now)).toBe(true);
  });

  it("returns false when last user message is older than timeout", () => {
    const oldTs = new Date(now - WIP_TIMEOUT_MS - 1000).toISOString();
    expect(computeWip([{ role: "user", timestamp: oldTs }], true, now)).toBe(false);
  });

  it("returns true when timestamp is missing (assume working)", () => {
    expect(computeWip([{ role: "user" }], true, now)).toBe(true);
  });

  it("considers only the last message", () => {
    const history = [
      { role: "user", timestamp: new Date(now - 1000).toISOString() },
      { role: "assistant", timestamp: new Date(now - 500).toISOString() },
    ];
    expect(computeWip(history, true, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/ws/wip.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// server/ws/wip.ts

export const WIP_TIMEOUT_MS = 30 * 60_000; // 30 minutes
export const STREAM_TTL_MS = 30_000; // 30 seconds

export function computeWip(
  history: Array<{ role: string; timestamp?: string }>,
  connected: boolean,
  nowMs: number
): boolean {
  if (!connected) return false;
  if (history.length === 0) return false;

  const last = history[history.length - 1];
  if (last.role !== "user") return false;

  if (!last.timestamp) return true;

  const parsed = new Date(last.timestamp).getTime();
  if (isNaN(parsed)) return true;

  return nowMs - parsed < WIP_TIMEOUT_MS;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/ws/wip.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/ws/wip.ts tests/ws/wip.test.ts
git commit -m "feat(ws): add computeWip pure function"
```

---

### Task 3: JWT and ws_token Authentication

**Files:**
- Create: `server/ws/auth.ts`
- Test: `tests/ws/auth.test.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install ws jsonwebtoken && npm install -D @types/ws @types/jsonwebtoken
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/ws/auth.test.ts
import { describe, it, expect } from "vitest";
import { signJwt, verifyJwt, verifyWsToken, signGyToken, verifyGyToken } from "../../server/ws/auth";

const TEST_JWT_SECRET = "test-jwt-secret-for-unit-tests";
const TEST_WS_TOKEN = "agent-ws-token-abc123";
const TEST_GY_SECRET = "test-gy-token-secret";

describe("JWT auth", () => {
  it("signs and verifies a valid token", () => {
    const token = signJwt({ userId: "user-1", name: "Test" }, TEST_JWT_SECRET, "1h");
    const payload = verifyJwt(token, TEST_JWT_SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user-1");
    expect(payload!.name).toBe("Test");
  });

  it("returns null for invalid token", () => {
    expect(verifyJwt("garbage", TEST_JWT_SECRET)).toBeNull();
  });

  it("returns null for expired token", () => {
    const token = signJwt({ userId: "user-1" }, TEST_JWT_SECRET, "0s");
    // Token expires immediately
    expect(verifyJwt(token, TEST_JWT_SECRET)).toBeNull();
  });
});

describe("ws_token auth", () => {
  it("accepts matching token", () => {
    expect(verifyWsToken(TEST_WS_TOKEN, TEST_WS_TOKEN)).toBe(true);
  });

  it("rejects non-matching token", () => {
    expect(verifyWsToken("wrong-token", TEST_WS_TOKEN)).toBe(false);
  });

  it("rejects empty token", () => {
    expect(verifyWsToken("", TEST_WS_TOKEN)).toBe(false);
  });
});

describe("GY API token", () => {
  it("signs and verifies a scoped token", () => {
    const token = signGyToken({
      sub: "user-1",
      role: "site_operator",
      siteIds: ["site-001"],
      scope: "home",
      permissions: { social_workers: ["read", "write"] },
    }, TEST_GY_SECRET);

    const payload = verifyGyToken(token, TEST_GY_SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("user-1");
    expect(payload!.role).toBe("site_operator");
    expect(payload!.siteIds).toEqual(["site-001"]);
    expect(payload!.scope).toBe("home");
  });

  it("rejects token signed with wrong secret", () => {
    const token = signGyToken({ sub: "user-1", role: "op", siteIds: [], scope: "home", permissions: {} }, TEST_GY_SECRET);
    expect(verifyGyToken(token, "wrong-secret")).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/ws/auth.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement auth module**

```typescript
// server/ws/auth.ts
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "crypto";

export interface JwtPayload {
  userId: string;
  name?: string;
  [key: string]: unknown;
}

export interface GyTokenPayload {
  sub: string;
  role: string;
  siteIds: string[];
  scope: string;
  permissions: Record<string, string[]>;
  iat?: number;
  exp?: number;
}

export function signJwt(payload: Record<string, unknown>, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyWsToken(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function signGyToken(payload: Omit<GyTokenPayload, "iat" | "exp">, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: "30m" });
}

export function verifyGyToken(token: string, secret: string): GyTokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as GyTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run tests/ws/auth.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/ws/auth.ts tests/ws/auth.test.ts package.json package-lock.json
git commit -m "feat(ws): add JWT, ws_token, and GY token auth"
```

---

### Task 4: Chat Message Persistence Layer

**Files:**
- Modify: `server/db/init.ts`
- Create: `server/db/chat.ts`
- Test: `tests/db/chat.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/db/chat.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { ChatDb } from "../../server/db/chat";

describe("ChatDb", () => {
  let db: Database.Database;
  let chatDb: ChatDb;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    chatDb = new ChatDb(db);
    chatDb.migrate();
  });

  afterEach(() => {
    db.close();
  });

  it("inserts and retrieves a message", () => {
    const id = chatDb.insert("agent-1", "web:agent-1:user-1:home", "user", "hello", "text");
    expect(id).toBeGreaterThan(0);

    const msgs = chatDb.getRecent("agent-1", "web:agent-1:user-1:home", 50);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("hello");
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].id).toBe(id);
  });

  it("respects limit and ordering (newest last)", () => {
    chatDb.insert("a", "sk", "user", "msg1", "text");
    chatDb.insert("a", "sk", "assistant", "msg2", "text");
    chatDb.insert("a", "sk", "user", "msg3", "text");

    const msgs = chatDb.getRecent("a", "sk", 2);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toBe("msg2");
    expect(msgs[1].content).toBe("msg3");
  });

  it("paginates with before cursor", () => {
    const id1 = chatDb.insert("a", "sk", "user", "msg1", "text");
    const id2 = chatDb.insert("a", "sk", "user", "msg2", "text");
    chatDb.insert("a", "sk", "user", "msg3", "text");

    const page = chatDb.getBefore("a", "sk", id2 + 1, 10);
    expect(page.messages).toHaveLength(2);
    expect(page.messages[0].content).toBe("msg1");
    expect(page.messages[1].content).toBe("msg2");
  });

  it("returns hasMore correctly", () => {
    for (let i = 0; i < 5; i++) chatDb.insert("a", "sk", "user", `msg${i}`, "text");
    const page = chatDb.getBefore("a", "sk", 999, 3);
    expect(page.messages).toHaveLength(3);
    expect(page.hasMore).toBe(true);

    const page2 = chatDb.getBefore("a", "sk", page.messages[0].id, 10);
    expect(page2.hasMore).toBe(false);
  });

  it("gets last N for wip computation", () => {
    chatDb.insert("a", "sk", "user", "u1", "text");
    chatDb.insert("a", "sk", "assistant", "a1", "text");
    chatDb.insert("a", "sk", "user", "u2", "text");

    const last = chatDb.getLastMessages("a", "sk", 1);
    expect(last).toHaveLength(1);
    expect(last[0].role).toBe("user");
  });

  it("stores and retrieves card_data as JSON", () => {
    const cardData = { buttons: [["yes", "no"]] };
    chatDb.insert("a", "sk", "assistant", "choose", "buttons", JSON.stringify(cardData));
    const msgs = chatDb.getRecent("a", "sk", 50);
    expect(msgs[0].msg_type).toBe("buttons");
    expect(JSON.parse(msgs[0].card_data!)).toEqual(cardData);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/db/chat.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement ChatDb**

```typescript
// server/db/chat.ts
import type Database from "better-sqlite3";
import type { PersistedMessage } from "../ws/protocol";

export class ChatDb {
  constructor(private db: Database.Database) {}

  migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        session_key TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        msg_type TEXT NOT NULL DEFAULT 'text',
        card_data TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_chat_agent_session
        ON chat_messages(agent_id, session_key, id DESC);
    `);
  }

  insert(agentId: string, sessionKey: string, role: string, content: string, msgType: string, cardData?: string): number {
    const stmt = this.db.prepare(
      `INSERT INTO chat_messages (agent_id, session_key, role, content, msg_type, card_data) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(agentId, sessionKey, role, content, msgType, cardData ?? null);
    return result.lastInsertRowid as number;
  }

  getRecent(agentId: string, sessionKey: string, limit: number): PersistedMessage[] {
    const rows = this.db.prepare(
      `SELECT id, role, content, msg_type, card_data, created_at as timestamp
       FROM chat_messages
       WHERE agent_id = ? AND session_key = ?
       ORDER BY id DESC LIMIT ?`
    ).all(agentId, sessionKey, limit) as PersistedMessage[];
    return rows.reverse();
  }

  getBefore(agentId: string, sessionKey: string, beforeId: number, limit: number): { messages: PersistedMessage[]; hasMore: boolean } {
    const rows = this.db.prepare(
      `SELECT id, role, content, msg_type, card_data, created_at as timestamp
       FROM chat_messages
       WHERE agent_id = ? AND session_key = ? AND id < ?
       ORDER BY id DESC LIMIT ?`
    ).all(agentId, sessionKey, beforeId, limit + 1) as PersistedMessage[];

    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse();
    return { messages, hasMore };
  }

  getLastMessages(agentId: string, sessionKey: string, count: number): Array<{ role: string; timestamp?: string }> {
    return this.db.prepare(
      `SELECT role, created_at as timestamp
       FROM chat_messages
       WHERE agent_id = ? AND session_key = ?
       ORDER BY id DESC LIMIT ?`
    ).all(agentId, sessionKey, count) as Array<{ role: string; timestamp: string }>;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/db/chat.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/db/chat.ts tests/db/chat.test.ts
git commit -m "feat(db): add ChatDb persistence layer for chat messages"
```

---

### Task 5: AgentConnectionPool Core

**Files:**
- Create: `server/ws/pool.ts`
- Test: `tests/ws/pool.test.ts`

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/ws/pool.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import Database from "better-sqlite3";
import { AgentConnectionPool } from "../../server/ws/pool";
import { ChatDb } from "../../server/db/chat";

function waitForMsg(ws: WebSocket): Promise<unknown> {
  return new Promise((resolve) => {
    ws.once("message", (data) => resolve(JSON.parse(data.toString())));
  });
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    ws.once("open", resolve);
  });
}

describe("AgentConnectionPool", () => {
  let server: Server;
  let pool: AgentConnectionPool;
  let port: number;
  let db: Database.Database;
  let chatDb: ChatDb;

  beforeEach(async () => {
    db = new Database(":memory:");
    chatDb = new ChatDb(db);
    chatDb.migrate();

    pool = new AgentConnectionPool({
      chatDb,
      jwtSecret: "test-secret",
      wsToken: "agent-secret-token",
      agentId: "test-agent",
    });

    server = createServer();
    server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url!, `http://localhost`);
      if (url.pathname === "/api/ws/agent") {
        pool.handleAgentUpgrade(req, socket, head);
      } else if (url.pathname === "/api/ws/chat") {
        pool.handleUserUpgrade(req, socket, head);
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterEach(() => {
    pool.shutdown();
    server.close();
    db.close();
  });

  it("accepts agent registration with valid ws_token", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    await waitForOpen(ws);
    ws.send(JSON.stringify({
      type: "register",
      platform: "dashboard",
      capabilities: ["attachments"],
      metadata: { agent_id: "test-agent", token: "agent-secret-token" },
    }));
    const ack = await waitForMsg(ws) as { type: string; ok: boolean };
    expect(ack.type).toBe("register_ack");
    expect(ack.ok).toBe(true);
    expect(pool.isAgentConnected()).toBe(true);
    ws.close();
  });

  it("rejects agent with wrong ws_token", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    await waitForOpen(ws);
    ws.send(JSON.stringify({
      type: "register",
      platform: "dashboard",
      capabilities: [],
      metadata: { agent_id: "test-agent", token: "wrong-token" },
    }));
    const ack = await waitForMsg(ws) as { type: string; ok: boolean; error?: string };
    expect(ack.ok).toBe(false);
    expect(ack.error).toContain("auth");
  });

  it("relays user message to agent and back", async () => {
    // Connect agent
    const agentWs = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    await waitForOpen(agentWs);
    agentWs.send(JSON.stringify({
      type: "register", platform: "dashboard", capabilities: [],
      metadata: { agent_id: "test-agent", token: "agent-secret-token" },
    }));
    await waitForMsg(agentWs); // register_ack

    // Connect user (with JWT)
    const { signJwt } = await import("../../server/ws/auth");
    const token = signJwt({ userId: "user-1", name: "Tester" }, "test-secret", "1h");
    const userWs = new WebSocket(`ws://localhost:${port}/api/ws/chat?agentId=test-agent&sessionId=home&token=${token}`);
    const initFrame = await waitForMsg(userWs) as { type: string; messages: unknown[] };
    expect(initFrame.type).toBe("init");

    // User sends message
    userWs.send(JSON.stringify({ type: "send", content: "hello agent" }));

    // Agent receives bridged message
    const bridgeMsg = await waitForMsg(agentWs) as { type: string; content: string; session_key: string };
    expect(bridgeMsg.type).toBe("message");
    expect(bridgeMsg.content).toBe("hello agent");
    expect(bridgeMsg.session_key).toBe("web:test-agent:user-1:home");

    // Agent replies
    agentWs.send(JSON.stringify({
      type: "reply",
      content: "hello user",
      reply_ctx: bridgeMsg.session_key,
      session_key: bridgeMsg.session_key,
    }));

    // User receives reply
    const reply = await waitForMsg(userWs) as { type: string; content: string };
    expect(reply.type).toBe("message");
    expect(reply.content).toBe("hello user");

    // Verify persistence
    const msgs = chatDb.getRecent("test-agent", "web:test-agent:user-1:home", 50);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[1].role).toBe("assistant");

    agentWs.close();
    userWs.close();
  });

  it("handles streaming (preview_start → reply_stream → stream_end)", async () => {
    // Connect agent
    const agentWs = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    await waitForOpen(agentWs);
    agentWs.send(JSON.stringify({ type: "register", platform: "dashboard", capabilities: [], metadata: { agent_id: "test-agent", token: "agent-secret-token" } }));
    await waitForMsg(agentWs);

    // Connect user
    const { signJwt } = await import("../../server/ws/auth");
    const token = signJwt({ userId: "user-1", name: "T" }, "test-secret", "1h");
    const userWs = new WebSocket(`ws://localhost:${port}/api/ws/chat?agentId=test-agent&sessionId=home&token=${token}`);
    await waitForMsg(userWs); // init

    const sk = "web:test-agent:user-1:home";

    // Agent starts streaming
    agentWs.send(JSON.stringify({ type: "preview_start", ref_id: "ref1", session_key: sk, reply_ctx: sk, content: "He" }));
    const ss = await waitForMsg(userWs) as { type: string; msg_id: string; content: string };
    expect(ss.type).toBe("stream_start");
    expect(ss.content).toBe("He");
    const msgId = ss.msg_id;

    // Get preview_handle from ack
    const ack = await waitForMsg(agentWs) as { type: string; preview_handle: string };
    expect(ack.type).toBe("preview_ack");
    const ph = ack.preview_handle;

    // Agent streams
    agentWs.send(JSON.stringify({ type: "reply_stream", session_key: sk, preview_handle: ph, content: "Hello world" }));
    const chunk = await waitForMsg(userWs) as { type: string; content: string };
    expect(chunk.type).toBe("stream_chunk");
    expect(chunk.content).toBe("Hello world");

    // Agent finalizes
    agentWs.send(JSON.stringify({ type: "update_message", session_key: sk, preview_handle: ph, content: "Hello world!" }));
    const end = await waitForMsg(userWs) as { type: string; content: string };
    expect(end.type).toBe("stream_end");
    expect(end.content).toBe("Hello world!");

    agentWs.close();
    userWs.close();
  });

  it("broadcasts wip_update after user sends", async () => {
    const agentWs = new WebSocket(`ws://localhost:${port}/api/ws/agent`);
    await waitForOpen(agentWs);
    agentWs.send(JSON.stringify({ type: "register", platform: "dashboard", capabilities: [], metadata: { agent_id: "test-agent", token: "agent-secret-token" } }));
    await waitForMsg(agentWs);

    const { signJwt } = await import("../../server/ws/auth");
    const token = signJwt({ userId: "user-1", name: "T" }, "test-secret", "1h");
    const userWs = new WebSocket(`ws://localhost:${port}/api/ws/chat?agentId=test-agent&sessionId=home&token=${token}`);
    await waitForMsg(userWs); // init

    userWs.send(JSON.stringify({ type: "send", content: "test" }));

    // Should get wip_update after send
    const wipMsg = await waitForMsg(userWs) as { type: string; wip: boolean };
    expect(wipMsg.type).toBe("wip_update");
    expect(wipMsg.wip).toBe(true);

    agentWs.close();
    userWs.close();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/ws/pool.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement AgentConnectionPool**

```typescript
// server/ws/pool.ts
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import { randomUUID } from "crypto";
import {
  isBridgeRegister, isBridgeReply, isBridgePreviewStart,
  isBridgeReplyStream, isBridgeUpdateMessage, isBridgeStreamEnd,
  isBridgeCard, isBridgeButtons,
  type BridgeOutgoing, type BridgeRegisterAck, type PersistedMessage,
  type UserInitFrame, type UserMessageFrame,
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
    this.agentWss.handleUpgrade(req, socket, head, (ws) => {
      this.onAgentConnection(ws);
    });
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

      // Send init frame
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
        try {
          const frame = JSON.parse(raw.toString());
          this.onUserMessage(uc, frame);
        } catch { /* ignore malformed */ }
      });

      ws.on("close", () => {
        this.userConns.delete(uc);
      });
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

    const timeout = setTimeout(() => {
      if (!registered) ws.close(4000, "registration timeout");
    }, 10_000);

    ws.on("message", (raw) => {
      try {
        const frame = JSON.parse(raw.toString());

        if (!registered) {
          if (!isBridgeRegister(frame)) {
            ws.close(4000, "expected register");
            return;
          }
          clearTimeout(timeout);
          const token = frame.metadata?.token ?? "";
          if (!verifyWsToken(token, this.config.wsToken)) {
            const ack: BridgeRegisterAck = { type: "register_ack", ok: false, error: "auth: invalid ws_token" };
            ws.send(JSON.stringify(ack));
            ws.close(4001, "auth failed");
            return;
          }
          registered = true;
          if (this.agentConn) this.agentConn.ws.close();
          this.agentConn = { agentId: this.config.agentId, ws, connectedAt: Date.now(), capabilities: frame.capabilities };
          const ack: BridgeRegisterAck = { type: "register_ack", ok: true, max_active_sessions: 6 };
          ws.send(JSON.stringify(ack));
          this.broadcastStatus(true);
          return;
        }

        this.onAgentMessage(frame);
      } catch { /* ignore */ }
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      if (this.agentConn?.ws === ws) {
        this.agentConn = null;
        this.broadcastStatus(false);
      }
    });
  }

  private onAgentMessage(frame: unknown): void {
    if (isBridgeReply(frame)) {
      const id = this.config.chatDb.insert(this.config.agentId, frame.session_key, "assistant", frame.content, "text");
      const msg: UserMessageFrame = {
        type: "message", id, role: "assistant", content: frame.content,
        msg_type: "text", timestamp: new Date().toISOString(),
      };
      this.broadcastToUsers(frame.session_key, msg);
      this.broadcastWip(frame.session_key);
    } else if (isBridgePreviewStart(frame)) {
      const handle = randomUUID();
      this.activeStreams.set(handle, {
        agentId: this.config.agentId, sessionKey: frame.session_key,
        previewHandle: handle, content: frame.content, startedAt: Date.now(),
      });
      // Ack to agent with handle
      this.agentConn?.ws.send(JSON.stringify({ type: "preview_ack", ref_id: frame.ref_id, preview_handle: handle }));
      // Broadcast stream_start to users
      this.broadcastToUsers(frame.session_key, { type: "stream_start", msg_id: handle, content: frame.content });
    } else if (isBridgeReplyStream(frame)) {
      const stream = this.activeStreams.get(frame.preview_handle);
      if (stream) {
        stream.content = frame.content;
        this.broadcastToUsers(stream.sessionKey, { type: "stream_chunk", msg_id: frame.preview_handle, content: frame.content });
      }
    } else if (isBridgeUpdateMessage(frame)) {
      const stream = this.activeStreams.get(frame.preview_handle);
      if (stream) {
        this.config.chatDb.insert(this.config.agentId, stream.sessionKey, "assistant", frame.content, "text");
        this.broadcastToUsers(stream.sessionKey, { type: "stream_end", msg_id: frame.preview_handle, content: frame.content });
        this.activeStreams.delete(frame.preview_handle);
        this.broadcastWip(stream.sessionKey);
      }
    } else if (isBridgeStreamEnd(frame)) {
      const stream = this.activeStreams.get(frame.preview_handle);
      if (stream) {
        if (stream.content) {
          this.config.chatDb.insert(this.config.agentId, stream.sessionKey, "assistant", stream.content, "text");
        }
        this.broadcastToUsers(stream.sessionKey, { type: "stream_end", msg_id: frame.preview_handle, content: stream.content });
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
      // Persist user message BEFORE forwarding (prevents dedup race)
      const id = this.config.chatDb.insert(this.config.agentId, uc.sessionKey, "user", frame.content, "text");

      // Echo back to user
      const echo: UserMessageFrame = {
        type: "message", id, role: "user", content: frame.content,
        msg_type: "text", timestamp: new Date().toISOString(),
      };
      uc.ws.send(JSON.stringify(echo));

      // Forward to agent
      if (this.agentConn && this.agentConn.ws.readyState === WebSocket.OPEN) {
        const bridge: BridgeOutgoing = {
          type: "message",
          msg_id: String(id),
          session_key: uc.sessionKey,
          user_id: uc.userId,
          user_name: uc.userName,
          org: "",
          content: frame.content,
          reply_ctx: uc.sessionKey,
          attachments: frame.attachments as any,
        };
        this.agentConn.ws.send(JSON.stringify(bridge));
      }

      // Broadcast wip=true
      this.broadcastToUsers(uc.sessionKey, { type: "wip_update", wip: true, session_key: uc.sessionKey });
    } else if (frame.type === "load_more" && typeof frame.before === "number") {
      const page = this.config.chatDb.getBefore(this.config.agentId, uc.sessionKey, frame.before, 50);
      uc.ws.send(JSON.stringify({ type: "history", messages: page.messages, hasMore: page.hasMore }));
    } else if (frame.type === "card_action" && typeof frame.action === "string") {
      if (this.agentConn && this.agentConn.ws.readyState === WebSocket.OPEN) {
        this.agentConn.ws.send(JSON.stringify({
          type: "card_action", session_key: uc.sessionKey, action: frame.action, reply_ctx: uc.sessionKey,
        }));
      }
    }
  }

  private broadcastToUsers(sessionKey: string, msg: object): void {
    const payload = JSON.stringify(msg);
    for (const uc of this.userConns) {
      if (uc.sessionKey === sessionKey && uc.ws.readyState === WebSocket.OPEN) {
        uc.ws.send(payload);
      }
    }
  }

  private broadcastStatus(connected: boolean): void {
    const payload = JSON.stringify({ type: "status", connected });
    for (const uc of this.userConns) {
      if (uc.ws.readyState === WebSocket.OPEN) uc.ws.send(payload);
    }
  }

  private broadcastWip(sessionKey: string): void {
    const lastMsgs = this.config.chatDb.getLastMessages(this.config.agentId, sessionKey, 1);
    const wip = computeWip(lastMsgs, this.isAgentConnected(), Date.now());
    this.broadcastToUsers(sessionKey, { type: "wip_update", wip, session_key: sessionKey });
  }

  private getInFlightForSession(sessionKey: string): unknown[] {
    const streams: unknown[] = [];
    for (const [handle, state] of this.activeStreams) {
      if (state.sessionKey === sessionKey) {
        streams.push({ msg_id: handle, content: state.content });
      }
    }
    return streams;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/ws/pool.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add server/ws/pool.ts tests/ws/pool.test.ts
git commit -m "feat(ws): implement AgentConnectionPool relay core"
```

---

### Task 6: Wire WSS into Express Server

**Files:**
- Modify: `server/index.ts`
- Test: `tests/ws/integration.test.ts`

- [ ] **Step 1: Write integration test that starts the full server**

```typescript
// tests/ws/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import { signJwt } from "../../server/ws/auth";
import { spawn, type ChildProcess } from "child_process";

// Start the real server for integration testing
let serverProc: ChildProcess;
const PORT = 3099;

function waitMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function connectWs(path: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}${path}`);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

function waitForMsg(ws: WebSocket): Promise<unknown> {
  return new Promise((resolve) => {
    ws.once("message", (d) => resolve(JSON.parse(d.toString())));
  });
}

describe("WSS integration (full server)", () => {
  beforeAll(async () => {
    serverProc = spawn("npx", ["tsx", "server/index.ts"], {
      env: { ...process.env, PORT: String(PORT), JWT_SECRET: "int-test-secret", WS_TOKEN: "int-test-ws-token", AGENT_ID: "int-test-agent" },
      stdio: "pipe",
    });
    await waitMs(2000); // Wait for server to start
  });

  afterAll(() => {
    serverProc.kill("SIGTERM");
  });

  it("health check works", async () => {
    const res = await fetch(`http://localhost:${PORT}/api/health`);
    expect(res.ok).toBe(true);
  });

  it("full chat round-trip: user → agent → user", async () => {
    // Agent connects
    const agentWs = await connectWs("/api/ws/agent");
    agentWs.send(JSON.stringify({
      type: "register", platform: "dashboard", capabilities: [],
      metadata: { agent_id: "int-test-agent", token: "int-test-ws-token" },
    }));
    const ack = await waitForMsg(agentWs) as any;
    expect(ack.ok).toBe(true);

    // User connects
    const token = signJwt({ userId: "u1", name: "Tester" }, "int-test-secret", "1h");
    const userWs = await connectWs(`/api/ws/chat?agentId=int-test-agent&sessionId=home&token=${token}`);
    const init = await waitForMsg(userWs) as any;
    expect(init.type).toBe("init");
    expect(init.connected).toBe(true);

    // Send message
    userWs.send(JSON.stringify({ type: "send", content: "integration test" }));
    const echo = await waitForMsg(userWs); // echo
    const wipUpdate = await waitForMsg(userWs); // wip_update

    // Agent sees it
    const bridge = await waitForMsg(agentWs) as any;
    expect(bridge.content).toBe("integration test");

    // Agent replies
    agentWs.send(JSON.stringify({
      type: "reply", content: "got it", reply_ctx: bridge.session_key, session_key: bridge.session_key,
    }));

    const reply = await waitForMsg(userWs) as any;
    expect(reply.type).toBe("message");
    expect(reply.content).toBe("got it");
    expect(reply.role).toBe("assistant");

    agentWs.close();
    userWs.close();
  });
});
```

- [ ] **Step 2: Modify server/index.ts to add WS upgrade**

```typescript
// server/index.ts — ADD these lines (keep existing code)
import { createServer } from "http";
import { AgentConnectionPool } from "./ws/pool";
import { ChatDb } from "./db/chat";

// Replace: app.listen(PORT, ...) with:
const httpServer = createServer(app);

// Initialize chat DB
const chatDb = new ChatDb(getDb());
chatDb.migrate();

// Initialize WS pool
const pool = new AgentConnectionPool({
  chatDb,
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-prod",
  wsToken: process.env.WS_TOKEN ?? "dev-ws-token-change-in-prod",
  agentId: process.env.AGENT_ID ?? "lumii-goldenyears",
});

// WS upgrade handler
httpServer.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url!, `http://localhost`);
  if (url.pathname === "/api/ws/agent") {
    pool.handleAgentUpgrade(req, socket, head);
  } else if (url.pathname === "/api/ws/chat") {
    pool.handleUserUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] Lumii Fieldwork API running on http://0.0.0.0:${PORT}`);
});

// Update shutdown handlers
process.on("SIGINT", () => { pool.shutdown(); closeDb(); process.exit(0); });
process.on("SIGTERM", () => { pool.shutdown(); closeDb(); process.exit(0); });
```

- [ ] **Step 3: Run integration test**

Run: `npx vitest run tests/ws/integration.test.ts --timeout 15000`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/index.ts tests/ws/integration.test.ts
git commit -m "feat(ws): wire AgentConnectionPool into Express server with WS upgrade"
```

---

### Task 7: GY_API_TOKEN Middleware

**Files:**
- Create: `server/middleware/gy-token.ts`
- Test: `tests/middleware/gy-token.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/middleware/gy-token.test.ts
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { gyTokenMiddleware } from "../../server/middleware/gy-token";
import { signGyToken } from "../../server/ws/auth";

const GY_SECRET = "test-gy-secret";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/protected", gyTokenMiddleware(GY_SECRET));
  app.get("/api/protected/test", (req, res) => {
    res.json({ actor: (req as any).gyActor });
  });
  return app;
}

describe("gyTokenMiddleware", () => {
  it("passes with valid token", async () => {
    const app = createApp();
    const token = signGyToken({ sub: "u1", role: "op", siteIds: ["s1"], scope: "home", permissions: {} }, GY_SECRET);
    const res = await request(app).get("/api/protected/test").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.actor.sub).toBe("u1");
  });

  it("rejects missing Authorization header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/protected/test");
    expect(res.status).toBe(401);
  });

  it("rejects invalid token", async () => {
    const app = createApp();
    const res = await request(app).get("/api/protected/test").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });

  it("rejects token signed with wrong secret", async () => {
    const app = createApp();
    const token = signGyToken({ sub: "u1", role: "op", siteIds: [], scope: "home", permissions: {} }, "wrong-secret");
    const res = await request(app).get("/api/protected/test").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Install supertest**

```bash
npm install -D supertest @types/supertest
```

- [ ] **Step 3: Implement middleware**

```typescript
// server/middleware/gy-token.ts
import type { Request, Response, NextFunction } from "express";
import { verifyGyToken, type GyTokenPayload } from "../ws/auth";

declare global {
  namespace Express {
    interface Request {
      gyActor?: GyTokenPayload;
    }
  }
}

export function gyTokenMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "missing Authorization header" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyGyToken(token, secret);
    if (!payload) {
      res.status(401).json({ error: "invalid or expired token" });
      return;
    }

    req.gyActor = payload;
    next();
  };
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run tests/middleware/gy-token.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/middleware/gy-token.ts tests/middleware/gy-token.test.ts package.json package-lock.json
git commit -m "feat(auth): add GY_API_TOKEN validation middleware"
```

---

## Phase 2-5 Summary (Subsequent Plans)

Due to the scope of this project, Phases 2-5 will be detailed in separate plan documents after P1 is complete and validated:

### Phase 2: goldenyears-agent Go Sidecar
**Plan:** `docs/superpowers/plans/2026-05-16-p2-agent-sidecar.md`
- Go project scaffold with chi HTTP framework
- scope_check hook implementation + tests
- prepare_session hook + GY_API_TOKEN signing
- after_send hook (audit)
- Orchestrator skill prompt.md + 15 sub-skills
- Integration tests with mock lak requests

### Phase 3: Home Chat UI
**Plan:** `docs/superpowers/plans/2026-05-16-p3-home-chat-ui.md`
- useAgentChat hook (adapted from lumii-dashboard)
- ChatStream component (messages, streaming, cards)
- CommandInput component (send, attachments)
- HomeArea refactor (replace static → live WS)
- WS pool for session management
- Unit tests with mock WS server
- Visual tests (responsive, bubble rendering)

### Phase 4: Tab Copilot
**Plan:** `docs/superpowers/plans/2026-05-16-p4-tab-copilot.md`
- CopilotDrawer component
- FAB trigger button
- Integration into all 5 Area components
- Session per-tab isolation
- Responsive (desktop drawer vs mobile bottom sheet)

### Phase 5: lak Config + E2E
**Plan:** `docs/superpowers/plans/2026-05-16-p5-lak-e2e.md`
- Fresh lak instance setup (config.toml at `/tmp/lak-fieldwork-test/`)
- E2E test infrastructure (Playwright + lak + agent + API)
- Full user scenarios:
  - Home chat: query service records
  - Home chat: create social worker
  - Home chat: review service record
  - Tab copilot: query from within tab
  - Tab copilot: CRUD from within tab
  - Streaming response rendering
  - Error handling (agent offline, timeout)
  - Attachment upload + AI processing
- Teardown: kill test lak instance, clean data dir

---

## Dependency Graph

```
P1 (WSS Relay) ← foundation
  └→ P2 (Agent Sidecar) ← independent Go project, tests with curl
  └→ P3 (Home Chat UI) ← needs WSS server running
       └→ P4 (Tab Copilot) ← reuses P3 hook
            └→ P5 (E2E) ← needs all components running
```
