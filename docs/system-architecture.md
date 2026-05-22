# GoldenYears 系统架构设计

**日期：** 2026-05-13
**状态：** Approved v3
**仓库：** `aro-network/lumii-goldenyears-dashboard`

## 1. 系统概述

GoldenYears 是一套录音驱动的社区养老上门服务管理系统。核心数据流：

```
智能工牌录音 → 语音转写 → AI 规整（服务记录 + 对象档案 + 异常检测）
  → 语音反馈（TTS → 工牌蓝牙播放）
  → 多角色结构化查看（聊天 + Tab）
  → 周期报告（运营/家属）
  → 结算导出
```

系统面向 5 种用户角色（集团管理、站点运营、服务主管、服务人员、服务对象家属），
每个角色的入口都是聊天界面 + 角色相关 Tab。支持 Web 端和飞书端双入口。

### 1.1 设计原则

- **录音事实是第一性数据。** 结构化信息由后台 AI 自动推断，运营只处理例外。
- **聊天 AI 经过 lak/CC session，实时处理 AI 由 processor 直接调用云端 LLM。** 录音规整和 SOP 检查需要低延迟，不绕道 lak。
- **三层权限防护。** scope_check 门控 + prompt 角色注入 + API 层硬性过滤。
- **工牌最小使用方式：按键开始 → 按键结束。** 不要求服务人员操作界面。
- **每个可选环节都有降级。** 没有 SOP = 纯录音；没有排单 = 录音推断；没有
  指定服务人员 = 动态混用。

## 2. 总体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        客户端层                                   │
│                                                                  │
│  goldenyears-web       飞书 bot          微信小程序    智能工牌    │
│  (React SPA)           (聊天+H5 Tab)     (家属入口)   (录音设备)  │
│  ├── Dashboard WS      ├── lak feishu    └── 订阅管理  ├── Opus  │
│  ├── REST API          └── H5 嵌入 web                 ├── 缓存  │
│  └── 角色 Tab                                          └── WSS   │
└────────┬─────────────────┬────────────┬──────────────────┬───────┘
         │                 │            │                  │
         ▼                 ▼            ▼                  ▼
┌──────────────┐  ┌──────────────┐ ┌──────────────────┐ ┌────────────┐
│ lak           │  │ goldenyears  │ │ goldenyears      │ │ goldenyears│
│ (session      │  │ -api         │ │ -processor       │ │ -ops       │
│  broker)      │  │ (业务服务)   │ │ (实时处理服务)   │ │ (运维配置) │
│               │  │              │ │                  │ │            │
│ dashboard 平台│  │ REST API     │ │ WSS 设备连接管理 │ │ 系统配置   │
│ feishu 平台   │  │ 角色权限过滤 │ │ 音频收发         │ │ 用户管理   │
│ lifecycle     │  │ CRUD         │ │ 实时 ASR 调度    │ │ 权限配置   │
│ hooks ↕       │  │ 数据查询     │ │ 实时 LLM 调用    │ │ 监控       │
│ goldenyears   │  │ 报告聚合     │ │ TTS + 语音下发   │ │            │
│ -agent        │  │ 导出         │ │ 遥测/指令        │ │            │
│ (sidecar)     │  │              │ │ 定时任务         │ │            │
└──────────────┘  └──────────────┘ └──────────────────┘ └────────────┘
```

## 3. 仓库划分

| 仓库 | 语言 | 职责 |
|------|------|------|
| `lumii-goldenyears-dashboard` | TypeScript (React + Node.js) | 前端 SPA (goldenyears-web) + 业务 API (goldenyears-api)，同一仓库 |
| `lumii-goldenyears-agent` | Go | lak sidecar，lifecycle hooks，CC session 上下文管理 |
| `lumii-goldenyears-processor` | Go | 实时处理服务：WSS 设备接入、ASR/LLM/TTS 实时调度、事件编排、定时任务 |
| `lumii-goldenyears-ops` | TypeScript + Node.js | 系统运维配置：系统配置、用户管理、权限配置、监控 |

lak 本身不需要新仓库，在 config.toml 中配置一个 `lumii-goldenyears` project
指向 goldenyears-agent sidecar 即可。

## 4. 模块详细设计

### 4.1 goldenyears-processor (实时处理服务)

合并了原 gateway（设备接入）和 controller（工作流编排）。收到工牌数据后实时
调用云端 ASR 和 LLM 处理，不经过中间转发层，减少延迟。

#### 4.1.1 职责

| 职责 | 内容 |
|------|------|
| 设备连接管理 | 工牌 WSS 长连接维护、心跳、重连、认证 |
| 音频上行 | 接收 Opus 分片 → 写入本地文件系统 + 实时送 ASR |
| 音频下行 | TTS 音频 → Opus 压缩 → 转发到指定工牌 |
| 遥测上报 | 接收工牌状态（电量、信号、GPS）→ 更新设备状态 |
| 指令下发 | 向工牌发送录音控制等指令 |
| 设备状态 | 维护在线工牌列表、连接状态、最后心跳 |
| ASR 实时调度 | 流式送阿里云 ASR → 获取转写结果 |
| LLM 实时调用 | 转写完成 → 直接调用云端 LLM（服务记录规整、SOP 检查） |
| TTS 调度 | LLM 返回反馈文本 → 调 TTS → Opus → 下发工牌 |
| 事件编排 | 录音开始/结束/转写完成 → 驱动后续处理流程 |
| 定时任务 | 周期报告生成、数据清理、设备巡检等 |

#### 4.1.2 不做的事

- 不负责业务 CRUD（由 goldenyears-api 负责）
- 不负责聊天交互（由 lak/agent 负责）
- 不直接处理用户登录和权限（由 api 层负责）

#### 4.1.3 工牌通信协议 (WSS)

```
工牌 → processor (上行)：
  { type: "start", badge_id: "B001", ts: "..." }
  { type: "audio", data: "<base64 opus>", seq: 1 }
  { type: "stop", ts: "..." }
  { type: "telemetry", battery: 72, signal: -65, gps: {...} }

processor → 工牌 (下行)：
  { type: "ack", seq: 1 }
  { type: "play_audio", data: "<base64 opus tts>" }
  { type: "command", action: "start_recording" | "stop_recording" }
```

#### 4.1.4 Processor ↔ Agent 通信

Agent sidecar 主动连接 processor 的 WebSocket 端点。仅用于聊天相关的事件通知
（如定时报告触发），录音规整和 SOP 检查不再经过 agent。

```
processor → agent（事件推送）：
  { type: "recording_started", badge_id, session_id, ts }
  { type: "recording_stopped", badge_id, session_id, ts }
  { type: "anomaly_detected", badge_id, anomaly_type, detail }

agent → processor（指令）：
  { type: "query_recording_status", badge_id }
```

### 4.3 goldenyears-agent (lak sidecar)

Go binary HTTP 服务（port 4072），是 copilot 的业务中枢。运行在 lak 同一台服务器。

> **Agent 类型已切换**：从 Claude Code (claudecode) 切换为 Codex CLI (codex) + DeepSeek (2026-05-22)。
> Codex 读取 `AGENTS.md`（等同 CLAUDE.md），通过 LiteLLM Proxy 访问 DeepSeek LLM。

#### 4.3.1 Lifecycle hooks

| Hook | 端点 | 行为 |
|------|------|------|
| `scope_check` | `POST /hooks/scope-check` | actor_id → 角色 → 权限判断。未授权 → silent |
| `prepare_session` | `POST /hooks/prepare-session` | 签发 GY_API_TOKEN (JWT)，根据 session_key 推断 scope/role，注入环境变量到 Codex 进程。跨天自动返回 `session_directive: "new"` 强制新建 session |
| `after_send` | `POST /hooks/after-send` | 审计日志 |
| `/commands/help` | `GET /commands/help` | 返回斜杠命令列表（站点运营 15 条 / 集团管理 8 条），由 lak custom command 直接调用，不启动 Codex session |

#### 4.3.2 录音规整（已移至 processor）

录音规整不再经过 agent/lak。由 processor 直接调用云端 LLM 完成。
详见 6.2 节数据流。Agent 仍负责聊天交互和定时报告生成。

#### 4.3.3 goldenyears-orchestrator skill

CC session 加载 orchestrator skill，负责意图路由：

- 查询类 → curl goldenyears-api
- 操作类 → curl goldenyears-api
- 规整类 → 解析转写文本 + SOP + 档案 → 输出结构化记录

### 4.4 goldenyears-api (业务服务)

REST API 服务。所有数据访问的权限校验在此层强制执行。

#### 4.4.1 API 模块

| 模块 | 端点前缀 | 内容 |
|------|---------|------|
| 鉴权 | `/auth` | 登录、角色解析、token 管理 |
| 机构 | `/orgs` | 机构 CRUD、站点管理 |
| 人员 | `/workers` | 服务人员资料、联系方式、赞数摘要、常用工牌关系 |
| 服务对象 | `/clients` | 档案、健康信息、注意事项 |
| 家属 | `/families` | 联系方式、订阅关系 |
| 服务项目 | `/service-projects` | 服务类型定义（机构级） |
| SOP | `/sops` | 步骤、必问项、版本（机构级） |
| 工牌 | `/badges` | 激活、绑定、状态 |
| 任务 | `/tasks` | 排单、分配、状态 |
| 服务过程 | `/sessions` | 录音、转写、服务记录 |
| 异常 | `/anomalies` | 异常标记、待确认 |
| 报告 | `/reports` | 查询、生成、推送 |
| 导出 | `/exports` | 结算日志筛选、导出、留痕 |
| 审计 | `/audit` | 操作日志查询 |

#### 4.4.2 权限模型

| 角色 | 数据范围 |
|------|---------|
| 集团管理 | 机构下所有站点的汇总数据，不含原始录音 |
| 站点运营 | 本站点的所有明细数据 |
| 服务主管 | 机构级 SOP + 本站点服务记录中的 SOP 相关字段 |
| 服务人员 | 自己的任务和服务记录 |
| 家属 | 绑定服务对象的脱敏服务摘要 |

### 4.4.3 Web 端认证（已实现）

Web 端使用账号密码 + JWT 认证：

```
POST /api/auth/login → { username, password } → JWT (24h)
JWT payload: { sub, username, name, role, orgId, siteIds }
```

Web 端角色（本次实现）：

| 角色 | 英文标识 | 可访问页面 |
|------|---------|----------|
| 集团管理 | `org_admin` | `/admin` + `/site-operations` |
| 站点运营 | `site_operator` | `/site-operations` |
| 服务主管 | `service_supervisor` | `/sop-management`（开发中） |
| 服务人员 | `careworker` | `/careworker`（H5 页面） |

用户管理由集团管理员在 `/admin` 页面完成。
密码使用 bcrypt 哈希存储。

### 4.5 goldenyears-ops (运维配置)

系统管理后台。纯运维，不跑业务逻辑。

- 系统配置（ASR 参数、TTS 参数、存储配置）
- 用户管理（角色分配、权限配置）
- 机构管理（开通、停用）
- 监控（设备在线率、ASR 成功率、存储用量）

### 4.6 goldenyears-web (前端)

React SPA，按角色显示不同的 Tab。可独立部署也可作为飞书 bot 多 tab H5 页面。

### 4.6.1 前端模块结构（已实现）

```
src/
├── auth/          → 登录认证（所有角色共用）
├── quality/       → 集团管理页面（org_admin）
├── admin/         → 用户管理页面（org_admin）
├── supervisor/    → 服务主管 SOP 管理（service_supervisor）
├── careworker/    → 服务人员 H5（独立登录）
├── family/        → 家属 H5（公开页面）
└── features/
    └── siteOperations/ → 站点运营（site_operator + org_admin）
```

每个模块独立的 React 组件 + CSS，通过 App.tsx 按角色路由分发。

## 5. 权限控制（三层防护 + 站点数据隔离）

```
Layer 1: scope_check (lifecycle hook)
  角色是否有权在此 scope 交互？未授权 → silent/deny

Layer 2: prepare_session (lifecycle hook)
  注入角色 + 权限范围 + 站点 ID 到 system prompt 和环境变量
  签发 GY_API_TOKEN (JWT)，其中 scope 字段 = 当前站点 ID (如 site-001)

Layer 3: goldenyears-api (业务 API) ← 真正的安全边界
  requireAuth 从 GY_API_TOKEN 的 scope 字段提取 forceSiteId
  resolveSiteId(req) 优先使用 forceSiteId，无视查询参数
  即使 LLM 不带 siteId 参数或被 prompt injection 绕过，API 层硬性过滤
```

> **设计原则：** AI agent 场景下不能依赖 LLM 正确执行安全过滤指令。Layer 3 (API 层) 是真正的
> 数据隔离边界，Layer 1-2 是辅助层。详见 Bug #36 排查记录。

### 5.1 Token 认证链路（已实现）

系统使用三种 token，对应不同的接入方：

| 接入方 | Token 类型 | 认证方式 |
|--------|-----------|---------|
| 浏览器用户 | 用户 JWT | `POST /api/auth/login` → JWT 存 localStorage → REST/WSS 携带 |
| lak | ws_token | 静态共享密钥，WSS register 帧携带，timingSafeEqual 校验 |
| Codex session | GY_API_TOKEN | agent prepare_session 签发 HS256 JWT，curl Authorization header |

API 层中间件：
- `requireAuth(jwtSecret, gyTokenSecret?)`: 所有业务 + Admin 路由使用，强制认证。优先验证 JWT，失败时用 gyTokenSecret 尝试 GY_API_TOKEN。GY token role 为空时根据 scope 推断（admin → org_admin，其他 → site_operator）。GY token scope 为 `site-*` 时设置 `authUser.forceSiteId` 用于数据隔离。
- `requireRole(role)`: 角色检查（如 org_admin），必须在 requireAuth 之后使用
- `resolveSiteId(req)`: 辅助函数，优先返回 `authUser.forceSiteId`（GY token 硬性过滤），fallback 到 `req.query.siteId`（前端传参）

> **注意：** `optionalAuth` 已弃用。所有业务路由统一使用 `requireAuth`，未认证请求返回 401。

dev-token 端点（`GET /api/auth/dev-token`）已在 2026-05-18 移除，不再提供匿名 JWT 签发。

## 6. 数据流交互

### 6.1 聊天交互

Web 端和飞书端的消息入口不同：

- **Web 端**：Web → api (WSS 中转) → lak → lifecycle hooks → agent
- **飞书端**：飞书 → lak (直连) → lifecycle hooks → agent

```
用户 → Web/飞书
  → [Web 端经 api WSS 中转 | 飞书端直连 lak]
  → lak → scope_check → prepare_session → agent 注入角色上下文 + GY_API_TOKEN
  → lak 启动 Codex session → Codex 加载 AGENTS.md + orchestrator skill
  → Codex → LiteLLM Proxy → DeepSeek LLM (reasoning)
  → Codex curl goldenyears-api 查数据（API 层独立校验 GY_API_TOKEN）
  → 回答用户（原路返回，含 gy:// 智能链接）
  → lak → after_send → agent 审计日志
```

#### 6.1.1 Web 端聊天链路（已实现）

实际实现的 Web 端聊天链路：

```
用户 → Web 浏览器
  → WebSocket /api/ws/chat?sessionId=copilot:{siteId} (JWT auth)
  → goldenyears-api AgentConnectionPool (消息持久化 + 路由)
  → WebSocket /api/ws/agent (lak 主动连入, ws_token auth)
  → lak → lifecycle hooks (prepare_session, scope_check)
  → goldenyears-agent sidecar (签发 GY_API_TOKEN, 注入 env)
  → Codex session (加载 AGENTS.md + orchestrator skill from work_dir)
  → Codex → LiteLLM (localhost:4000) → DeepSeek LLM
  → Codex curl http://124.221.48.52:3004/api/* (携带 GY_API_TOKEN)
  → 响应通过 reply/stream 帧原路返回
  → AgentConnectionPool 持久化 + 广播
  → 浏览器 WebSocket → useAgentChat hook → ChatStream 渲染
```

关键实现细节：
- lak 在内网，主动向公网 API 服务器的 `/api/ws/agent` 发起 WSS 连接
- Codex session 的 work_dir 指向 goldenyears-agent 目录，自动加载 AGENTS.md 和 skills/
- Codex 使用 `mode: yolo`（等同 bypassPermissions），无需手动审批
- Codex 通过 LiteLLM Proxy (localhost:4000) 访问 DeepSeek LLM
- 进度卡片（`__lak_progress_card_v1__:`）被三层过滤，不显示给用户
- 消息通过 AgentConnectionPool 持久化到 SQLite chat_messages 表
- Session key 格式：`copilot:{siteId}`（站点运营）或 `copilot:admin`（集团管理）
- 消息中 `[ctx:label]` 前缀在 UI 中不可见，用于 agent 识别用户当前 tab

### 6.2 录音 → AI 规整 → 语音反馈

processor 收到工牌录音后，实时调用云端 ASR 转写，转写完成后直接调用云端 LLM
（如通义千问、GPT 等）进行服务记录规整，不经过 lak/agent/CC session。

```
工牌按键开始 → processor WSS 接收
  → processor 创建 ASR session + 从 api 查排单/SOP/档案信息
  → 音频分片实时流式送阿里云 ASR
  → 工牌按键结束 → processor 标记录音结束
  → ASR 完成转写 → 拼接存本地文件系统 + MySQL 元数据
  → processor 直接调用云端 LLM（携带转写文本 + SOP + 档案上下文）
  → LLM 返回结构化服务记录 + 反馈文本
  → processor 调 api 写入服务记录
  → processor 调 TTS（反馈文本 → 语音）→ Opus 压缩
  → processor WSS → 工牌蓝牙耳机播放
```

### 6.3 实时 SOP 反馈（可选）

ASR 产生中间结果时，processor 直接调用云端 LLM 检查 SOP 合规性并生成语音反馈，
不经过 agent。

```
processor ASR 中间结果（流式转写文本累积到阈值）
  → processor 直接调用云端 LLM（携带当前转写 + SOP 检查清单）
  → LLM 返回 SOP 反馈文本（如"请注意确认用药"）
  → processor 调 TTS → Opus → WSS → 工牌蓝牙播放
```

### 6.4 定时报告生成

```
processor 定时任务触发 → WSS 通知 agent: cron_trigger
  → agent 调 lak POST /api/v1/sessions/start
  → CC session 从 api 聚合数据 → 生成报告 → 写入 api
  → CC session 结束 → agent 通知 processor: push_family_report (WSS)
  → processor 推送家属（小程序/公众号）
```

## 7. 数据模型

### 7.1 核心实体关系

```
Organization (机构/集团)
  ├── ServiceProject (服务项目)    ← 机构级
  │     └── SOP [1:N, 版本化]     ← 机构级
  │
  ├── Site (站点)
  │     ├── Worker (服务人员)
  │     ├── Badge (工牌)
  │     ├── Client (服务对象) ──→ FamilyMember (家属) [1:N]
  │     └── Task (任务/排单) ──→ ServiceSession [0:1]
  │
  ServiceSession (服务过程)
  ├── badge_id
  ├── worker_id (可推断)
  ├── client_id (可推断)
  ├── site_id
  ├── service_project_id (可推断)
  ├── Recording [1:N]
  ├── Transcript [1:1]
  ├── ServiceRecord [1:1, AI 规整产出]
  │     ├── confidence
  │     ├── completeness
  │     └── sop_compliance
  ├── Anomaly [0:N]
  └── ConfirmationItem [0:N]

Report
  ├── type: daily | weekly | monthly | insight | ops
  ├── audience_role: family | supervisor | management | ops
  └── FamilySubscription [N:M]

AuditLog
  ├── actor_id, role, action, resource, timestamp
```

### 7.2 MySQL 表结构概要

```sql
-- 机构与站点
organizations (id, name, created_at)
sites (id, org_id FK, name, address, created_at)

-- 服务项目与 SOP（机构级）
service_projects (id, org_id FK, name, description, status)
sops (id, service_project_id FK, version, steps JSON, required_items JSON,
      exception_branches JSON, completion_criteria JSON, effective_from, status)

-- 人员
users (id, phone, name, role ENUM, org_id FK, created_at)
user_site_access (user_id FK, site_id FK)
workers (id, user_id FK, site_id FK, worker_type ENUM, created_at)
worker_badge_bindings (id, worker_id FK, badge_id FK, status ENUM, bound_at, released_at)
worker_feedback_events (id, worker_id FK, source_type ENUM, source_ref_id, created_at)
worker_feedback_summaries (worker_id FK, praise_count, updated_at)

-- 服务对象与家属
clients (id, site_id FK, name, address, health_info JSON, notes, risk_level)
family_members (id, client_id FK, name, phone, relation, subscription JSON)

-- 工牌
badges (id, device_code, org_id FK, site_id FK, status ENUM, activated_at)

-- 任务与服务过程
tasks (id, site_id FK, client_id FK, worker_id FK, service_project_id FK,
       scheduled_date, status ENUM, notes)
service_sessions (id, badge_id FK, task_id FK NULL, site_id FK,
                  worker_id FK NULL, client_id FK NULL,
                  service_project_id FK NULL,
                  started_at, ended_at, status ENUM)

-- 录音与转写
recordings (id, session_id FK, storage_ref, codec, duration_seconds,
            size_bytes, uploaded_at)
transcripts (id, session_id FK, storage_ref, word_count, created_at)

-- 服务记录（AI 规整产出）
service_records (id, session_id FK, summary TEXT, detail JSON,
                 confidence DECIMAL, completeness DECIMAL,
                 sop_compliance DECIMAL NULL, worker_id FK, client_id FK,
                 service_project_id FK, created_at)

-- 异常与待确认
anomalies (id, session_id FK, type ENUM, detail TEXT, severity,
           resolved_at, resolved_by)
confirmation_items (id, session_id FK, field, reason, status ENUM,
                    confirmed_by, confirmed_at)

-- 报告
reports (id, org_id FK, type ENUM, audience_role ENUM, content JSON,
         period_start, period_end, created_at)
family_report_deliveries (id, report_id FK, family_member_id FK,
                          channel ENUM, delivered_at)

-- 审计
audit_logs (id, actor_id, role, action, resource, resource_id,
            detail JSON, ip, created_at)

-- 导出
export_logs (id, actor_id, filter_criteria JSON, field_scope JSON,
             file_ref, warnings JSON, created_at)
```

## 8. 技术栈

| 模块 | 技术 | 说明 |
|---|---|---|
| lak | Go | 通用 session broker，保持不变 |
| goldenyears-web | TypeScript + React + Vite | 前端 SPA，聊天 + 角色 Tab |
| goldenyears-api | TypeScript + Node.js + Express | 业务 CRUD + 角色权限过滤 |
| goldenyears-agent | Go | lak sidecar，lifecycle hooks |
| goldenyears-processor | Go | 实时处理：设备 WSS 接入 + ASR/LLM/TTS 实时调度 + 定时任务 |
| goldenyears-ops | TypeScript + Node.js | 系统运维配置 |
| 数据库 | MySQL 8.0 | 主业务数据库 |
| 文件存储 | 本地文件系统（后续可迁移 S3） | 录音、转写、报告文件，按 session_id 目录组织 |
| 缓存/队列 | Redis + MQ | 音频分片缓存、任务队列 |
| ASR | 阿里云实时语音转写 | 流式中文语音识别 |
| AI/LLM | 云端 LLM（通义千问/GPT 等） | 录音规整和 SOP 检查由 processor 直接调用；聊天交互仍经 lak |
| 工牌音频 | Opus 16kbps mono | 压缩比高，适合 4G 低带宽 |

## 9. 开发阶段

### Phase 0（2 周）：脚手架 + 最小录音闭环

- `lumii-goldenyears-api`：Express + MySQL schema + 鉴权 + 基础 CRUD
- `lumii-goldenyears-processor`：WSS server + 工牌音频接收 + 阿里云 ASR + 云端 LLM 接入
- `lumii-goldenyears-web`：React + 聊天骨架 + 一个 Tab
- 工牌模拟页面
- 结果：能录音、能转写、能看到转写文本

### Phase 1（3 周）：AI 规整 + 运营聊天

- `lumii-goldenyears-agent`：sidecar + lifecycle hooks + 角色解析
- `lumii-goldenyears-ops`：基础框架 + 系统配置
- `lumii-goldenyears-processor`：定时任务 + TTS 语音反馈 + 云端 LLM 规整
- lak 接入（dashboard platform）
- 录音 → agent 调度 CC session 规整 → 服务记录
- 站点运营：聊天 + 服务记录 Tab + 待确认 Tab
- 三层权限控制

### Phase 2（3 周）：SOP + 排单 + 服务人员 + 飞书

- SOP 管理（机构级）
- 排单（聊天输入 → 结构化任务）
- 服务人员视图
- 飞书 platform 接入 + H5 Tab

### Phase 3（2 周）：家属 + 报告 + 导出

- 微信小程序/公众号
- 家属订阅 + 日/周/月报
- 结算导出
- 集团管理视图
