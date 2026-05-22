# Feishu Bot Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Feishu bot users to use GoldenYears copilot with role-based access (org_admin / service_supervisor), managed via admin page and copilot commands.

**Architecture:** Feishu messages → lak feishu platform → lifecycle hooks (scope_check queries Dashboard MySQL for role, prepare_session injects platform context) → Codex session. Dashboard provides FeishuUser CRUD API + admin UI tab. Agent provides /feishu-bind* copilot commands.

**Tech Stack:** TypeScript (Dashboard API + React), Go (Agent hooks), Prisma (MySQL), lak config (TOML)

---

## File Map

### Dashboard (lumii-goldenyears-dashboard)

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add FeishuUser model |
| `server/routes/feishuUsers.ts` | Create | Feishu user CRUD API (admin + agent endpoints) |
| `server/index.ts` | Modify | Register feishu user routes |
| `tests/routes/feishu-users.test.ts` | Create | API unit tests |
| `src/quality/QualityPage.tsx` | Modify | Add "飞书管理" tab |

### Agent (lumii-goldenyears-agent)

| File | Action | Responsibility |
|------|--------|----------------|
| `internal/hooks/scope_check.go` | Modify | Feishu user lookup via HTTP + auto-register |
| `internal/hooks/prepare_session.go` | Modify | Platform-aware system prompt |
| `internal/hooks/help_command.go` | Modify | Add 3 feishu commands to admin help |
| `internal/hooks/hooks_test.go` | Modify | Tests for feishu scope_check + platform prompt |
| `CLAUDE.md` / `AGENTS.md` | Modify | Platform rules + feishu commands |
| `skills/.../prompt.md` | Modify | Feishu command routing table |
| `skills/.../sub-skills/lumii-feishu-bindlist.md` | Create | Bindlist sub-skill |
| `skills/.../sub-skills/lumii-feishu-bind.md` | Create | Bind sub-skill |
| `skills/.../sub-skills/lumii-feishu-unbind.md` | Create | Unbind sub-skill |

### Ops (staging server)

| File | Action | Responsibility |
|------|--------|----------------|
| lak config.toml (18.142.48.45) | Modify | Add feishu platform to goldenyears project |

---

## Task 1: Prisma FeishuUser Model + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add FeishuUser model to schema**

At the end of `prisma/schema.prisma`, before the closing:

```prisma
model FeishuUser {
  id        String   @id @default(uuid()) @db.VarChar(64)
  openId    String   @unique @map("open_id") @db.VarChar(128)
  name      String   @db.VarChar(128)
  role      String   @default("unset") @db.VarChar(32)
  siteIds   Json     @default("[]") @map("site_ids")
  orgId     String   @default("org-001") @map("org_id") @db.VarChar(64)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("feishu_users")
}
```

- [ ] **Step 2: Generate Prisma client + push schema**

```bash
npx prisma db push --accept-data-loss
npx prisma generate
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add FeishuUser model for feishu bot role binding"
```

---

## Task 2: Feishu Users API Routes + Tests

**Files:**
- Create: `server/routes/feishuUsers.ts`
- Create: `tests/routes/feishu-users.test.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Write failing tests**

`tests/routes/feishu-users.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { signJwt, signGyToken } from "../../server/ws/auth";

const JWT_SECRET = "test-jwt-secret";
const GY_SECRET = "test-gy-secret";

// Tests will be filled after route implementation pattern is clear
// Key test cases:
// 1. GET /api/admin/feishu-users — requires org_admin
// 2. GET /api/admin/feishu-users — 403 for non-admin
// 3. PATCH /api/admin/feishu-users/:id — set role
// 4. DELETE /api/admin/feishu-users/:id — remove
// 5. GET /api/feishu-users?openId=xxx — agent lookup
// 6. POST /api/feishu-users — auto-register
```

- [ ] **Step 2: Implement feishuUsers route**

`server/routes/feishuUsers.ts`:

```typescript
import { Router } from "express";
import { prisma } from "../db/prisma";

export function feishuUsersRoutes() {
  const r = Router();

  // Admin: list all feishu users
  r.get("/admin/feishu-users", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }
    const name = req.query.name as string | undefined;
    const where: any = {};
    if (name) where.name = { contains: name };
    const rows = await prisma.feishuUser.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json({ feishuUsers: rows });
  });

  // Admin: update role + siteIds
  r.patch("/admin/feishu-users/:id", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }
    const { role, siteIds, name } = req.body;
    const data: any = {};
    if (role !== undefined) data.role = role;
    if (siteIds !== undefined) data.siteIds = siteIds;
    if (name !== undefined) data.name = name;
    if (Object.keys(data).length > 0) {
      await prisma.feishuUser.update({ where: { id: req.params.id }, data });
    }
    const row = await prisma.feishuUser.findFirst({ where: { id: req.params.id } });
    res.json(row);
  });

  // Admin: delete
  r.delete("/admin/feishu-users/:id", async (req, res) => {
    const user = (req as any).authUser;
    if (!user || user.role !== "org_admin") {
      res.status(403).json({ error: "无权限" });
      return;
    }
    await prisma.feishuUser.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  });

  // Agent: lookup by openId
  r.get("/feishu-users", async (req, res) => {
    const openId = req.query.openId as string | undefined;
    if (!openId) { res.status(400).json({ error: "openId required" }); return; }
    const row = await prisma.feishuUser.findFirst({ where: { openId } });
    res.json({ feishuUser: row });
  });

  // Agent: auto-register
  r.post("/feishu-users", async (req, res) => {
    const { openId, name } = req.body;
    if (!openId) { res.status(400).json({ error: "openId required" }); return; }
    const existing = await prisma.feishuUser.findFirst({ where: { openId } });
    if (existing) { res.json(existing); return; }
    const row = await prisma.feishuUser.create({
      data: { openId, name: name ?? openId, role: "unset", siteIds: [] },
    });
    res.status(201).json(row);
  });

  return r;
}
```

- [ ] **Step 3: Register routes in server/index.ts**

Add import and registration after existing admin routes:

```typescript
import { feishuUsersRoutes } from "./routes/feishuUsers";
// ... after adminRoutes registration:
app.use("/api", feishuUsersRoutes());
```

Note: feishuUsersRoutes is registered after authMw on `/api/admin` prefix so admin endpoints get auth. The `/api/feishu-users` endpoints are under the general authMw.

- [ ] **Step 4: Run tests, verify API**

```bash
npx vitest run tests/routes/feishu-users.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/feishuUsers.ts server/index.ts tests/routes/feishu-users.test.ts
git commit -m "feat: feishu users CRUD API for role binding"
```

---

## Task 3: Agent scope_check — Feishu User Lookup

**Files:**
- Modify: `internal/hooks/scope_check.go`
- Modify: `internal/hooks/hooks_test.go`

- [ ] **Step 1: Add ScopeCheckRequest fields for platform + user_name**

Update `ScopeCheckRequest` struct:

```go
type ScopeCheckRequest struct {
    ActorID    string `json:"actor_id"`
    SessionKey string `json:"session_key"`
    Platform   string `json:"platform"`
    UserName   string `json:"user_name"`
}
```

- [ ] **Step 2: Add HTTP client for feishu user lookup**

Add function to scope_check.go:

```go
func lookupFeishuUser(apiBase, actorID, userName string) (*ScopeCheckResponse, error) {
    // GET /api/feishu-users?openId=actorID
    resp, err := http.Get(apiBase + "/api/feishu-users?openId=" + url.QueryEscape(actorID))
    if err != nil { return nil, err }
    defer resp.Body.Close()
    var result struct { FeishuUser *struct {
        ID      string   `json:"id"`
        OpenId  string   `json:"openId"`
        Name    string   `json:"name"`
        Role    string   `json:"role"`
        SiteIds []string `json:"siteIds"`
    } `json:"feishuUser"` }
    json.NewDecoder(resp.Body).Decode(&result)

    if result.FeishuUser == nil {
        // Auto-register
        body, _ := json.Marshal(map[string]string{"openId": actorID, "name": userName})
        http.Post(apiBase+"/api/feishu-users", "application/json", bytes.NewReader(body))
        return &ScopeCheckResponse{Allow: false, Reason: "您的飞书账号尚未分配角色，请联系集团管理员"}, nil
    }

    if result.FeishuUser.Role == "unset" {
        return &ScopeCheckResponse{Allow: false, Reason: "您的飞书账号尚未分配角色，请联系集团管理员"}, nil
    }

    return &ScopeCheckResponse{
        Allow:     true,
        Role:      result.FeishuUser.Role,
        SiteIDs:   result.FeishuUser.SiteIds,
        ActorName: result.FeishuUser.Name,
    }, nil
}
```

- [ ] **Step 3: Update handler to call feishu lookup when actor not in config**

```go
actor := cfg.LookupActor(req.ActorID)
if actor == nil && req.Platform == "feishu" {
    feishuResp, err := lookupFeishuUser(cfg.APIBase, req.ActorID, req.UserName)
    if err != nil {
        json.NewEncoder(w).Encode(ScopeCheckResponse{Allow: false, Reason: "内部错误"})
        return
    }
    json.NewEncoder(w).Encode(feishuResp)
    return
}
```

- [ ] **Step 4: Write tests**

Add to hooks_test.go: test with platform="feishu" and mock HTTP server.

- [ ] **Step 5: Run tests**

```bash
go test ./internal/hooks/ -v -count=1
```

- [ ] **Step 6: Commit**

```bash
git add internal/hooks/scope_check.go internal/hooks/hooks_test.go
git commit -m "feat: scope_check queries dashboard API for feishu users"
```

---

## Task 4: Agent prepare_session — Platform Awareness

**Files:**
- Modify: `internal/hooks/prepare_session.go`
- Modify: `internal/hooks/hooks_test.go`

- [ ] **Step 1: Add platform field to PrepareSessionRequest**

```go
type PrepareSessionRequest struct {
    ActorID          string   `json:"actor_id"`
    Role             string   `json:"role"`
    SiteIDs          []string `json:"site_ids"`
    SessionKey       string   `json:"session_key"`
    HasActiveSession bool     `json:"has_active_session"`
    Platform         string   `json:"platform"`
}
```

- [ ] **Step 2: Add platform to buildSystemPromptFragment**

Update signature and add feishu block:

```go
func buildSystemPromptFragment(role, scope, siteID, platform string, siteIDs []string) string {
    // ... existing code ...
    platformNote := ""
    if platform == "feishu" {
        platformNote = "\n当前平台: feishu\n【重要】飞书平台不支持应用内导航链接，不要输出 gy:// 格式的链接。直接输出实体名称即可。"
    }
    // append platformNote to the fragment
}
```

- [ ] **Step 3: Detect platform from session_key or request field**

In the handler, detect platform: if session_key contains "feishu:" or req.Platform == "feishu":

```go
platform := ""
if strings.Contains(req.SessionKey, "feishu:") || req.Platform == "feishu" {
    platform = "feishu"
}
```

- [ ] **Step 4: Write test for feishu platform prompt**

```go
func TestPrepareSession_FeishuPlatform(t *testing.T) {
    // Verify system_prompt_fragment contains "当前平台: feishu"
    // Verify no gy:// instruction
}
```

- [ ] **Step 5: Commit**

```bash
git add internal/hooks/prepare_session.go internal/hooks/hooks_test.go
git commit -m "feat: prepare_session injects platform context for feishu"
```

---

## Task 5: Agent Commands + Sub-skills

**Files:**
- Modify: `internal/hooks/help_command.go`
- Modify: `CLAUDE.md`, `AGENTS.md`
- Modify: `skills/goldenyears-orchestrator/prompt.md`
- Create: `skills/.../sub-skills/lumii-feishu-bindlist.md`
- Create: `skills/.../sub-skills/lumii-feishu-bind.md`
- Create: `skills/.../sub-skills/lumii-feishu-unbind.md`

- [ ] **Step 1: Add feishu commands to help_command.go admin help**

Add after existing admin commands in `adminHelp` const:

```go
- ` + "`/feishu-bindlist`" + ` — 查看飞书用户绑定列表
- ` + "`/feishu-bind`" + ` — 设置飞书用户角色
- ` + "`/feishu-unbind`" + ` — 解除飞书用户角色绑定
```

- [ ] **Step 2: Create lumii-feishu-bindlist.md**

```markdown
# /lumii-feishu-bindlist

查看所有飞书用户及其角色绑定状态。

## Execution

curl -s -H "Authorization: Bearer $GY_API_TOKEN" \
  "http://124.221.48.52:3004/api/admin/feishu-users"

## Output Format

| 序号 | 飞书昵称 | 角色 | 管理站点 | 注册时间 |
|---|---|---|---|---|
| 1 | 张三 | 集团管理 | 全部 | 2026-05-22 |
| 2 | 李四 | 未分配 | — | 2026-05-22 |

角色翻译:
- unset → 未分配
- org_admin → 集团管理
- service_supervisor → 服务主管
```

- [ ] **Step 3: Create lumii-feishu-bind.md**

```markdown
# /lumii-feishu-bind

设置飞书用户的角色。

## Parameters
- name: (必填) 飞书昵称
- role: (必填) 角色，可选值: 集团管理, 服务主管
- site_ids: (服务主管时必填) 管理站点 ID 列表

## Execution

### 按昵称搜索
curl -s -H "Authorization: Bearer $GY_API_TOKEN" \
  "http://124.221.48.52:3004/api/admin/feishu-users?name=${NAME}"

### 设置角色
curl -s -X PATCH -H "Authorization: Bearer $GY_API_TOKEN" \
  -H "Content-Type: application/json" \
  "http://124.221.48.52:3004/api/admin/feishu-users/${USER_ID}" \
  -d '{"role":"${ROLE}","siteIds":${SITE_IDS}}'

角色映射:
- 集团管理 → org_admin (siteIds=[])
- 服务主管 → service_supervisor (siteIds=用户指定)

如果搜索到多个同名用户，列出让用户选择。
如果没搜到，提示"未找到该飞书用户，请确认该用户已给机器人发过消息"。
```

- [ ] **Step 4: Create lumii-feishu-unbind.md**

```markdown
# /lumii-feishu-unbind

解除飞书用户的角色绑定（设为未分配）。

## Parameters
- name: (必填) 飞书昵称

## Execution

### 按昵称搜索
curl -s -H "Authorization: Bearer $GY_API_TOKEN" \
  "http://124.221.48.52:3004/api/admin/feishu-users?name=${NAME}"

### 解除绑定
curl -s -X PATCH -H "Authorization: Bearer $GY_API_TOKEN" \
  -H "Content-Type: application/json" \
  "http://124.221.48.52:3004/api/admin/feishu-users/${USER_ID}" \
  -d '{"role":"unset","siteIds":[]}'
```

- [ ] **Step 5: Update CLAUDE.md + AGENTS.md**

Add platform rules section and feishu commands to the admin command table.

- [ ] **Step 6: Update prompt.md**

Add feishu commands to the routing table.

- [ ] **Step 7: Run help command test**

```bash
go test ./internal/hooks/ -run HelpCommand -v
```

- [ ] **Step 8: Commit**

```bash
git add internal/hooks/help_command.go CLAUDE.md AGENTS.md \
  skills/goldenyears-orchestrator/prompt.md \
  skills/goldenyears-orchestrator/sub-skills/lumii-feishu-bind*.md
git commit -m "feat: feishu bind/unbind commands + platform adaptation rules"
```

---

## Task 6: Admin Page — 飞书管理 Tab

**Files:**
- Modify: `src/quality/QualityPage.tsx`

- [ ] **Step 1: Add "feishu" to View type and labels**

```typescript
type View = "dashboard" | "sop" | "sites" | "users" | "feishu";

const VIEW_LABELS: Record<View, string> = {
  dashboard: "质量总览",
  sop: "规范管理",
  sites: "站点管理",
  users: "用户管理",
  feishu: "飞书管理",
};
```

- [ ] **Step 2: Add FeishuView component**

Table with: 飞书昵称, 角色 (dropdown), 管理站点, 注册时间, 操作 (编辑/删除).
Edit modal: role dropdown + siteIds multi-select (shown for service_supervisor).

- [ ] **Step 3: Add tab button in nav**

Add feishu tab button after users tab.

- [ ] **Step 4: Build and verify**

```bash
npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add src/quality/QualityPage.tsx
git commit -m "feat: feishu management tab in admin page"
```

---

## Task 7: lak Config + Deploy + E2E Verify

**Files:**
- Modify: lak config.toml on 18.142.48.45
- Deploy: dashboard + agent to staging

- [ ] **Step 1: Add feishu platform to lak config**

```toml
  [[projects.platforms]]
    type = "feishu"
    [projects.platforms.options]
      app_id = "cli_aa9ab0f3d8badcd8"
      app_secret = "L11WIav2w7yzQwLWq3veWdZYoMXl7nLl"
```

- [ ] **Step 2: Push schema to staging MySQL**

```bash
ssh ubuntu@124.221.48.52 "cd /home/ubuntu/lumii-goldenyears-dashboard && npx prisma db push"
```

- [ ] **Step 3: Deploy dashboard (dist + server)**

```bash
npx vite build
rsync -az --delete dist/ ubuntu@124.221.48.52:.../dist/
rsync -az server/ ubuntu@124.221.48.52:.../server/
# restart server
```

- [ ] **Step 4: Deploy agent (binary + skills)**

```bash
go build -a -o bin/goldenyears-agent ./cmd/agent/
scp bin/goldenyears-agent coder@18.142.48.45:.../bin/
rsync -az --delete skills/ coder@18.142.48.45:.../skills/
scp CLAUDE.md AGENTS.md coder@18.142.48.45:...
# restart agent + lak
```

- [ ] **Step 5: E2E verify API**

```bash
# Test feishu user auto-register
curl -s -X POST .../api/feishu-users -H "Authorization: Bearer $GY_TOKEN" \
  -d '{"openId":"ou_test","name":"测试用户"}'

# Test admin list
curl -s .../api/admin/feishu-users -H "Authorization: Bearer $ADMIN_TOKEN"

# Test role bind
curl -s -X PATCH .../api/admin/feishu-users/$ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"role":"org_admin"}'
```

- [ ] **Step 6: E2E verify feishu bot**

Send a message to the feishu bot → verify scope_check fires → verify auto-register.

- [ ] **Step 7: Commit all config changes**

```bash
git add -A && git commit -m "feat: feishu bot integration complete"
git push
```
