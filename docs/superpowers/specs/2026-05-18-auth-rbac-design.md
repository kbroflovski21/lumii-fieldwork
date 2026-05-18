# 用户登录 & 多角色权限控制设计

**日期：** 2026-05-18
**状态：** Implemented
**实现日期：** 2026-05-18
**范围：** Web 端用户登录、角色权限、管理后台、API 权限校验、lak/CC 集成

## 1. 目标

替代当前的 dev-token 机制，实现完整的用户认证和角色权限控制：

1. 账号密码登录 UI
2. 4 个 Web 端角色：集团管理（org_admin）、站点运营（site_operator）、服务主管（service_supervisor）、服务人员（careworker）
3. 管理后台（/admin）：集团管理员创建和管理用户
4. 前端路由守卫和权限体现
5. API 层按角色和站点过滤数据
6. 与 lak/CC session 的权限集成

## 2. 角色定义

| 角色 | 英文标识 | 页面访问 | 数据范围 |
|------|---------|---------|---------|
| 集团管理 | `org_admin` | `/admin` + `/site-operations` | 机构下所有站点，全操作 |
| 站点运营 | `site_operator` | `/site-operations` | 本站点全操作 |
| 服务主管 | `service_supervisor` | `/sop-management`（同事开发，占位） | 机构级 SOP 管理 |
| 服务人员 | `careworker` | `/careworker` (H5) | 本人任务和服务记录 |

家属不在 Web 端登录，不在本次实现范围。

## 3. 路由与访问控制

```
/login                → LoginPage（未登录用户）
/admin                → AdminPage（仅 org_admin）
/site-operations      → SiteOperationsPage（org_admin + site_operator）
/sop-management       → 占位页面（仅 service_supervisor）
/                     → 根据角色自动跳转
```

未登录访问任何受保护页面 → 重定向到 `/login`。
角色不匹配 → 显示 403 页面。

## 4. 数据库设计

### 4.1 users 表

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('org_admin', 'site_operator', 'service_supervisor')),
  org_id TEXT NOT NULL DEFAULT 'org-001',
  site_ids TEXT NOT NULL DEFAULT '[]',
  phone TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

`site_ids` 存储 JSON 数组字符串，如 `["site-001", "site-002"]`。
`org_admin` 的 `site_ids` 为其机构下的全部站点。
密码使用 bcrypt 哈希存储。

### 4.2 Seed 数据

```
admin / admin123     → org_admin, org-001, ["site-001"]
operator / oper123   → site_operator, org-001, ["site-001"]
supervisor / super123 → service_supervisor, org-001, ["site-001"]
```

## 5. API 设计

### 5.1 认证端点

```
POST /api/auth/login
  Body: { username, password }
  Response: { token, user: { id, name, role, orgId, siteIds } }
  Error: 401 { error: "用户名或密码错误" }

GET /api/auth/me
  Header: Authorization: Bearer <JWT>
  Response: { user: { id, username, name, role, orgId, siteIds, status } }
```

### 5.2 用户管理端点（仅 org_admin）

```
GET    /api/admin/users              → 列表（同机构）
POST   /api/admin/users              → 创建用户
PATCH  /api/admin/users/:id          → 更新用户（名称、角色、站点、状态）
POST   /api/admin/users/:id/disable  → 禁用用户
POST   /api/admin/users/:id/reset-password → 重置密码
```

### 5.3 权限中间件

```typescript
// 验证 JWT，附加 req.user
function requireAuth(secret: string): RequestHandler

// 检查角色
function requireRole(...roles: string[]): RequestHandler

// 按 siteIds 过滤（附加到 SQL WHERE）
function filterBySite(): RequestHandler
```

现有 6 个业务路由（socialWorkers, smartBadges, serviceObjects, serviceSchedules, serviceRecords, home）需要加上 `requireAuth` + `filterBySite` 中间件。

**权限矩阵（API 层）：**

| 端点前缀 | org_admin | site_operator | service_supervisor |
|---------|:---------:|:-------------:|:--------------:|
| `/api/admin/*` | 全权限 | 403 | 403 |
| `/api/social-workers` GET | 全站点 | 本站点 | 本站点只读 |
| `/api/social-workers` POST/PATCH | 全站点 | 本站点 | 403 |
| `/api/smart-badges` GET | 全站点 | 本站点 | 本站点只读 |
| `/api/smart-badges` POST/PATCH | 全站点 | 本站点 | 403 |
| `/api/service-objects` GET | 全站点 | 本站点 | 本站点只读 |
| `/api/service-objects` POST/PATCH | 全站点 | 本站点 | 403 |
| `/api/service-schedule-occurrences` | 同上 | 同上 | 同上 |
| `/api/service-records` GET | 全站点(无音频) | 本站点 | 本站点 SOP 相关 |
| `/api/service-records` PATCH/review | 全站点 | 本站点 | 本站点 SOP 复核 |
| `/api/service-records/export` | 403 | 本站点 | 403 |

## 6. JWT 设计

### 6.1 用户 JWT（登录后签发）

```
算法: HS256
密钥: JWT_SECRET 环境变量
有效期: 24 小时

Payload:
{
  sub: "user-001",
  username: "operator",
  name: "站点运营员",
  role: "site_operator",
  orgId: "org-001",
  siteIds: ["site-001"],
  iat: ...,
  exp: ...
}
```

用于前端 → API 认证，也用于 WebSocket 连接认证。

### 6.2 GY_API_TOKEN（agent prepare_session 签发）

保持现有设计不变。agent 从 JWT payload 读取 role/siteIds，签发 GY_API_TOKEN 给 CC session。

## 7. 前端设计

### 7.1 文件结构

```
src/
├── App.tsx                    # 路由分发
├── auth/
│   ├── AuthProvider.tsx       # React Context (user, token, login, logout)
│   ├── useAuth.ts             # hook
│   ├── RequireAuth.tsx        # 路由守卫组件
│   ├── RequireRole.tsx        # 角色守卫组件
│   └── LoginPage.tsx          # 登录页面
├── admin/
│   ├── AdminPage.tsx          # 管理后台布局
│   ├── UserList.tsx           # 用户列表
│   ├── UserForm.tsx           # 创建/编辑用户
│   └── admin.css
├── features/siteOperations/   # 现有（无需大改）
│   ├── SiteOperationsPage.tsx
│   └── ...
```

### 7.2 AuthProvider

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface User {
  id: string;
  username: string;
  name: string;
  role: "org_admin" | "site_operator" | "service_supervisor";
  orgId: string;
  siteIds: string[];
}

function AuthProvider({ children }) {
  // 初始化: 从 localStorage 读取 token → GET /api/auth/me 验证
  // login(username, password): POST /api/auth/login → 存 token → 设 user
  // logout(): 清除 token + user → 跳转 /login
}
```

### 7.3 登录页

简洁的居中登录表单：
- 产品 logo + "GoldenYears 金色年华"
- 用户名输入框
- 密码输入框
- 登录按钮
- 错误提示
- 登录成功后根据角色跳转：
  - `org_admin` → `/admin`
  - `site_operator` → `/site-operations`
  - `service_supervisor` → `/sop-management`

### 7.4 管理后台（/admin）

集团管理员专用页面，包含：

**用户列表**：表格展示所有用户（姓名、用户名、角色、站点、状态）
**创建用户**：表单（用户名、密码、姓名、角色下拉、站点多选、手机号）
**编辑用户**：修改姓名、角色、站点、手机号
**禁用/启用**：切换用户状态
**重置密码**：管理员重置某用户密码

### 7.5 站点运营页权限体现

- `org_admin` 看到所有站点数据，可操作
- `site_operator` 看到本站点数据，可操作
- `service_supervisor` 不能访问此页面（路由守卫拦截）
- 现有的 `permissionState: "full" | "read_only" | "restricted"` 机制继续使用

### 7.6 Copilot/Chat 权限

WebSocket 连接使用用户 JWT（包含 role + siteIds），lak 通过 agent scope_check 验证权限，CC session 的 prepare_session 注入角色上下文。无需额外改动。

## 8. 与 lak/CC 集成

### 8.1 WebSocket 连接

当前 pool.ts 的 `verifyJwt` 已从 token 解析 userId。改为同时解析 role + siteIds，传入 Bridge 消息让 lak 使用。

### 8.2 Agent scope_check

修改 goldenyears-agent 的 scope_check：
- 不再查本地 config.toml 的 actor 列表
- 改为从 lak 转发的消息中读取 role + siteIds（lak 从 JWT payload 提取）
- 如果 role 不在允许的角色列表中 → deny

### 8.3 Agent prepare_session

已有实现，无需大改。根据 role 生成不同的 system prompt fragment。

## 9. 实现分阶段

| Phase | 内容 | 依赖 |
|-------|------|------|
| P1 | users 表 + seed + bcrypt + login API + JWT | 无 |
| P2 | requireAuth/requireRole 中间件 + 现有路由加权限 | P1 |
| P3 | 前端 AuthProvider + LoginPage + 路由守卫 | P1 |
| P4 | Admin 页面（用户管理 CRUD） | P1 + P3 |
| P5 | 站点运营页权限体现（read_only/restricted 按角色设置） | P2 + P3 |
| P6 | lak/CC 集成（scope_check 读 JWT 角色） | P2 |
| P7 | E2E 测试（登录流程 + 权限校验 + 管理后台） | 全部 |

## 10. 安全考虑

- 密码: bcrypt hash（cost=10）
- JWT: HS256 签名，24h 过期，不含敏感信息
- XSS: token 存 localStorage（非 httpOnly cookie），前端不渲染 raw HTML
- CSRF: API 使用 Authorization header，不依赖 cookie
- 暴力破解: 初期不做限流，后续可加
- 密码策略: 最少 6 位，初期不强制复杂度

## 11. 已知问题与修复

**Bug #1: requireAuth 中间件范围过大**
- 描述: `app.use("/api", authMw, adminRoutes())` 导致所有 `/api/*` 请求都需要认证，包括 `/api/health` 和 `/api/auth/login`
- 原因: Express 的 `app.use("/api", middleware, router)` 对所有匹配 `/api` 的请求先执行 middleware，不管 router 内是否有匹配路由
- 修复: 将 authMw 限定到 `/api/admin` 路径：`app.use("/api/admin", authMw)` + `app.use("/api", adminRoutes())`

**Bug #2: 登录后路由未正确跳转**
- 描述: org_admin 登录后应看到 AdminPage，实际看到的是 SiteOperationsPage
- 原因: 登录成功后 `user` 状态更新触发重新渲染，但 `window.location.pathname` 仍为 `/`（根路径）。代码只检查 `path === "/login"` 但登录页实际在 `/`
- 修复: App.tsx 路由中增加 `path === "/"` 的判断，直接根据角色渲染对应页面而非使用 `window.location.href` 重定向

**Bug #3: dev-token 后门未完全清除**
- 描述: `GET /api/auth/dev-token` 端点无需认证即可签发 JWT，`chatToken.ts` 和 `useAgentChat.ts` 在无 token 时自动调用该端点获取匿名 token，`HomeArea.tsx` 和 `CopilotPanel.tsx` fallback 到字符串 `"dev-token"`
- 原因: 开发阶段为方便调试添加，上线权限系统后忘记移除
- 修复:
  1. 删除 `GET /api/auth/dev-token` 端点（server/index.ts）
  2. 删除 `chatToken.ts` 中的 `fetchDevToken()` 逻辑，改为纯 `localStorage.getItem`
  3. 删除 `useAgentChat.ts` 中的 dev-token fallback fetch
  4. 删除 `HomeArea.tsx` 和 `CopilotPanel.tsx` 中 `?? "dev-token"` fallback，改为 `?? ""`
  5. 删除 `server/index.ts` 中未使用的 `signJwt` import
  6. 测试 `beforeEach` 中通过 `localStorage.setItem` 注入 mock token

**Bug #4: E2E 测试中 logout 按钮选择器失效**
- 描述: logout 按钮从顶部栏移到左侧栏底部头像菜单后，E2E 测试找不到 `.so-shell__logout` 选择器
- 原因: 用户档案 UI 重构，logout 按钮不再是独立元素，而是头像下拉菜单的最后一个按钮
- 修复: E2E 选择器改为 `.so-shell__avatar` (点击头像) → `.so-shell__profile-menu button:last-child` (点击退出)
