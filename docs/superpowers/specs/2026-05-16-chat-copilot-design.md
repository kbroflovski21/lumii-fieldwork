# GoldenYears 聊天 & Copilot 技术设计

**日期：** 2026-05-16
**状态：** Draft
**范围：** 首页聊天 + Tab Copilot + WSS Relay + Agent Sidecar + Orchestrator Skill

## 1. 目标

实现完整的 AI 聊天链路，覆盖：

1. **首页聊天**：全功能对话界面，可通过自然语言操作所有业务模块数据
2. **Tab Copilot**：每个业务 tab 页右侧抽屉聊天面板，操作当前页面数据（也可跨模块）
3. **Agent 能力**：通过 CC session + orchestrator skill 完成 5 个模块的完整 CRUD + 业务操作

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    前端 (goldenyears-web, 浏览器)                    │
│                                                                     │
│  HomeArea (首页聊天)          TabCopilot (右侧抽屉)                  │
│  └ useAgentChat hook ────────┘                                      │
│       │ WSS /api/ws/chat?agentId=xxx (JWT auth)                     │
│       │ send: { type:"send", content, attachments?, scope }         │
│       │ recv: stream_start/stream_chunk/stream_end/message/card     │
└───────┼─────────────────────────────────────────────────────────────┘
        │ WSS (公网)
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ goldenyears-api (Express, 公网服务器, port 3001)                     │
│                                                                      │
│  AgentConnectionPool (改造自 lumii-dashboard agent-ws.ts)            │
│    ├ /api/ws/chat   ← 前端浏览器连接 (JWT auth)                      │
│    ├ /api/ws/agent  ← lak 主动连入 (ws_token auth)                   │
│    ├ 消息持久化 → SQLite chat_messages 表                             │
│    ├ 消息路由: browser ↔ agent (by agentId + sessionKey)             │
│    ├ 流式转发: preview_start → reply_stream → stream_end             │
│    ├ WIP 信号计算 + 广播                                              │
│    └ 文件暂存: POST /api/agents/:id/files/upload?staging=1           │
│                                                                      │
│  现有 REST CRUD 端点 (/api/social-workers, /api/smart-badges, ...)   │
│    ← CC session 内 orchestrator skill 通过 curl 调用                 │
└──────────────────────────────────────────────────────────────────────┘
        ▲ WSS (lak 主动连入，因 lak 在内网不可被公网访问)
        │
┌──────────────────────────────────────────────────────────────────────┐
│ lak (Go daemon, 内网服务器)                                          │
│                                                                      │
│  config.toml                                                         │
│    project: lumii-goldenyears                                        │
│    agent: type=claudecode, work_dir=/path/to/goldenyears-agent       │
│    platforms:                                                        │
│      - type: dashboard                                               │
│        url: wss://公网地址/api/ws/agent                               │
│        agent_id: lumii-goldenyears                                   │
│      - type: http-forward                                            │
│        url: http://127.0.0.1:4072/ingest                             │
│        accept_passive: true                                          │
│                                                                      │
│  session lifecycle:                                                  │
│    scope_check → prepare_session → CC session → after_send           │
└──────┬───────────────────────────────────────────────────────────────┘
       │ HTTP localhost
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ goldenyears-agent (Go sidecar, 与 lak 同一台内网服务器, port 4072)    │
│                                                                      │
│  HTTP 端点:                                                          │
│    POST /hooks/scope-check        ← 角色权限校验                     │
│    POST /hooks/prepare-session    ← 构建 CC 上下文 + 签发 token       │
│    POST /hooks/after-send         ← 审计日志（可选）                  │
│    POST /auth/session-token       ← 签发 scoped API JWT              │
│    GET  /health                   ← 健康检查                         │
│                                                                      │
│  数据:                                                               │
│    SQLite: 角色映射 + 审计日志                                        │
│                                                                      │
│  Skills:                                                             │
│    skills/goldenyears-orchestrator/                                   │
│      prompt.md + sub-skills/*.md                                     │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. 消息流向

### 3.1 用户发送消息

```
1. 用户在首页/Tab Copilot 输入"查看今天有哪些待复核的服务记录"
2. 前端 useAgentChat:
   a. 乐观渲染用户气泡（立即显示）
   b. 如有附件: POST /api/agents/{id}/files/upload?staging=1
   c. WSS send: { type:"send", content:"...", scope:"home", attachments?:[...] }
3. goldenyears-api AgentConnectionPool:
   a. 持久化用户消息到 chat_messages (role=user)
   b. 通过 agent WSS 转发 BridgeOutgoingMessage 给 lak
4. lak 收到消息:
   a. http-forward → agent sidecar POST /hooks/scope-check
   b. scope_check 返回 { allow:true, role:"site_operator", siteIds:[...] }
   c. POST /hooks/prepare-session → 返回 system_prompt_fragment + env vars
   d. 启动/恢复 CC session（注入 env: GY_API_TOKEN, GY_API_BASE, GY_SCOPE, ...）
5. CC session (orchestrator skill):
   a. 加载 prompt.md + 相关 sub-skill
   b. 识别意图 → /lumii-record-query
   c. curl -H "Authorization: Bearer $GY_API_TOKEN" "$GY_API_BASE/api/service-records?reviewStatus=needs_review&dateFrom=2026-05-16"
   d. 格式化查询结果
6. CC session 回复（流式）:
   a. lak 发送 preview_start → reply_stream × N → update_message/stream_end
   b. goldenyears-api 持久化最终 assistant 消息
   c. goldenyears-api 广播 stream_start/stream_chunk/stream_end 到前端
7. 前端 useAgentChat:
   a. stream_start → 创建 AI 气泡（空）
   b. stream_chunk → 逐步填充文本（打字效果）
   c. stream_end → 标记完成，wip=false
```

### 3.2 危险操作确认

```
1. 用户: "归档服务人员王丽"
2. AI: 发送 buttons 卡片 "确认归档服务人员「王丽」？此操作不可撤销。" [确认] [取消]
3. 用户点击 [确认]
4. 前端: sendCardAction(msgId, "confirm")
5. CC session: curl POST /api/social-workers/{id}/archive
6. AI: "已归档服务人员「王丽」"
```

## 4. Session Key 设计

```
格式: {platform}:{agentId}:{userId}:{scope}

Web 端:
  web:lumii-goldenyears:user-123:home              ← 首页聊天
  web:lumii-goldenyears:user-123:social_workers    ← 服务人员 tab copilot
  web:lumii-goldenyears:user-123:smart_badges      ← 设备 tab copilot
  web:lumii-goldenyears:user-123:service_objects   ← 服务对象 tab copilot
  web:lumii-goldenyears:user-123:service_schedules ← 服务排期 tab copilot
  web:lumii-goldenyears:user-123:service_records   ← 服务记录 tab copilot

未来飞书端:
  feishu:lumii-goldenyears:user-456:home
  feishu:lumii-goldenyears:user-456:{workAreaId}

Scope 提取:
  scope = sessionKey.split(":").pop()  // "home" | workAreaId
```

## 5. 权限控制

### 5.1 三层防护

```
Layer 1: scope_check (goldenyears-agent)
  输入: { actor_id, session_key, platform }
  查询: 角色映射表 (agent SQLite)
  输出: { allow: true, role, siteIds } 或 { allow: false, reason }
  效果: deny → lak 静默丢弃消息

Layer 2: prepare_session (goldenyears-agent)
  输入: { actor_id, role, scope, siteIds }
  动作:
    1. 根据 role + scope 构建 system prompt 片段
    2. 签发 GY_API_TOKEN (scoped JWT)
    3. 返回 env vars 注入 CC session
  输出: { system_prompt_fragment, env: { GY_API_TOKEN, GY_API_BASE, GY_SCOPE, ... } }

Layer 3: goldenyears-api (REST 端点)
  每个请求: Authorization: Bearer <GY_API_TOKEN>
  校验: JWT 签名 + 过期 + siteIds 数据范围过滤
  效果: 即使 prompt injection 让 CC 尝试越权，API 层拒绝
```

### 5.2 GY_API_TOKEN

```
签发方: goldenyears-agent POST /auth/session-token
算法: HS256
密钥: agent 与 api 共享的 GY_TOKEN_SECRET
有效期: 30 分钟

Payload:
{
  "sub": "user-123",              // actor_id
  "role": "site_operator",        // 角色
  "siteIds": ["site-001"],        // 可访问站点（数据过滤）
  "scope": "home",                // 当前 scope（仅用于 AI 行为提示，不限制端点）
  "permissions": {                // 按 role 决定，所有 scope 共享
    "social_workers": ["read", "write", "archive"],
    "smart_badges": ["read", "write", "activate"],
    "service_objects": ["read", "write", "archive"],
    "service_schedules": ["read", "write"],
    "service_records": ["read", "review", "export"]
  },
  "iat": 1747353600,
  "exp": 1747355400
}
```

**scope 行为说明：** scope 不限制 API 端点访问。所有 scope 下 agent 都能操作全部模块。scope 仅影响 AI 的默认关注点——service_records scope 下 AI 优先理解为操作记录，但用户可随时明确指定操作其他模块。

### 5.3 turn_proof

```
签发方: lak（启动 CC session 时生成）
注入: CC session 环境变量 CC_TURN_PROOF
格式: 签名 JWT

Payload:
{
  "session_key": "web:lumii-goldenyears:user-123:home",
  "actor_id": "user-123",
  "scope": "home",
  "msg_id": "msg-456",
  "observed_at": "2026-05-16T10:30:00Z"
}

用途: CC session 调用 agent sidecar 端点时携带，agent 验证签名确认请求合法。
当前实现: 初期简化，agent 端点仅校验 turn_proof 签名有效性，不做复杂逻辑。
```

## 6. goldenyears-agent 详细设计

### 6.1 技术栈

- 语言: Go
- HTTP 框架: net/http (标准库) 或 chi
- 数据库: SQLite (go-sqlite3)
- JWT: golang-jwt/jwt/v5
- 配置: TOML 或环境变量

### 6.2 目录结构

```
lumii-goldenyears-agent/
├── cmd/
│   └── agent/
│       └── main.go                    # 入口，启动 HTTP server
├── internal/
│   ├── hooks/
│   │   ├── scope_check.go            # scope_check hook 实现
│   │   ├── prepare_session.go        # prepare_session hook 实现
│   │   └── after_send.go             # after_send hook（审计）
│   ├── auth/
│   │   ├── token.go                  # GY_API_TOKEN 签发
│   │   └── turnproof.go             # turn_proof 校验
│   ├── roles/
│   │   └── resolver.go              # actor_id → role 映射
│   └── db/
│       └── sqlite.go                 # SQLite 初始化 + 查询
├── skills/
│   └── goldenyears-orchestrator/
│       ├── prompt.md                  # 主 prompt
│       └── sub-skills/
│           ├── lumii-worker-query.md
│           ├── lumii-worker-create.md
│           ├── lumii-worker-update.md
│           ├── lumii-badge-query.md
│           ├── lumii-badge-activate.md
│           ├── lumii-badge-update.md
│           ├── lumii-object-query.md
│           ├── lumii-object-create.md
│           ├── lumii-object-update.md
│           ├── lumii-schedule-query.md
│           ├── lumii-schedule-create.md
│           ├── lumii-schedule-adjust.md
│           ├── lumii-record-query.md
│           ├── lumii-record-review.md
│           └── lumii-record-export.md
├── config/
│   └── config.toml                   # agent 配置
├── go.mod
├── go.sum
└── deploy/
    └── goldenyears-agent.service     # systemd unit
```

### 6.3 Hook 端点详细

#### POST /hooks/scope-check

```go
// Request (from lak)
{
  "actor_id": "user-123",
  "session_key": "web:lumii-goldenyears:user-123:home",
  "platform": "dashboard",
  "chat_type": "web"
}

// Response: allow
{
  "allow": true,
  "role": "site_operator",
  "site_ids": ["site-001"],
  "actor_name": "张运营"
}

// Response: deny
{
  "allow": false,
  "reason": "actor not registered"
}
```

#### POST /hooks/prepare-session

```go
// Request (from lak)
{
  "actor_id": "user-123",
  "role": "site_operator",
  "site_ids": ["site-001"],
  "session_key": "web:lumii-goldenyears:user-123:service_records",
  "platform": "dashboard"
}

// Response
{
  "system_prompt_fragment": "你是 GoldenYears 站点运营助手...\n当前 scope: service_records\n...",
  "env": {
    "GY_API_TOKEN": "eyJhbGciOiJIUzI1NiJ9...",
    "GY_API_BASE": "https://fieldwork.example.com/api",
    "GY_SCOPE": "service_records",
    "GY_ACTOR_ID": "user-123",
    "GY_SITE_IDS": "site-001"
  }
}
```

#### POST /auth/session-token

```go
// Request (internal, from prepare-session)
{
  "actor_id": "user-123",
  "role": "site_operator",
  "site_ids": ["site-001"],
  "scope": "service_records"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "expires_at": "2026-05-16T11:00:00Z"
}
```

### 6.4 角色映射

初期使用 SQLite 存储角色映射表：

```sql
CREATE TABLE actor_roles (
  actor_id TEXT PRIMARY KEY,
  role TEXT NOT NULL,          -- site_operator | service_supervisor | family
  site_ids TEXT NOT NULL,      -- JSON array: ["site-001"]
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

后期可改为从 goldenyears-api `/auth/resolve-role` 端点动态查询。

## 7. goldenyears-api WSS Relay 设计

### 7.1 改造范围

从 lumii-dashboard 的 `src/lib/agent-ws.ts` 移植并简化：

| lumii-dashboard 功能 | goldenyears-api 处理 |
|---------------------|---------------------|
| AgentConnectionPool | **保留**，改造为 Express 中间件 |
| 用户连接管理 (handleUserUpgrade) | **保留**，JWT auth |
| Agent 连接管理 (handleAgentUpgrade) | **保留**，ws_token auth |
| 消息路由 (broadcastToUsers) | **保留** |
| 流式转发 (activeStreams) | **保留** |
| WIP 计算 (computeWip) | **保留** |
| 消息持久化 (chat_messages) | **保留** |
| 文件暂存上传 | **保留** |
| Next.js 路由 | **去掉**（Express 直接处理） |
| 多 agent 支持 | **简化**（单 agent: lumii-goldenyears） |
| Relay token / VSCode | **去掉** |

### 7.2 新增文件

```
server/
├── ws/
│   ├── agent-pool.ts          # AgentConnectionPool（改造自 lumii-dashboard）
│   ├── protocol.ts            # 消息类型定义（Bridge protocol）
│   ├── wip.ts                 # computeWip 函数
│   └── auth.ts                # JWT 验证 + ws_token 验证
├── routes/
│   ├── ... (现有 CRUD 路由)
│   └── chat.ts                # HTTP fallback: GET/POST /api/agents/:id/chat
├── db/
│   ├── init.ts                # 现有
│   ├── seed.ts                # 现有
│   └── chat-schema.ts         # chat_messages 表 schema
└── middleware/
    └── gy-token.ts            # GY_API_TOKEN 校验中间件
```

### 7.3 chat_messages 表

```sql
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  session_key TEXT NOT NULL,
  role TEXT NOT NULL,            -- 'user' | 'assistant'
  content TEXT NOT NULL,
  msg_type TEXT DEFAULT 'text',  -- 'text' | 'card' | 'buttons'
  card_data TEXT,                -- JSON: attachments, card payload
  created_at TEXT DEFAULT (datetime('now')),
  working_dir TEXT
);

CREATE INDEX idx_chat_agent_session ON chat_messages(agent_id, session_key, id DESC);
```

### 7.4 WebSocket 端点

```
GET /api/ws/chat?agentId=lumii-goldenyears&sessionId=home
  → JWT auth (cookie 'session' 或 query param 'token')
  → 返回 init 帧: { type:"init", connected, messages[], wip, capabilities }

GET /api/ws/agent
  → Agent register 帧: { type:"register", metadata:{ agent_id, token } }
  → 返回 register_ack 帧
```

### 7.5 GY_API_TOKEN 校验中间件

```typescript
// server/middleware/gy-token.ts
// 校验 CC session 通过 curl 调用 API 时携带的 token
// 从 Authorization: Bearer <token> 解析
// 验证签名、过期时间
// 将 decoded payload 附加到 req.gyActor
// 按 siteIds 过滤数据范围
```

## 8. Orchestrator Skill 设计

### 8.1 主 prompt.md

```markdown
# GoldenYears 站点运营助手

你是 GoldenYears 站点运营助手，帮助运营人员通过自然语言管理服务数据。

## 身份信息

- 操作者: $GY_ACTOR_ID
- 角色: (由 prepare_session 动态注入)
- 当前 scope: $GY_SCOPE
- 可访问站点: $GY_SITE_IDS

## 行为准则

1. 所有 API 调用必须携带: Authorization: Bearer $GY_API_TOKEN
2. API 基地址: $GY_API_BASE
3. scope 是默认关注点，不是限制——用户可以操作任何模块
4. 危险操作（归档、取消、停用）必须先确认再执行
5. 查询结果用结构化格式呈现（表格/列表），重要字段加粗
6. 所有输出用中文
7. 错误翻译为用户友好的中文说明

## 可用 Sub-skills

| 意图关键词 | Sub-skill | 说明 |
|-----------|-----------|------|
| 查服务人员/找人 | /lumii-worker-query | 搜索、筛选、查看详情 |
| 新增/添加人员 | /lumii-worker-create | 创建新人员档案 |
| 修改/归档人员 | /lumii-worker-update | 修改信息、更新工牌、归档 |
| 查设备/工牌 | /lumii-badge-query | 搜索、查看状态和健康 |
| 激活工牌 | /lumii-badge-activate | 激活新设备 |
| 更新设备/停用/丢失 | /lumii-badge-update | 更新状态、指定人员 |
| 查服务对象/老人 | /lumii-object-query | 搜索、查看档案 |
| 新增服务对象 | /lumii-object-create | 创建新档案 |
| 修改/归档服务对象 | /lumii-object-update | 更新信息、归档 |
| 查排期/日程/今天 | /lumii-schedule-query | 查看排期（支持日期范围） |
| 安排服务/创建排期 | /lumii-schedule-create | 创建按次服务 |
| 调整/取消排期 | /lumii-schedule-adjust | 改时间、改人员、取消 |
| 查服务记录 | /lumii-record-query | 查看记录详情和统计 |
| 复核/确认 | /lumii-record-review | 复核通过操作 |
| 导出 | /lumii-record-export | 导出凭证包 |

## 执行流程

1. 理解用户意图
2. 匹配对应的 sub-skill
3. 从用户输入提取参数（日期、姓名、状态等）
4. 执行 curl 调用
5. 格式化结果为易读的中文回复
6. 如果结果太长，只展示摘要 + 总数，询问是否需要详情
```

### 8.2 Sub-skill 示例

#### skills/goldenyears-orchestrator/sub-skills/lumii-record-query.md

```markdown
# /lumii-record-query

查询服务记录列表或单条详情。

## 参数提取

从用户输入中提取:
- dateFrom/dateTo: 日期范围（"今天"→当天，"本周"→周一到今天，"昨天"→昨天）
- reviewStatus: 复核状态（"待复核"→needs_review，"已确认"→confirmed）
- exportStatus: 导出状态（"可导出"→exportable，"已导出"→exported）
- socialWorkerId: 服务人员（需先用 /lumii-worker-query 查 ID）
- serviceObjectId: 服务对象（需先用 /lumii-object-query 查 ID）
- search: 关键词搜索
- id: 单条详情

## 执行

列表查询:
curl -s -H "Authorization: Bearer $GY_API_TOKEN" \
  "$GY_API_BASE/api/service-records?dateFrom={dateFrom}&dateTo={dateTo}&reviewStatus={reviewStatus}"

单条详情:
curl -s -H "Authorization: Bearer $GY_API_TOKEN" \
  "$GY_API_BASE/api/service-records/{id}"

## 输出格式

列表（≤10条）:
| # | 日期 | 服务对象 | 服务项目 | 人员 | 时长 | 复核状态 |
|---|------|---------|---------|------|------|---------|
| 1 | 05-16 | 陈阿姨 | 助餐 | 王丽 | 45min | 待复核 |

列表（>10条）:
共 {total} 条记录，显示前 10 条:
[表格]
需要查看更多？可以缩小范围（如指定日期或人员）

详情:
**服务记录详情**
- 日期: {serviceDate} {startTime}-{endTime}（{durationMinutes}分钟）
- 服务对象: {serviceObjectName}
- 服务人员: {socialWorkerName}
- 服务项目: {serviceProject}
- 复核状态: {reviewStatus}
- 流程规范: {process完成数}/{process总数} 通过
- 服务内容: {business完成数}/{business总数} 完成
- GPS: {addressMatched ? "已匹配" : "需核实"}
```

#### skills/goldenyears-orchestrator/sub-skills/lumii-record-review.md

```markdown
# /lumii-record-review

复核服务记录（确认归属）。

## 前置条件

- 记录 reviewStatus 必须为 needs_review 或 info_incomplete
- 已 confirmed 的记录不能重复复核

## 参数提取

- id: 服务记录 ID（必须，从上下文中获取或用户指定）
- action: "confirm_assignment"（复核通过）

## 执行

**必须先确认**:
提示用户: "确认复核通过服务记录「{serviceProject} · {serviceObjectName}」({serviceDate})？"
等待用户确认。

确认后执行:
curl -s -X PATCH -H "Authorization: Bearer $GY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"confirm_assignment"}' \
  "$GY_API_BASE/api/service-records/{id}/review"

## 输出格式

成功: "已复核通过: {serviceProject} · {serviceObjectName}（{serviceDate}）"
失败: 翻译错误信息（如 "该记录已被确认，无需重复操作"）
```

## 9. 前端设计

### 9.1 useAgentChat Hook

从 lumii-dashboard `packages/ui/src/hooks/useAgentChat.ts` 改造：

```typescript
interface UseAgentChatOptions {
  agentId: string;
  sessionId: string;        // "home" | workAreaId
  token?: string;           // JWT，默认从 cookie 读取
  onWorkspaces?: (paths: string[]) => void;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  msgType: "text" | "card" | "buttons";
  cardData?: unknown;
  timestamp: string;
  isStreaming?: boolean;
  sendStatus?: "sending" | "sent" | "failed";
  attachments?: ChatAttachment[];
}

interface UseAgentChatReturn {
  messages: ChatMessage[];
  connected: boolean;       // agent VM 在线状态
  sending: boolean;         // 发送中
  wip: boolean;             // agent 正在处理
  handleSend: (content: string, attachments?: File[]) => void;
  sendCardAction: (msgId: string, action: string) => void;
  loadMore: () => void;
  hasMore: boolean;
  containerRef: RefObject<HTMLDivElement>;
  endRef: RefObject<HTMLDivElement>;
  showScrollDown: boolean;
  scrollToBottom: () => void;
}
```

**保留的 lumii-dashboard 特性：**
- WS pool（最多 6 个，60s idle TTL）
- 乐观 UI（用户消息立即显示）
- 流式渲染（stream_start/chunk/end）
- WIP 信号（server-authoritative）
- 附件上传（staging → send）
- 自动滚动 + 手动滚动检测
- 5s 健康检查重连
- 历史消息分页 (load_more)

**去掉的 lumii-dashboard 特性：**
- skill_list 相关逻辑
- relay token（VSCode 专用）
- 多 agent 切换

**新增：**
- scope 字段（发消息时携带 sessionId 作为 scope 标识）

### 9.2 首页聊天（HomeArea 改造）

```typescript
function HomeArea({ data, onRoute }) {
  const { messages, connected, wip, handleSend, ... } = useAgentChat({
    agentId: "lumii-goldenyears",
    sessionId: "home"
  });

  return (
    <div className="home-page">
      {/* 左侧：实时聊天区 */}
      <div className="home-page__main">
        <ChatStream
          messages={messages}
          connected={connected}
          wip={wip}
          containerRef={containerRef}
          endRef={endRef}
        />
        <CommandInput
          onSend={handleSend}
          disabled={!connected}
          placeholder="问我任何问题..."
        />
      </div>

      {/* 右侧：今日概览 sidebar（保持不变）*/}
      <HomeSidebar data={data} onRoute={onRoute} />
    </div>
  );
}
```

**ChatStream 组件渲染规则：**
- 首次加载时从 WSS init 帧获取历史消息
- AI 消息使用 AI avatar（紫色渐变 32px）
- 用户消息右对齐白色气泡
- 流式回复显示打字光标
- 结构化数据使用 Structured Result Card 样式
- 按钮卡片渲染为可点击的 button group
- wip=true 时底部显示"正在思考..."指示器

### 9.3 Tab Copilot（右侧抽屉）

```typescript
// 通用 Copilot 抽屉组件
function CopilotDrawer({ workAreaId, isOpen, onClose }) {
  const { messages, connected, wip, handleSend, ... } = useAgentChat({
    agentId: "lumii-goldenyears",
    sessionId: workAreaId  // "social_workers" | "smart_badges" | ...
  });

  if (!isOpen) return null;

  return (
    <div className="copilot-drawer">
      <div className="copilot-drawer__header">
        <span>AI 助手 · {workAreaLabel(workAreaId)}</span>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="copilot-drawer__body" ref={containerRef}>
        <ChatStream messages={messages} connected={connected} wip={wip} compact />
        <div ref={endRef} />
      </div>
      <div className="copilot-drawer__footer">
        <CommandInput onSend={handleSend} disabled={!connected} compact />
      </div>
    </div>
  );
}

// 在每个 Area 组件中使用
function SocialWorkersArea({ data, refetch }) {
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <>
      <div className="work-area">
        {/* 现有 table + modal 内容 */}
        <FAB onClick={() => setCopilotOpen(true)} />
      </div>
      <CopilotDrawer
        workAreaId="social_workers"
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </>
  );
}
```

**Copilot 抽屉样式：**
- 宽度 360px，右侧滑入
- overlay 模式 + scrim（`rgba(0,0,0,0.3)`）
- 白底 + `--shadow-drawer` 阴影
- header: 48px，`--surface-subtle` 底色
- body: flex-grow，内部滚动
- footer: 56px，`--line` 顶部边框
- 手机端：底部 drawer，最大高度 70vh
- FAB 按钮：44px 圆形，右下角固定，`--ai-accent` 底色 + Bot icon

### 9.4 Copilot Panel 改进（2026-05-18）

**拖拽调整宽度：**
- 左边栏 6px 拖拽手柄（`.copilot-panel__drag`），cursor: col-resize
- 宽度范围 280-600px，默认 360px
- 拖拽时实时更新 panel width，grid 列宽使用 `auto` 跟随

**响应式布局：**
- Shell grid: `58px minmax(300px, 1fr) auto`（panel 宽度由 style 控制）
- Panel max-width: 50vw（不超过屏幕一半）
- Tablet (≤1024px): panel 最大 320px
- Mobile (≤767px): panel 和 toggle 按钮隐藏

**Dashboard webchat 特性移植：**
- `turnActiveRef`: CC turn 期间抑制 wip=false，防止 WIP 指示器闪烁
- `initReceivedRef`: init 帧到达前门控所有 message/stream 帧，防止重复消息
- 5s 健康检查: WebSocket 断开自动重连
- Progress card 前缀提取为常量，统一过滤
- Markdown 渲染: react-markdown + remark-gfm（表格、代码块、列表、加粗）

## 10. lak 配置

### 10.1 config.toml 追加内容

```toml
[[projects]]
  name = "lumii-goldenyears"
  admin_from = "user-admin-001"

  [projects.agent]
    type = "claudecode"
    [projects.agent.options]
      work_dir = "/home/coder/lumii-goldenyears-agent"
      mode = "default"

  [[projects.platforms]]
    type = "dashboard"
    [projects.platforms.options]
      url = "wss://fieldwork.example.com/api/ws/agent"
      agent_id = "lumii-goldenyears"

  [[projects.platforms]]
    type = "http-forward"
    url = "http://127.0.0.1:4072/ingest"
    accept_passive = true
```

### 10.2 Lifecycle Hook 配置

```toml
  [projects.hooks]
    scope_check = "http://127.0.0.1:4072/hooks/scope-check"
    prepare_session = "http://127.0.0.1:4072/hooks/prepare-session"
    after_send = "http://127.0.0.1:4072/hooks/after-send"
```

## 11. 实现分阶段

| Phase | 子系统 | 产出 | 可测试方式 |
|-------|--------|------|-----------|
| **P1** | goldenyears-api WSS relay | AgentConnectionPool + chat_messages + JWT auth + 文件暂存 | wscat 连接测试 |
| **P2** | goldenyears-agent sidecar | Go HTTP 服务 + hooks + token 签发 + orchestrator skill | curl 测试 hooks |
| **P3** | 首页聊天 UI | useAgentChat hook + HomeArea 改造 + ChatStream 组件 | 浏览器实时对话 |
| **P4** | Tab Copilot | CopilotDrawer 组件 + FAB 按钮 + 各 Area 集成 | 浏览器 tab 内对话 |
| **P5** | lak 配置 + 联调 | config.toml + 端到端验证 | 完整链路测试 |

## 12. 关键决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 消息持久化位置 | goldenyears-api | dashboard 层直接处理，agent 不需要 /ingest |
| Agent 语言 | Go | 与 lak 同语言，架构文档一致 |
| Session key 前缀 | `web:` / `feishu:` | 区分平台，最后一段区分 scope |
| Scope 限制 | 仅影响 AI 行为，不限制 API | 用户在任何 tab 都能操作全部模块 |
| Sub-skill 拆分 | 每个操作独立文件 | 可维护、可调试、可按需加载 |
| WS pool | 保留（6 个，60s TTL） | 多 tab 切换优化 |
| Attachment | 保留 staging upload | 用户可上传文件让 AI 处理 |
| Copilot 位置 | 右侧抽屉面板 | 不占主工作区，可随时收起 |
| 流式回复 | preview_start → reply_stream → stream_end | 实时打字效果 |
| CC 权限模式 | `bypassPermissions` | CC 需要 Bash/Skill 工具权限，生产环境无 `.claude/` 目录 |
| max_active_sessions | 8 | 6 不够覆盖 home + 5 copilot tab + CRUD 独立 session |
| CC 直接 curl API | 不经过 agent | 数据在 API，agent 只提供 hooks/token |

## 13. 已知问题与修复

### Bug 1: lak Progress Card 泄露

- **描述**: lak 发送的 `__lak_progress_card_v1__:` 进度卡片被作为普通消息持久化和显示
- **原因**: AgentConnectionPool 的 `onAgentMessage` 没有过滤 progress card 前缀的 reply/stream 帧
- **修复**: 三层过滤 — server/ws/pool.ts (reply/preview_start/reply_stream/update_message/stream_end 全部检查前缀), useAgentChat.ts (message/stream_start/stream_chunk 过滤), ChatStream.tsx (渲染层防御)

### Bug 2: CC Permission 阻塞

- **描述**: CC session 启动后请求 Skill/Bash 工具权限，lak 等待用户审批导致会话卡死
- **原因**: lak 默认使用 `--permission-prompt-tool stdio` 模式，需要手动审批每个工具
- **修复**: lak config.toml 中设置 `mode = "bypassPermissions"`, 同时删除 agent work_dir 中的 `.claude/` 目录（生产环境不存在此目录）

### Bug 3: 消息发送竞态条件

- **描述**: E2E 测试中，copilot 连续发送多条消息时第二条消息卡死无响应
- **原因**: `waitReply` 检查所有气泡文本匹配到前一条消息的响应后立即发送下一条。CC 还在处理时收到新消息，第二条消息被队列但 CC 未处理
- **修复**: `sendAndWait` 函数在发送前记录当前气泡数量，发送后等待气泡数量增加且新气泡匹配目标模式，确保 CC 完成响应后才发送下一条

### Bug 4: CC Session 耗尽

- **描述**: 多个测试使用不同 userId 时，lak 的 `max_active_sessions` 限制导致新会话无法启动
- **原因**: 默认 `max_active_sessions: 6`，每个 userId 创建独立 CC session，测试用例总数超过限制
- **修复**: `max_active_sessions` 改为 8, 测试用例分组共享用户（query/crud/copilot 三组），copilot 测试合并为单个测试顺序访问所有 tab

**Bug #5: WIP 指示器闪烁**
- 描述: CC session 执行 tool call 期间 WIP 指示器反复出现/消失
- 原因: lak 在 CC 的 text reply 和下一个 tool call 之间发送 wip_update(false)，前端立即清除 WIP 状态
- 修复: 新增 `turnActiveRef`，收到 `turn_active(true)` 后抑制 `wip_update(false)`，直到 `turn_active(false)` 到达

**Bug #6: init 前消息重复**
- 描述: WebSocket 连接后偶尔出现重复消息
- 原因: message/stream 帧可能在 init 帧之前到达（init 帧包含历史消息），导致同一消息从 DB 历史和实时流各出现一次
- 修复: 新增 `initReceivedRef` 门控，init 帧处理前丢弃所有 message/stream 帧
