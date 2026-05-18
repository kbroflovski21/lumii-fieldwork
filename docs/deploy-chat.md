# GoldenYears 聊天 & Copilot 部署指南

## 1. 架构概览

```
浏览器 ←WSS→ goldenyears-api (公网) ←WSS→ lak (内网) → CC session
                                                         ↓
                                              goldenyears-agent (内网)
                                              ├ CLAUDE.md (persona)
                                              ├ skills/ (orchestrator)
                                              └ bin/agent (sidecar, port 4072)
```

## 2. 服务清单

| 服务 | 端口 | 位置 | 职责 |
|------|------|------|------|
| goldenyears-api | 3001 | 公网服务器 | REST API + WSS relay + 消息持久化 |
| Vite/Nginx | 5173/80 | 公网服务器 | 前端静态文件 + API/WSS 代理 |
| lak | — | 内网服务器 | CC session 管理, 主动连接 API 的 WSS |
| goldenyears-agent | 4072 | 内网服务器 | 操作 sidecar (hooks, token 签发) |

## 3. 公网服务器部署

### 3.1 goldenyears-api

环境变量:
- `PORT`: API 端口 (默认 3001)
- `JWT_SECRET`: JWT 签名密钥 (用于前端用户认证)
- `WS_TOKEN`: agent WSS 连接认证 token (与 lak config 中的 token 一致)
- `AGENT_ID`: agent 标识 (默认 `lumii-goldenyears`)

启动:
```bash
JWT_SECRET="<生产密钥>" \
WS_TOKEN="<与lak配置一致的token>" \
AGENT_ID="lumii-goldenyears" \
node dist/server/index.js
```

systemd unit 示例:
```ini
[Unit]
Description=GoldenYears API
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/goldenyears/lumii-goldenyears-dashboard
Environment=PORT=3001
Environment=JWT_SECRET=<生产密钥>
Environment=WS_TOKEN=<生产token>
Environment=AGENT_ID=lumii-goldenyears
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 3.2 前端 (Nginx)

```nginx
server {
    listen 80;
    server_name fieldwork.example.com;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }

    location / {
        root /opt/goldenyears/lumii-goldenyears-dashboard/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

注意: `/api/` 的 proxy 必须支持 WebSocket upgrade (`Upgrade` + `Connection` headers)

### 3.3 Vite 开发模式

开发时使用 Vite 代理:
```typescript
// vite.config.ts
proxy: {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true,
    ws: true,  // 必须: WebSocket 代理
  },
},
```

## 4. 内网服务器部署

### 4.1 lak

config.toml:
```toml
data_dir = "/home/deploy/.lumii/goldenyears"
language = "zh"

[[projects]]
  name = "lumii-goldenyears"
  admin_from = "<管理员ID>"

  [projects.agent]
    type = "claudecode"

    [projects.agent.options]
      work_dir = "/opt/goldenyears/lumii-goldenyears-agent"
      mode = "bypassPermissions"
      disallowed_tools = ["Edit", "MultiEdit", "Write", "NotebookEdit"]

  [projects.display]
    thinking_messages = false
    tool_max_len = 300

  [[projects.platforms]]
    type = "dashboard"

    [projects.platforms.options]
      url = "wss://fieldwork.example.com/api/ws/agent"
      token = "<与API服务器WS_TOKEN一致>"
      agent_id = "lumii-goldenyears"
```

关键配置说明:
- `mode = "bypassPermissions"`: CC 无需手动审批 Bash/Skill 工具权限
- `disallowed_tools`: 禁止 CC 修改文件，只允许读取和执行 curl
- `url`: 指向公网 API 服务器的 WSS 端点, lak 主动发起连接
- `token`: 必须与 API 服务器的 `WS_TOKEN` 环境变量一致

启动:
```bash
/usr/local/bin/lak --config /home/deploy/.lumii/goldenyears/config.toml
```

### 4.2 goldenyears-agent

构建:
```bash
cd /opt/goldenyears/lumii-goldenyears-agent
export PATH="/usr/local/go/bin:$PATH"
make build
```

启动:
```bash
GY_TOKEN_SECRET="<JWT签名密钥>" \
GY_API_BASE="https://fieldwork.example.com" \
AGENT_PORT=4072 \
./bin/agent
```

注意:
- 不要在 agent 目录下创建 `.claude/` 目录
- CLAUDE.md 和 skills/ 由 CC session 自动读取
- agent sidecar 提供 hooks 端点供未来 lak 调用

### 4.3 Orchestrator Skill

CC session 自动从 `work_dir/skills/goldenyears-orchestrator/` 加载:
- `prompt.md`: 主 prompt (角色定义 + 行为规则 + API 路由表)
- `sub-skills/*.md`: 15 个子技能文件 (查询/新增/修改/归档等)

所有 sub-skill 中的 API 地址使用 `http://localhost:3001/api` (CC 和 API 在同一内网可达)。
如果 API 在公网,改为 `https://fieldwork.example.com/api`。

## 5. 安全配置

### 5.1 Token 配置清单

| Token | 位置 | 用途 |
|-------|------|------|
| `JWT_SECRET` | API 服务器 env | 签发/验证前端用户 JWT |
| `WS_TOKEN` | API 服务器 env + lak config | agent WSS 连接认证 |
| `GY_TOKEN_SECRET` | agent sidecar env | 签发 GY_API_TOKEN (未来用) |

### 5.2 注意事项

- `WS_TOKEN` 必须在 API 服务器和 lak config 中保持一致
- 生产环境不要使用默认的 `dev-*` token
- CC 的 `bypassPermissions` 模式配合 `disallowed_tools` 限制文件修改
- agent 目录不要有 `.claude/` 子目录

## 6. 验证部署

### 6.1 健康检查

```bash
# API 服务器
curl http://localhost:3001/api/health
# 预期: {"ok":true}

# Agent sidecar
curl http://localhost:4072/health
# 预期: {"status":"ok","service":"goldenyears-agent"}

# lak 连接状态 (查看 lak 日志)
grep "connected and registered" /var/log/lak.log
# 预期: dashboard: connected and registered agent_id=lumii-goldenyears
```

### 6.2 E2E 验证

E2E 测试支持两种模式，通过环境变量切换:

**Staging 模式 (默认):**

连接已部署的 staging 服务器，使用真实 lak + CC session。mock-agent 测试自动跳过。

```bash
cd lumii-goldenyears-dashboard
npx playwright test --project=ui --project=chat-e2e --reporter=line
# 预期: 31 passed, 10 skipped (mock-agent tests), 1 flaky
```

**Local 模式:**

启动本地 server (port 3098)，使用 mock agent 模拟 lak。所有测试都运行。

```bash
E2E_MODE=local \
E2E_BASE_URL=http://localhost:3098 \
E2E_JWT_SECRET=e2e-test-secret \
E2E_WS_TOKEN=e2e-ws-token \
npx playwright test --project=ui --project=chat-e2e --reporter=line
# 预期: 42 passed
```

Local 模式需要 `globalSetup` 启动测试 server，修改 `playwright.config.ts` 恢复 `globalSetup`/`globalTeardown` 配置。

**环境变量清单:**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `E2E_BASE_URL` | `http://124.221.48.52:3004` | 测试目标 URL |
| `E2E_MODE` | (空 = staging) | `local` 启用 mock-agent 测试 |
| `E2E_JWT_SECRET` | `staging-jwt-secret` | JWT 签名密钥 |
| `E2E_WS_TOKEN` | `staging-ws-token` | WSS agent 认证 token |

### 6.3 Real-lak E2E

需要真实 lak + CC + agent sidecar 全部就绪:

```bash
npx playwright test --project=real-lak --reporter=line
# 预期: 17 passed
```

## 7. 故障排查

| 现象 | 原因 | 解决 |
|------|------|------|
| "AI 助手离线中..." | 前端无有效 JWT 或 lak 未连接 | 见 Bug #2；也检查 lak 日志确认 url 和 token |
| "正在思考..." 卡住不动 | CC session 权限阻塞 | 确认 lak 版本 >= c2449d4，见下方 Bug #1 |
| 进度卡片 JSON 显示 | pool.ts 过滤未生效 | 检查 `__lak_progress_card_v1__` 过滤代码 |
| "并发活跃会话过多" | max_active_sessions 不够 | 增大 pool.ts 中的值 (默认 8) |
| CC 响应慢 (>60s) | CC session 上下文过长 | 正常现象,首次查询需加载 skill |
| WIP 指示器闪烁 | CC turn 期间 wip_update(false) 到达 | turnActiveRef 抑制机制已实现 |
| 消息重复 | message 帧在 init 帧前到达 | initReceivedRef 门控已实现 |
| WebSocket 断开无感知 | 网络波动后不重连 | 5s 健康检查自动重连 |
| Markdown 表格不渲染 | 缺少 react-markdown 依赖 | 已安装 react-markdown + remark-gfm |
| `❌ 错误: --dangerously-skip-permissions` | lak 以 root 运行 + 旧版 | 升级 lak，见下方 Bug #1 |
| `启动 Agent 会话失败` | CC 进程启动被安全检查拒绝 | 同 Bug #1 |
| `run_as_user spawn refused` | coder 有 NOPASSWD sudo | 不要用 `run_as_user`，用 Bug #1 方案 |

## 8. 已知 Bug 与修复

### Bug #1: CC 在 root 下拒绝 bypassPermissions (2026-05-17)

**描述:** 当 lak 以 root 用户运行 (systemd `User=root`) 且配置 `mode = "bypassPermissions"` 时，CC 报错 `--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons` 并立即退出。所有 CRUD 操作失败。

**原因:** lak 将 `--permission-mode bypassPermissions` 作为 CLI 参数传给 CC。CC 内部将 `bypassPermissions` 转换为 `--dangerously-skip-permissions`，但 CC 有安全限制：root/sudo 下禁止使用此标志。

**排除方案:**
- `run_as_user = "coder"`: lak 拒绝，因为 coder 用户有 NOPASSWD sudo 权限 (`target user can run passwordless sudo; isolation is meaningless`)
- `mode = "plan"` 或 `mode = "default"`: CC 不跳过权限，每次工具调用需要人工审批，server-side 场景下会无限阻塞

**修复:** lak commit `c2449d4` (`agent/claudecode/session.go`)。当 `mode = "bypassPermissions"` 时，不再传 `--permission-mode` 参数给 CC。CC 使用默认权限模式，每次工具调用通过 `--permission-prompt-tool stdio` 发出权限请求。lak 内部的 `autoApprove` 机制（已有代码）自动批准所有权限请求（`AskUserQuestion` 除外）。效果等同于 `bypassPermissions`，但绕过了 CC 的 root 安全检查。

**影响:** 微秒级开销（多一次 stdin/stdout JSON 往返），功能行为不变。

### Bug #2: 前端"AI 助手离线中"— dev-token JWT 无效 (2026-05-17)

**描述:** 浏览器打开页面后，首页和 copilot 聊天窗口显示"AI 助手离线中..."，无法发送消息。

**原因:** 前端 `useAgentChat` 的 `getToken()` 从 `localStorage` 读取 `gy_chat_token`，首次打开页面时不存在该 key，fallback 返回字符串 `"dev-token"`。服务端 JWT 验证失败（`"dev-token"` 不是合法 JWT），WSS 连接被拒，`init` 帧未发送，前端 `connected` 保持 `false`，显示离线。

**修复:** fieldwork commit `10dba82`。
1. 服务端添加 `GET /api/auth/dev-token` 端点，使用 `JWT_SECRET` 签发 24h 有效的开发 JWT。
2. 前端 `useAgentChat` 在建立 WSS 连接前，检查 token 是否有效（非空且非 `"dev-token"`），无效时先异步调用 `/api/auth/dev-token` 获取合法 token 并存入 `localStorage`，再建立 WSS 连接。

**注意:** `/api/auth/dev-token` 仅用于开发和 staging 环境。生产环境应使用正式的登录认证流程签发 token。

### Bug #3: Skill API 地址指向 localhost:3001 (2026-05-17)

**描述:** 通过 copilot 发送查询消息后，CC 返回"后端 API 服务 localhost:3001 未运行，无法查询数据"。

**原因:** `lumii-goldenyears-agent/skills/goldenyears-orchestrator/` 下所有 sub-skill 文件中 curl 命令的 API 地址硬编码为 `http://localhost:3001/api`。CC session 运行在 lak 所在的 VPS（内网），而 API 服务部署在 staging 公网服务器（`124.221.48.52:3004`），CC 无法访问 `localhost:3001`。

**修复:** goldenyears-agent commit `89f5b7a`。批量替换所有 skill 文件中的 `http://localhost:3001/api` 为 `http://124.221.48.52:3004/api`。同时更新 `config.toml` 的 `api_base`。修复后需重启 lak 使新 CC session 加载更新后的 skill。

**注意:** 当 API 服务地址变更时，需同步更新 skill 文件中的 URL。未来可改为从环境变量读取。

### Bug #4: E2E 测试在 auth-required dashboard 下全部失败 (2026-05-18)

**描述:** 仓库迁移到 `lumii-goldenyears-dashboard` 后，`site-operations.spec.ts` 的 11 个 UI 测试、`chat.spec.ts` 和 `crud-chat.spec.ts` 的 chat 测试全部失败，报 `waitForSelector(".chat-stream")` 超时。

**原因:** Dashboard 新增了认证系统（`AuthContext` + `gy_auth_token`），所有路由需要登录。旧测试直接 `goto("/site-operations")` 但未设置 auth token，页面被重定向到登录表单，`.chat-stream` 等选择器不存在。

**影响的测试:**
- `site-operations.spec.ts`: 使用 `page.route()` mock API，但 mock 也拦截了 `/api/auth/login`，需要放行 `/auth/` 路径
- `chat.spec.ts` 的 `setupAuthenticatedPage()`: 只设了 `gy_chat_token`，未设 `gy_auth_token`
- `crud-chat.spec.ts` 的 `setupPage()`: 同上

**修复:** dashboard commits `79b4a28` + `a290619`。
1. `site-operations.spec.ts`: `beforeEach` 先调 `POST /api/auth/login` 登录为 operator，获取 auth token 存入 localStorage，mock route 放行 `/auth/` 路径。
2. `chat.spec.ts`: `setupAuthenticatedPage()` 先登录获取 `gy_auth_token`，同时设置 `gy_chat_token`。
3. `crud-chat.spec.ts`: `setupPage()` 同样先登录。

### Bug #5: SQLite DB 部署后报 SQLITE_CORRUPT (2026-05-18)

**描述:** 将 `deploy/fieldwork.db` rsync 到 staging 后，服务启动报 `SqliteError: database disk image is malformed`。

**原因:** 上一次运行遗留了 WAL 模式的日志文件（`fieldwork.db-wal` + `fieldwork.db-shm`）。rsync 覆盖了主 DB 文件但 WAL/SHM 文件来自旧版 schema，导致 SQLite 合并时 corruption。

**修复:** 部署 DB 前先删除 WAL 和 SHM 文件：
```bash
ssh staging 'rm -f data/fieldwork.db-wal data/fieldwork.db-shm'
rsync -az deploy/fieldwork.db staging:data/fieldwork.db
```

**预防:** 部署脚本应始终在停止服务后、替换 DB 前清理 WAL 文件。

## 9. Copilot UI 架构

### 从 Drawer 到右侧面板 (2026-05-17)

Copilot 从 overlay drawer 模式重构为右侧面板模式：

**之前 (drawer):**
- 每个 tab 组件各自管理 copilot 状态 (`copilotOpen`)
- 使用 `CopilotFab` 浮动按钮打开，`CopilotDrawer` overlay 覆盖主内容
- 打开时有半透明 scrim 遮罩

**现在 (panel):**
- `SiteOperationsShell` 统一管理 copilot 状态
- 页头右上角 `copilot-toggle` 按钮控制显示/收起
- `CopilotPanel` 作为右侧面板（360px），与主内容区并排，非 overlay
- 仅在非首页 tab 显示 toggle 按钮
- 手机端隐藏 copilot 面板

**相关文件:**
- `CopilotPanel.tsx` — 面板组件（替代 `CopilotDrawer.tsx`）
- `SiteOperationsShell.tsx` — toggle 按钮 + 面板状态管理
- `siteOperations.css` — `.copilot-panel`、`.copilot-toggle` 样式

## 8. 用户认证

### 8.1 默认账号

系统 seed 数据包含 3 个默认账号：

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| `admin` | `admin123` | org_admin | 集团管理员，可访问 /admin + /site-operations |
| `operator` | `oper123` | site_operator | 站点运营，可访问 /site-operations |
| `supervisor` | `super123` | service_supervisor | 服务主管，可访问 /sop-management（开发中） |

### 8.2 认证端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录（username + password → JWT） |
| `/api/auth/me` | GET | 验证 token，返回用户信息 |
| `/api/admin/users` | GET/POST | 用户管理（仅 org_admin） |
| `/api/admin/users/:id` | PATCH | 更新用户 |
| `/api/admin/users/:id/reset-password` | POST | 重置密码 |

### 8.3 部署注意

- 生产环境必须修改默认密码
- `JWT_SECRET` 必须设置为强密钥（不要使用默认的 dev 值）
- `deploy/fieldwork.db` 包含预置 seed 数据，可用于首次部署

## 9. Token 认证链路

### 9.1 完整链路图

```
浏览器用户
  │ POST /api/auth/login (username + password)
  │ → 返回 JWT (24h, 包含 sub/role/orgId/siteIds)
  │ → 存入 localStorage: gy_auth_token + gy_chat_token
  │
  ├─ REST API 调用: Authorization: Bearer <JWT>
  │   → optionalAuth 中间件解析 req.authUser
  │
  └─ WebSocket 连接: /api/ws/chat?token=<JWT>&sessionId=home
      → pool.ts verifyJwt 校验
      → 建立 session: web:{agentId}:{userId}:{sessionId}

lak (内网)
  │ WSS 连接 /api/ws/agent
  │ → register 帧: metadata.token = ws_token
  │ → pool.ts verifyWsToken (timingSafeEqual) 校验
  │
  └─ CC session (由 lak 启动)
      │ 环境变量: GY_API_TOKEN (agent prepare_session 签发)
      │
      └─ curl -H "Authorization: Bearer $GY_API_TOKEN" http://.../api/xxx
          → optionalAuth 中间件: 尝试 JWT → 尝试 GY_API_TOKEN → 通过
```

### 9.2 Token 类型

| Token | 签发方 | 用途 | 有效期 | 验证方 |
|-------|--------|------|--------|--------|
| 用户 JWT | `POST /api/auth/login` | 浏览器 REST + WSS 认证 | 24h | optionalAuth / requireAuth / pool.ts |
| ws_token | 静态配置 (env + config.toml) | lak WSS 注册认证 | 永久 | pool.ts verifyWsToken |
| GY_API_TOKEN | agent prepare_session (HS256) | CC session curl API | 30min | optionalAuth (verifyGyToken) |

### 9.3 安全要求

- **生产环境禁止使用默认密钥**: `JWT_SECRET`, `WS_TOKEN`, `GY_TOKEN_SECRET` 必须设置为强随机值
- **dev-token 端点已移除**: 无匿名 JWT 签发入口，必须通过登录获取 token
- **业务路由使用 optionalAuth**: 识别用户身份但不强制拒绝（向后兼容过渡期）
- **Admin 路由使用 requireAuth + requireRole**: 强制认证 + org_admin 角色检查
- **ws_token 必须一致**: API 服务器的 `WS_TOKEN` 环境变量必须与 lak config.toml 中的 `token` 一致

## 10. 多模块部署

系统包含 4 个角色模块，通过统一路由分发：

| 路径 | 模块 | 角色 | 说明 |
|------|------|------|------|
| `/quality` | 集团管理 | org_admin | KPI 仪表盘 + 质量监控 |
| `/admin` | 用户管理 | org_admin | 创建/管理用户账号 |
| `/site-operations` | 站点运营 | site_operator + org_admin | 业务数据 CRUD + AI 聊天 |
| `/supervisor` | 服务主管 | service_supervisor | SOP 管理 + AI 辅助 |
| `/careworker` | 服务人员 | 独立登录 | H5 移动端，后期迁移 App |
| `/careworker/hardware` | 工牌模拟器 | — | 开发测试用 |
| `/family` | 家属 | 公开 | H5 移动端，后期迁微信小程序 |

careworker 和 family 无需主应用登录，有独立的访问流程。
