# Copilot Shared Session Design

> **Status:** IMPLEMENTED (2026-05-20/21)
>
> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement.

**Goal:** Unify the copilot panel into a single shared session across all tabs, refactor the home page layout, and apply the same pattern to the org admin page.

**Architecture:** Lift `useAgentChat` out of CopilotPanel into the shell-level component. CopilotPanel becomes a pure presentation component. Session key is per-user-per-site, not per-tab. Tab context is attached to user messages on send, not on tab switch.

## 1. Session Key Redesign

### Current
- Each tab creates its own WS session: `social_workers`, `smart_badges`, etc.
- Home page uses hardcoded `"home"`.
- No site context in session key.

### New
- One session per user+site: session key = `copilot:{siteId}` (e.g., `copilot:site-001`).
- For org admin (no site context): session key = `copilot:admin`.
- The server-side WS handler already prepends `web:{agentId}:{userId}:`, so the full key becomes `web:lumii-goldenyears:{userId}:copilot:{siteId}`.
- Different user → different WS connection (different token → different userId in key).
- Different site → WS reconnects with new session key.

### Implementation
- `useAgentChat` accepts a new `siteId?: string` parameter.
- WS URL: `ws://host/api/ws/chat?agentId={agentId}&sessionId=copilot:{siteId}&token={token}`.
- When `siteId` changes, the hook closes the old WS and opens a new one (existing `useEffect` dependency handles this).

## 2. CopilotPanel as Pure Presentation

### Current
- CopilotPanel owns `useAgentChat` internally.
- Switching tabs remounts CopilotPanel with a new `workAreaId` → new WS connection, messages lost.

### New
- `useAgentChat` lives in the shell component (SiteOperationsShell / QualityPage).
- CopilotPanel receives chat state as props:

```typescript
interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  // Chat state from useAgentChat
  messages: ChatMessage[];
  connected: boolean;
  wip: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
  // Send handler (shell wraps handleSend to inject context)
  onSend: (content: string) => void;
}
```

- CopilotPanel keeps its own width/drag state (local UI concern).
- Switching tabs changes `activeArea` in the shell but does NOT remount CopilotPanel or affect the WS connection.

## 3. Tab Context in Messages

- Shell maintains `activeArea` state.
- Shell wraps `handleSend` from `useAgentChat` to inject context:

```typescript
const sendWithContext = useCallback((content: string) => {
  const label = AREA_LABELS[activeArea] ?? activeArea;
  handleSend(`[ctx:${label}] ${content}`);
}, [activeArea, handleSend]);
```

- `AREA_LABELS` maps area IDs to Chinese labels (e.g., `social_workers` → `服务人员`).
- The `[ctx:...]` prefix is stripped from the optimistic UI bubble so the user sees their original message.
- `useAgentChat.handleSend` is updated: if `content` starts with `[ctx:`, strip the prefix for the optimistic message `content` field, but send the full string to the server.
- Agent sees: `[ctx:服务人员] 帮我查一下王丽的信息` and knows the user is on the social workers tab.

## 4. Home Page Layout Change

### Current
- Left: full-width embedded ChatStream + CommandInput.
- Right: sidebar drawer with KPIs, highlights, actions, timeline.

### New
- Center: today-overview content (what was in the sidebar — KPIs, highlights, actions, timeline), displayed directly in the main content area with a proper layout.
- Right: shared CopilotPanel (same instance as other tabs).
- No more embedded `useAgentChat` in HomeArea.
- No more sidebar drawer (`isInsightOpen`, `isSidebarCollapsed` state removed).

### HomeArea Props Change
```typescript
// Before
interface HomeAreaProps {
  resource: Resource<SiteOperationsHomeResponse>;
  onRoute?: (area: string) => void;
}

// After — same, but no chat integration inside
interface HomeAreaProps {
  resource: Resource<SiteOperationsHomeResponse>;
  onRoute?: (area: string) => void;
}
```

HomeArea becomes a pure data display component. All chat/copilot UI is handled by the shell.

### Layout
- KPI grid at top (2×3 or responsive auto-fit).
- Highlights section below.
- Action cards below.
- Recent timeline at bottom.
- Standard scrollable content area, no sidebar.

## 5. Org Admin (QualityPage) Same Pattern

### Current
- QualityPage has its own CopilotPanel import.
- Copilot state managed locally per view.

### New
- `useAgentChat` at QualityPage level with session key `copilot:admin`.
- CopilotPanel shared across dashboard/sop/sites/users views.
- Same `sendWithContext` pattern, with admin view labels (质量总览, 规范管理, 站点管理, 用户管理).
- Grid layout adds copilot column when panel is open (matching site operations pattern).

## 6. showCopilot Logic Change

### Current
- `showCopilot = activeArea !== "home"` — copilot hidden on home.

### New
- `showCopilot = true` always — copilot available on all tabs including home.
- Header input and mobile FAB visible on all tabs.

## 7. Files to Modify

| File | Change |
|------|--------|
| `useAgentChat.ts` | Accept `siteId`, build session key as `copilot:{siteId}`. Strip `[ctx:]` prefix from optimistic UI. |
| `CopilotPanel.tsx` | Remove `useAgentChat` ownership. Accept chat state as props. Keep width/drag/scroll logic. |
| `SiteOperationsShell.tsx` | Own `useAgentChat`. Build `sendWithContext`. Remove `showCopilot` conditional (always true). Pass chat props to CopilotPanel. |
| `HomeArea.tsx` | Remove embedded chat (useAgentChat, ChatStream, CommandInput). Remove sidebar drawer. Display today-overview content in main area. |
| `QualityPage.tsx` | Add `useAgentChat` + shared CopilotPanel across all admin views. |
| `CommandInput.tsx` | Added `commands` prop to accept custom command sets (SITE_OPS_COMMANDS / ADMIN_COMMANDS). Default falls back to SITE_OPS_COMMANDS. |
| `ChatStream.tsx` | Fixed WIP typing dots visibility (indigo color, 8px, higher bounce). |

## 8. Testing Strategy

- **Unit**: `useAgentChat` session key construction with different siteId values.
- **Integration**: Verify WS reconnects when siteId changes but NOT when activeArea changes.
- **E2E on staging**: Login as operator → send message on workers tab → switch to badges tab → verify same messages visible → switch site → verify new empty session.
- **E2E admin**: Login as admin → send message on dashboard view → switch to sites view → verify same messages.
