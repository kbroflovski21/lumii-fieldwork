# 2026-05-20/21 Bug Fixes & Changes

**Date:** 2026-05-20 ~ 2026-05-21
**Last updated:** 2026-05-21

## Bug 15: WIP typing dots invisible

- **Description:** The WIP typing animation dots used grey (#9CA3AF) on a light grey background (#F8F9FB), producing near-zero contrast. Users could not see when the agent was processing.
- **Impact:** Users had no visual indication that the agent was working.
- **Fix:** Changed dot color to indigo (#6366F1), increased size to 8px, and added higher bounce animation for better visibility.
- **File:** `src/features/siteOperations/ChatStream.tsx`, `siteOperations.css`

## Bug 16: `/help` duplicate messages

- **Description:** When an agent responded to `/help`, both the `stream_end` and `message` WebSocket events created assistant bubbles, resulting in duplicate help text.
- **Root cause:** The `useAgentChat` message handler did not deduplicate between streamed and final message events sharing the same content.
- **Fix:** Added ID-based dedup (skip `message` if `msg_id` already exists from stream) and content-based dedup (if last assistant message has identical content, update its ID instead of appending).
- **File:** `src/features/siteOperations/useAgentChat.ts`

## Bug 17: Admin API returns careworker users

- **Description:** `GET /admin/users` returned all users including careworkers. The admin user list was cluttered with service worker accounts that are managed separately.
- **Impact:** Admin dashboard showed hundreds of careworker accounts mixed with operator/admin accounts.
- **Fix:** Default behavior now excludes careworkers (`WHERE role != 'careworker'`). Opt-in via `?include_careworker=true` query param.
- **File:** `server/routes/admin.ts`

## Bug 18: Mobile copilot squeezes background content

- **Description:** When copilot panel opened on mobile, the `data-copilot-open` attribute changed the grid to 3 columns, squeezing the main content area to near-invisible width.
- **Fix:** Added mobile override that forces `grid-template-columns: 1fr` regardless of copilot state, so main content stays full-width on mobile.
- **File:** `src/features/siteOperations/siteOperations.css`

## Bug 19: lak CC session runs as root

- **Description:** The `claudecode` agent type in lumii-agent-keeper spawned Claude Code as root with no user credentials, causing permission and session issues.
- **Fix:** Added `core/ccuser.go` with `setpriv` + `env HOME=...` wrapper to run CC as the correct user. Binary path resolved via `resolveCCUserBinary`.
- **File:** (lumii-agent-keeper repo) `core/ccuser.go`

---

## Features Shipped

### Site Picker Redesign
- Moved site selector from header center to left alignment.
- Replaced "Lumii 站点运营助手" text with site avatar + name + dropdown chevron.
- Dropdown shows card-style items with avatars, green status dots for connected agents, and "当前" badge for active site.

### Copilot Header Input
- Replaced the toggle button with an inline input field in the header.
- Input width matches the copilot panel width.
- Layout: bot icon + text field + send button.

### Mobile Copilot
- Header input hidden on mobile (<768px).
- Floating FAB button in bottom-right corner.
- Bottom-sheet copilot panel (65vh height, slide-up animation, backdrop overlay).
- Mobile grid override prevents content squeeze.

### Copilot Shared Session
- Single session per user+site (key format: `copilot:{siteId}`).
- CopilotPanel refactored to pure presentation component (no internal useAgentChat).
- useAgentChat lifted to shell level (SiteOperationsShell / QualityPage).
- Tab context sent as `[ctx:label]` prefix, stripped from optimistic UI bubble.

### Home Page Redesign
- Removed embedded chat and sidebar drawer.
- New layout: 4-column KPI cards with clickable links and period toggle (week/month).
- Worker quality scoring table (sortable by name, score, records).
- Worker detail modal with S-score trend chart (recharts).

### Org Admin Copilot
- Shared copilot with session key `copilot:admin`.
- Admin-specific slash commands (8 commands via ADMIN_COMMANDS).
- Lifecycle hooks for GY_API_TOKEN injection.

### Slash Commands System
- `/help` plus 15 site-ops commands and 8 admin commands.
- Frontend `CommandInput` accepts `commands` prop for different command sets per page.
- Autocomplete menu with keyboard navigation (Arrow Up/Down, Tab, Enter, Escape).

---

## Bug Fixes (2026-05-21)

### Bug 20: Message dedup race condition (stream_end vs message)

- **Description:** `stream_end` and `message` WebSocket events arrive ~17ms apart. React state batching means the `prev` state in the `message` handler still has `isStreaming:true` for the same message, so the dedup check (which relied on `isStreaming` flag) failed, creating duplicate assistant bubbles.
- **Root cause:** Content-based dedup was keyed on `isStreaming` state which hadn't updated yet due to React batching.
- **Fix:** Changed dedup to use `findIndex` matching ALL assistant messages by content, regardless of `isStreaming` flag. If an assistant message with identical content exists, update its ID instead of appending.
- **File:** `src/features/siteOperations/useAgentChat.ts`

### Bug 21: WIP typing dots invisible (root cause: stale in_flight streams)

- **Description:** The WIP typing dots never appeared because `messages.some(m => m.isStreaming)` was always true, suppressing the standalone typing indicator.
- **Root cause:** The `init` frame handler restored 12 stale in-flight streams as `isStreaming:true` messages. These never completed, so `messages.some(m => m.isStreaming)` was permanently true.
- **Fix:** Removed in_flight stream restoration from the init handler. The server should re-send active streams as new `stream_start` events after reconnect.
- **File:** `src/features/siteOperations/useAgentChat.ts`

### Bug 22: Typing dots low contrast

- **Description:** Typing animation dots used grey (#9CA3AF) on light grey background (#F8F9FB), near-zero contrast.
- **Fix:** Changed dot color to indigo (#6366F1), increased size to 8px, added higher bounce animation.
- **File:** `src/features/siteOperations/siteOperations.css`

### Bug 23: gy:// links open new tab instead of in-app navigation

- **Description:** Clicking a `gy://` link opened a new browser tab instead of navigating within the app.
- **Root cause:** ReactMarkdown's default `urlTransform` sanitizer strips non-standard URL schemes. `gy://social_workers?search=王丽` became an empty string, which fell through to the default `<a target="_blank">` rendering.
- **Fix:** (a) Added `urlTransform={(url) => url}` to bypass ReactMarkdown's sanitizer. (b) Changed the gy:// link renderer from `<a>` to `<span role="link">` to avoid any default browser link behavior.
- **File:** `src/features/siteOperations/ChatStream.tsx`

### Bug 24: Admin API 403 with GY token

- **Description:** CC agent's GY_API_TOKEN was rejected with 403 when calling admin API endpoints.
- **Root cause:** Two issues: (a) The agent binary signed the GY token with an empty `role` field because lumii-agent-keeper doesn't send role in the lifecycle hook. The `requireAuth` middleware defaulted empty role to `site_operator`, which failed `requireRole("org_admin")`. (b) `optionalAuth` middleware (applied earlier in the middleware chain) overwrote the `req.authUser` set by `requireAuth`, because it didn't check if `authUser` was already set.
- **Fix:** (a) `requireAuth` now infers `role` from GY token: if role is empty but scope is `admin`, defaults to `org_admin`. (b) `optionalAuth` now skips processing if `req.authUser` is already set (`if (req.authUser) { next(); return; }`).
- **File:** `server/middleware/requireAuth.ts`, `server/middleware/optionalAuth.ts`

### Bug 25: requireAuth didn't support GY tokens

- **Description:** `requireAuth` middleware only verified user JWTs. CC sessions using GY_API_TOKEN were always rejected.
- **Fix:** Added optional `gyTokenSecret` parameter to `requireAuth`. If JWT verification fails, falls back to `verifyGyToken` with the GY secret.
- **File:** `server/middleware/requireAuth.ts`, `server/index.ts`

### Bug 26: Historical messages show [ctx:] prefix

- **Description:** When loading historical messages from DB, the `toMessage` function returned raw content including the `[ctx:label]` prefix, which was visible in the chat UI.
- **Fix:** Strip `[ctx:...]` prefix from `content` for user role messages in `toMessage`.
- **File:** `src/features/siteOperations/useAgentChat.ts`

### Bug 27: PM rewrote QualityPage removing copilot integration

- **Description:** A PM's revision of QualityPage dropped the shared copilot integration (useAgentChat, sendWithContext, onNavigate, ADMIN_COMMANDS, search filter).
- **Fix:** Re-integrated all copilot features into the PM's new page layout.
- **File:** `src/quality/QualityPage.tsx`

### Bug 28: Build stale due to tsc errors

- **Description:** `npm run build` runs `tsc -b` before Vite, but PM's new server files had Prisma import errors that blocked TypeScript compilation. The production build was stale.
- **Fix:** Use `npx vite build` directly to skip the full `tsc -b` check. The Vite build uses its own TypeScript transform that tolerates the server-side errors.
- **Impact:** Build process only; no runtime change.

---

## Bug Fixes & Features (2026-05-22)

### Bug 29: Badge activation hardcoded site name "红培社区站"

- **Description:** Badge activation API returned hardcoded `siteName: "红培社区站"` and `siteId: "site-001"` regardless of the actual site context.
- **Root cause:** Badge activation handler used hardcoded values instead of looking up the site from the database.
- **Fix:** Look up `site.name` from DB using the badge's siteId. Frontend uses `currentSite` from `useSite()` context.
- **File:** `server/routes/smartBadges.ts`

### Bug 30: Badge activation 500 on duplicate deviceCode

- **Description:** Activating a badge with a deviceCode that already exists threw an unhandled database constraint error (500).
- **Fix:** Check for existing badge with same deviceCode before insert, return proper 409 Conflict error.
- **File:** `server/routes/smartBadges.ts`

### Bug 31: Go build stale due to build cache

- **Description:** After modifying goldenyears-agent Go source, `go build` used cached binaries and didn't pick up code changes.
- **Fix:** Use `go build -a` flag to force clean rebuild, bypassing build cache.
- **Impact:** Agent sidecar on staging server.

### Bug 32: Codex CLI 401 Unauthorized to api.openai.com

- **Description:** Codex CLI ignored `OPENAI_BASE_URL` environment variable and always tried to connect to `api.openai.com`, failing with 401.
- **Root cause:** Codex requires custom provider configuration in `~/.codex/config.toml`, not environment variables.
- **Fix:** Configure `model_provider = "litellm"` with `wire_api = "responses"` and `base_url = "http://127.0.0.1:4000/v1"` in config.toml.
- **File:** `~/.codex/config.toml`

### Bug 33: Tencent DeepSeek rejects non-function tool types

- **Description:** Codex sends `computer_use_preview` and other non-function tool types in its API requests. Tencent's DeepSeek endpoint only supports `type: "function"` tools, returning `tools[N].type: tool type must be 'function'`.
- **Fix:** Patch LiteLLM's DeepSeek provider `transform_request` to filter out non-function tools before forwarding.
- **File:** `litellm/llms/deepseek/chat/transformation.py` (runtime patch)

### Bug 34: Tencent DeepSeek rejects "developer" role

- **Description:** Codex sends messages with `role: "developer"` which Tencent's API doesn't support.
- **Fix:** Use `deepseek/` provider prefix in LiteLLM config, which automatically maps `developer` role to `system`.
- **File:** `~/litellm-config.yaml`

### Bug 35: CODEX_HOME not passed to codex process

- **Description:** lak runs as root, so Codex inherits `HOME=/root` and can't find `~/.codex/config.toml` at `/home/coder/.codex/`.
- **Root cause:** lak's codex agent `StartSession` didn't inject `CODEX_HOME` into the extra environment variables.
- **Fix:** Patch `agent/codex/codex.go` to inject `CODEX_HOME` and `HOME` from the `codex_home` config option into `extraEnv`.
- **File:** (lumii-agent-keeper repo) `agent/codex/codex.go`

### Bug 36: Copilot 站点数据隔离失败（跨站点数据泄露）

- **Description:** 用户在翠苑站 (site-001) 通过 copilot 查询"姓王的几个，姓周的几个"，copilot 返回了所有站点的数据（包括三墩站 site-002 的李芳和周建国）。正确行为应该只返回当前站点的数据。
- **Impact:** 严重——站点间数据泄露，用户能看到不属于自己站点的服务人员信息。
- **Root cause (3 层问题叠加):**

  **Layer 1 — lak envelope 解包失败：** lak 调用 lifecycle hook 时用 `{"hook":"prepare_session","project":"...","payload":{"session_key":"...","actor_id":"..."}}` 信封格式，但 goldenyears-agent 的 Go handler 直接 `json.Decode(body)` 为扁平 struct，导致 `session_key=""`, `actor_id=""`。从空 session_key 解析出 `scope=""`，进而 `GY_SITE_ID=""`，签发的 GY_API_TOKEN 中 scope 也为空。

  **Layer 2 — Codex session 环境变量不更新：** lak 的 `getOrCreateInteractiveStateWith` 只在创建新 session 时调用 `SetSessionEnv`。如果旧 Codex session 还活着（`is_resume=true`），直接复用旧 session，不更新环境变量。即使 sidecar 重启后 prepare_session 返回了正确的 `GY_SITE_ID`，旧 session 仍然用空的环境变量。

  **Layer 3 — LLM 不可靠执行过滤指令：** 即使 system prompt 中写了"所有列表查询必须带 `siteId=site-001`"，DeepSeek LLM 也不一定遵守——它可能自行构造不带 siteId 的 curl 命令，或者使用 `$GY_SITE_ID` 环境变量（而该变量在 sandbox 中为空）。

- **Fix (3 层修复):**

  **Fix 1 — 解包 lak 信封 (goldenyears-agent):** `prepare_session.go` 和 `scope_check.go` 的 handler 先尝试解包 `envelope.payload` 字段，fallback 到扁平解析（兼容测试和直接调用）。修复后 `session_key` 正确传入，`scope=site-001`，`GY_SITE_ID=site-001`。

  **Fix 2 — sidecar 重启强制新 session (goldenyears-agent):** `prepare_session` 返回 `session_directive: "new"` 当 `has_active_session=true` 但没有存储的日期记录时（= sidecar 刚重启，旧 session 的 env 过期）。lak 收到 "new" 后会终止旧 Codex session，创建新 session 并注入最新的环境变量。

  **Fix 3 — 服务端强制站点过滤 (goldenyears-dashboard):** 这是最终防线，不依赖 LLM 行为。`requireAuth` 中间件从 GY token 的 `scope` 字段提取 `forceSiteId`（scope `"site-001"` → `forceSiteId="site-001"`，scope `"admin"` → 无强制过滤）。新增 `resolveSiteId(req)` 辅助函数，优先使用 `forceSiteId`，fallback 到 `req.query.siteId`。6 个路由文件的列表查询 handler 统一使用 `resolveSiteId(req)` 替代 `req.query.siteId`。

  **Fix 4 — system prompt 注入明文 siteId (goldenyears-agent):** `buildSystemPromptFragment` 在 system prompt 中直接写入 `siteId=site-001` 的明文值和示例 curl 命令，不依赖 `$GY_SITE_ID` shell 变量展开。

- **Files changed:**
  - `lumii-goldenyears-agent/internal/hooks/prepare_session.go` — 解包 lak 信封、GY_SITE_ID 推导、system prompt 明文 siteId、sidecar 重启强制 new
  - `lumii-goldenyears-agent/internal/hooks/scope_check.go` — 解包 lak 信封
  - `lumii-goldenyears-agent/skills/goldenyears-orchestrator/prompt.md` — 站点隔离规则 + API 调用方式
  - `lumii-goldenyears-agent/skills/goldenyears-orchestrator/sub-skills/lumii-*-query.md` (5 files) — curl 加 `siteId=$GY_SITE_ID` + Authorization header
  - `lumii-goldenyears-agent/CLAUDE.md` / `AGENTS.md` — 站点隔离规则
  - `lumii-goldenyears-dashboard/server/middleware/requireAuth.ts` — `forceSiteId` 从 GY token scope 提取
  - `lumii-goldenyears-dashboard/server/routes/helpers.ts` — `resolveSiteId(req)` 辅助函数
  - `lumii-goldenyears-dashboard/server/routes/{socialWorkers,smartBadges,serviceObjects,serviceSchedules,serviceRecords,home}.ts` — 使用 `resolveSiteId`

- **Verification:**
  ```
  # GY token 带 scope=site-001 直接调 API
  curl /api/social-workers -H "Authorization: Bearer $GY_TOKEN"
  → 只返回 site-001 的 3 人（王冲、王丽、张敏）

  # 通过 copilot WS 发消息
  "[ctx:服务人员] 姓王的几个，姓周的几个"
  → "王 2 人（王冲、王丽），周 0 人"（无三墩站数据泄露）
  ```

- **Lesson learned:** AI agent 场景下不能依赖 LLM 正确执行安全过滤指令（prompt injection / LLM 不遵守指令都可能绕过），必须在 API 服务端做硬性数据隔离。三层防护体系中 Layer 3 (API 层) 是真正的安全边界。

---

## Features Shipped (2026-05-22)

### Single-click to open modals

- All list pages (site ops + org admin) changed from double-click to single-click to open detail/edit modals.
- **File:** All Area components (`SocialWorkersArea`, `SmartBadgesArea`, etc.) + QualityPage views

### Copilot voice input

- Web Speech API (SpeechRecognition zh-CN) for voice-to-text input in copilot.
- Microphone button in CommandInput, red pulsing indicator when recording.
- **File:** `src/features/siteOperations/CommandInput.tsx`, `siteOperations.css`

### Copilot agent switched to Codex + DeepSeek

- Copilot backend changed from Claude Code to Codex CLI + LiteLLM Proxy + DeepSeek-v4-flash.
- lak config: `type = "codex"`, `mode = "yolo"`, `model = "deepseek-v4-flash"`.
- New components: LiteLLM Proxy (port 4000), Codex CLI with litellm provider.
- Deployment guide: `lumii-goldenyears-agent/docs/deploy-codex-deepseek.md`
