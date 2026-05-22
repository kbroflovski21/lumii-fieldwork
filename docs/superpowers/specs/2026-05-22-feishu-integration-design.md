# 飞书机器人接入 GoldenYears Copilot

> **Status:** DESIGN
> **Date:** 2026-05-22

**Goal:** 飞书用户通过私聊或群聊 @机器人使用 GoldenYears copilot 全部功能，支持集团管理和服务主管两种角色，角色绑定在 org admin 页面和 copilot 命令中管理。飞书端不输出 gy:// 智能链接。

**Architecture:** 飞书消息通过 lak feishu platform → lifecycle hooks → Codex session，与 dashboard copilot 共用同一套 agent（goldenyears-agent sidecar + Codex + DeepSeek）。角色数据存 Dashboard MySQL，agent 通过 API 查询。

---

## 1. 数据模型

### FeishuUser 表（Prisma）

```prisma
model FeishuUser {
  id        String   @id @default(uuid()) @db.VarChar(64)
  openId    String   @unique @db.VarChar(128)
  name      String   @db.VarChar(128)
  role      String   @default("unset") @db.VarChar(32)  // unset | org_admin | service_supervisor
  siteIds   Json     @default("[]")
  orgId     String   @default("org-001") @db.VarChar(64)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("feishu_users")
}
```

- `role = "unset"`: 已注册但未分配角色，scope_check 返回 deny
- `role = "org_admin"`: 集团管理，siteIds 为空（看全部站点）
- `role = "service_supervisor"`: 服务主管，siteIds 指定可管理的站点

## 2. 飞书用户生命周期

### 自动注册

飞书用户首次给机器人发消息（私聊或群聊 @）时：

1. lak 调用 `scope_check` hook，传 `actor_id = ou_xxx`，`user_name = "张三"`，`platform = "feishu"`
2. agent sidecar 调 Dashboard API `GET /api/feishu-users?openId=ou_xxx`
3. 不存在 → 调 `POST /api/feishu-users` 自动注册（openId + name，role = unset）
4. scope_check 返回 `allow: false, reason: "您的飞书账号尚未分配角色，请联系集团管理员"`

### 已绑定用户

1. scope_check 查到 role != "unset" → 返回 `allow: true, role, siteIds`
2. lak 调用 `prepare_session` hook
3. agent 根据 role 注入环境变量和 system prompt
4. Codex session 处理消息

### 角色变更

管理员在 admin 页面或 copilot 中修改角色 → 下次消息时 scope_check 读到新角色。

## 3. Lifecycle Hook 改造

### scope_check

当前 scope_check 仅从 config.toml 静态查找 actor。改造为：

1. 先查 config.toml actors（兼容现有 dashboard 用户）
2. 如果找不到且 platform = "feishu" → 调 Dashboard API 查 feishu_users
3. 如果 feishu_users 也没有 → 自动注册（POST），返回 deny
4. 如果有但 role = "unset" → 返回 deny + 提示
5. 如果有且 role 有效 → 返回 allow + role + siteIds

请求中新增使用的字段：
- `platform`: "feishu" | "dashboard"
- `user_name`: 飞书昵称（用于自动注册时存名字）

### prepare_session

增加平台感知：

1. 从 lak 请求的 `chat_type` 或 session_key 判断平台
2. 飞书平台时在 system_prompt_fragment 中注入：
   ```
   当前平台: feishu
   【重要】飞书平台不支持应用内导航链接，不要输出 gy:// 格式的链接。直接输出实体名称即可。
   ```
3. 角色为 `service_supervisor` 时注入可管理站点列表

## 4. Agent 指令适配

### CLAUDE.md / AGENTS.md

增加平台适配规则：

```markdown
## 平台适配

当 system prompt 中包含"当前平台: feishu"时：
- 不要输出 gy:// 超链接，直接用文本名称
- 飞书用户无法点击链接跳转页面，只需要文本信息
```

增加集团管理新命令：

```markdown
### 集团管理命令（新增）

| 命令 | 读取文件 | 简介 |
|-----|---------|------|
| /feishu-bindlist | sub-skills/lumii-feishu-bindlist.md | 查看飞书用户绑定列表 |
| /feishu-bind | sub-skills/lumii-feishu-bind.md | 设置飞书用户角色 |
| /feishu-unbind | sub-skills/lumii-feishu-unbind.md | 解除飞书用户角色 |
```

### help_command.go

admin /help 输出中增加 3 条飞书管理命令。

### Sub-skill 文件

**lumii-feishu-bindlist.md:**
- 调 `GET /api/admin/feishu-users` 获取列表
- 输出表格：昵称、角色（未分配/集团管理/服务主管）、站点、注册时间

**lumii-feishu-bind.md:**
- 参数：昵称（必填）、角色（必填：集团管理/服务主管）、站点（服务主管时必填）
- 调 `GET /api/admin/feishu-users?name=张三` 按昵称搜索
- 匹配到唯一用户 → 调 `PATCH /api/admin/feishu-users/:id` 设置角色
- 匹配到多个 → 返回选择列表让用户确认
- 未匹配 → 提示"未找到该飞书用户，请确认该用户已给机器人发过消息"

**lumii-feishu-unbind.md:**
- 参数：昵称
- 调 PATCH 设置 role = "unset"

### 群聊 @指定用户 场景

当集团管理在群里说"@机器人 将@李四设置为集团管理角色"时：
- lak 解析消息中的 @ mention，提取被 @ 用户的 open_id 和昵称
- 消息内容中 @李四 会被替换为 `<at open_id="ou_yyy">李四</at>` 格式
- agent 从消息文本中解析 `<at>` 标签，提取 open_id 和昵称
- 直接调 API 绑定角色，不需要按昵称搜索（有精确 open_id）

## 5. Dashboard API 端点

### 飞书用户管理 API

| 端点 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `GET /api/admin/feishu-users` | GET | requireAuth + org_admin | 列出所有飞书用户，支持 ?name=搜索 |
| `PATCH /api/admin/feishu-users/:id` | PATCH | requireAuth + org_admin | 设置角色和站点 |
| `DELETE /api/admin/feishu-users/:id` | DELETE | requireAuth + org_admin | 删除用户记录 |
| `GET /api/feishu-users` | GET | requireAuth (GY token) | agent 按 openId 查询，?openId=ou_xxx |
| `POST /api/feishu-users` | POST | requireAuth (GY token) | 自动注册：{openId, name} |

## 6. Admin 页面

### QualityPage 新增"飞书管理" Tab

在现有 tab 列表（质量总览/规范管理/站点管理/用户管理）后增加"飞书管理"tab。

**页面内容：**

- 顶部说明文字："管理飞书机器人用户的角色绑定。飞书用户首次给机器人发消息后自动出现在此列表。"
- 表格列：
  | 飞书昵称 | 角色 | 管理站点 | 注册时间 | 操作 |
  |---------|------|---------|---------|------|
  | 张三 | 集团管理 | 全部 | 2026-05-22 | 编辑 / 删除 |
  | 李四 | 未分配 | — | 2026-05-22 | 编辑 / 删除 |
  | 王五 | 服务主管 | 翠苑站 | 2026-05-22 | 编辑 / 删除 |

- "未分配"行用醒目颜色提示（如橙色标签）
- 编辑：弹出 modal，角色下拉（集团管理/服务主管），服务主管时显示站点多选
- 删除：确认对话框

## 7. lak 配置

在 lak config.toml 的 goldenyears 项目中添加 feishu platform：

```toml
[[projects.platforms]]
  type = "feishu"
  [projects.platforms.options]
    app_id = "<飞书应用AppID>"
    app_secret = "<飞书应用AppSecret>"
```

lak feishu platform 自动处理：
- 飞书消息接收和回复
- @ mention 解析
- open_id → actor_id 映射
- 群聊/私聊区分（通过 chat_type 字段）

## 8. 文件改动清单

### lumii-goldenyears-agent

| 文件 | 改动 |
|------|------|
| `internal/hooks/scope_check.go` | 飞书用户查 Dashboard API + 自动注册 |
| `internal/hooks/prepare_session.go` | 注入平台信息到 system prompt |
| `internal/hooks/help_command.go` | admin /help 增加 3 条飞书命令 |
| `CLAUDE.md` / `AGENTS.md` | 平台适配规则 + 飞书管理命令表 |
| `skills/.../prompt.md` | 飞书命令路由表 |
| `skills/.../sub-skills/lumii-feishu-bindlist.md` | **新建** |
| `skills/.../sub-skills/lumii-feishu-bind.md` | **新建** |
| `skills/.../sub-skills/lumii-feishu-unbind.md` | **新建** |

### lumii-goldenyears-dashboard

| 文件 | 改动 |
|------|------|
| `prisma/schema.prisma` | 新增 FeishuUser 模型 |
| `server/routes/feishuUsers.ts` | **新建** — feishu users CRUD API |
| `server/index.ts` | 注册飞书用户路由 |
| `src/quality/QualityPage.tsx` | 新增"飞书管理" tab + 页面 |

### lak 配置（运维）

| 文件 | 改动 |
|------|------|
| lak config.toml | goldenyears 项目添加 feishu platform |

## 9. 测试策略

- **Unit**: scope_check 飞书用户查询/自动注册/角色判断
- **Unit**: prepare_session 平台感知（feishu → 无 gy:// 链接指令）
- **Unit**: feishuUsers API CRUD
- **Integration**: 飞书消息 → scope_check → prepare_session → Codex → 回复不含 gy:// 链接
- **E2E on staging**: lak feishu platform 连接后，私聊发消息验证全链路

## 10. 安全考虑

- feishu_users 表只记录 open_id（飞书应用级别 ID），不存储用户手机号等隐私
- 角色变更操作仅 org_admin 可执行（API 层 requireRole 校验）
- 自动注册不赋予任何权限（role = unset），必须管理员手动分配
- GY_API_TOKEN 的 scope 对飞书用户同样生效（forceSiteId 数据隔离）
