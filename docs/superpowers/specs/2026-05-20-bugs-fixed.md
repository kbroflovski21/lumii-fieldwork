# 2026-05-20/21 Bug Fixes & Changes

**Date:** 2026-05-20 ~ 2026-05-21

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
