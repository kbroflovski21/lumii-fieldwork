# Copilot Detail-Page Context Awareness + Agent-Triggered Refresh

## Goal

When a user is viewing a detail page (e.g., a specific social worker), the copilot should know which entity is open. After the agent modifies data via REST API, the page should auto-refresh without manual intervention.

## Architecture

Three layers, zero changes to lak (agent-keeper) or the goldenyears-agent Go binary:

1. **DetailPageContext** (React Context) — publishes current entity info from detail pages
2. **sendWithContext upgrade** — enriches the `[ctx:...]` prefix with entity name and ID
3. **`[gy:refresh]` marker** — agent sub-skills include this in mutation success output; frontend detects it in real-time messages and triggers data refetch

## Layer 1: DetailPageContext

### Interface

```ts
interface DetailEntity {
  entityType: string;
  entityId: string;
  entityName: string;
}
```

### New file: `src/shared/DetailPageContext.tsx`

Exports:
- `DetailPageProvider` — wraps children with context provider
- `useDetailEntity()` — returns `DetailEntity | null` (read)
- `useSetDetailEntity()` — returns setter `(entity: DetailEntity | null) => void` (write)

### Provider placement

- `SiteOperationsLayout.tsx` — wraps the `<Outlet />` area
- `QualityLayout.tsx` — wraps the child content area

### Entity mapping per Area

| Area component | entityType | entityName source | entityId source |
|---|---|---|---|
| SocialWorkersArea | `social_worker` | `drawer.worker.name` | `routeId` |
| SmartBadgesArea | `smart_badge` | `drawer.badge.deviceCode` | `routeId` |
| SchedulesArea | `schedule` | `drawer.schedule.serviceProject` | `routeId` |
| ServiceObjectsArea | `service_object` | `drawer.object.name` | `routeId` |
| RecordsArea (records) | `service_record` | `drawer.record.serviceObjectName` | `routeId` |
| RecordsArea (recordings) | `recording` | `selectedRecording.workerName` | `routeId` |
| QualityPage (sites) | `site` | `detailSite.name` | `routeId` |
| QualityPage (users) | `user` | `detailUser.name` | `routeId` |

Each Area component calls `setDetailEntity(...)` in a `useEffect` when detail page opens, and `setDetailEntity(null)` when returning to list view.

## Layer 2: sendWithContext Upgrade

### Current format

```
[ctx:服务人员] user message
```

### New format (when detail page is open)

```
[ctx:服务人员/张三/worker-abc] user message
```

### Implementation

Both `SiteOperationsLayout.tsx` and `QualityLayout.tsx` read `useDetailEntity()` in their `sendWithContext` callback. If entity is present, append `/${entityName}/${entityId}` to the context label. If null, use the existing area-level label only.

### Create page

When `routeId === "new"`, do NOT set detail entity (leave as `null`). The create page has no existing entity to reference. Context remains area-level: `[ctx:服务人员]`. The agent's existing create sub-skills handle creation without needing an entity ID.

## Layer 3: `[gy:refresh]` Marker

### Agent side (sub-skill .md files)

All 15 mutation sub-skills add `[gy:refresh]` as the last line of their success Output Format template.

Example (`lumii-worker-update.md`):
```
## Output Format
✅ 服务人员已更新
姓名: ${NAME}
变更内容: ${CHANGED_FIELDS}
[gy:refresh]
```

Error/failure output templates do NOT include `[gy:refresh]`.

### Affected sub-skills (15 files)

- lumii-worker-create.md, lumii-worker-update.md
- lumii-badge-activate.md, lumii-badge-update.md
- lumii-elder-create.md, lumii-elder-update.md
- lumii-schedule-create.md, lumii-schedule-adjust.md
- lumii-record-review.md, lumii-record-export.md
- lumii-user-create.md, lumii-user-update.md
- lumii-site-update.md
- lumii-feishu-bind.md, lumii-feishu-unbind.md

### Agent prompt.md addition

Add a context parsing section instructing Claude Code to:
1. Parse `[ctx:TYPE/NAME/ID]` from user messages
2. When entity ID is present, use it directly for mutations without asking "which entity?"

### Frontend detection (useAgentChat.ts)

- New optional parameter: `onRefetch?: () => void`
- When processing a **real-time** `message` frame (not `init`/`history`):
  - Check if content contains `[gy:refresh]`
  - If yes: strip `[gy:refresh]` from content, call `onRefetch()`
- When processing `init`/`history` frames:
  - Strip `[gy:refresh]` from content for display
  - Do NOT call `onRefetch()`

### Refetch wiring

**SiteOperationsLayout:**
```
useAgentChat({ ..., onRefetch: data.refetch })
```
Where `data` comes from `useSiteOperationsData()` which already has a `refetch()` method.

**QualityLayout:**
New `refetchKey` state + context. QualityPage's views include `refetchKey` in their data-loading `useEffect` dependencies. When `onRefetch` fires, increment `refetchKey`.

### Graceful degradation

If Claude Code omits `[gy:refresh]` from a mutation response, the page simply does not auto-refresh. The user can manually refresh. This is acceptable degradation, not a bug.

### Replay safety

Historical messages loaded from DB (`init`/`history` frames) have `[gy:refresh]` stripped for display but never trigger `onRefetch`. Browser refresh does not cause spurious data reloads.

## Testing

### Unit tests (Vitest, TDD)

| Test file | Coverage |
|---|---|
| `DetailPageContext.test.tsx` | set/read/clear entity, Provider-outside throws |
| `useAgentChat [gy:refresh]` | real-time message → onRefetch + strip; history message → strip only; no marker → no call |
| `sendWithContext` | with entity → `[ctx:label/name/id]`; without → `[ctx:label]` |

### Deployment

1. Dashboard: `./deploy.sh` to staging (`stage-gy.lumii-ai.cn`)
2. Agent skills: commit + push lumii-goldenyears-agent, then SSH to `coder@18.142.48.45` and `cd ~/lumii-goldenyears-agent && git pull` (CC reads skills on next session start, no lak restart needed)

### Real E2E verification (staging)

1. Login to staging, open a social worker detail page
2. In copilot, type "修改当前对象的电话号码为 13899990000"
3. Verify:
   - CC receives message with `[ctx:服务人员/NAME/ID]`
   - CC uses the ID directly, does not ask "which worker?"
   - CC calls `PATCH /social-workers/:id` with new phone
   - Reply contains `[gy:refresh]`
   - Page data auto-refreshes showing new phone number
   - Chat bubble does NOT display `[gy:refresh]` text
4. Refresh browser → load history → verify no spurious refetch
5. On list page, send a read-only query → verify no `[gy:refresh]`, no refresh

## Files changed

### lumii-goldenyears-dashboard (frontend)

| File | Change |
|---|---|
| `src/shared/DetailPageContext.tsx` | NEW — context provider + hooks |
| `src/shared/__tests__/DetailPageContext.test.tsx` | NEW — unit tests |
| `src/layouts/SiteOperationsLayout.tsx` | Add Provider, upgrade sendWithContext, pass onRefetch |
| `src/layouts/QualityLayout.tsx` | Add Provider, upgrade sendWithContext, add refetchKey |
| `src/features/siteOperations/SocialWorkersArea.tsx` | setDetailEntity on detail open/close |
| `src/features/siteOperations/SmartBadgesArea.tsx` | setDetailEntity on detail open/close |
| `src/features/siteOperations/SchedulesArea.tsx` | setDetailEntity on detail open/close |
| `src/features/siteOperations/ServiceObjectsArea.tsx` | setDetailEntity on detail open/close |
| `src/features/siteOperations/RecordsArea.tsx` | setDetailEntity on detail open/close |
| `src/quality/QualityPage.tsx` | setDetailEntity on detail open/close, consume refetchKey |
| `src/features/siteOperations/useAgentChat.ts` | Add onRefetch param, detect + strip `[gy:refresh]` |

### lumii-goldenyears-agent (skills)

| File | Change |
|---|---|
| `skills/goldenyears-orchestrator/prompt.md` | Add context parsing section |
| 15 mutation sub-skill `.md` files | Add `[gy:refresh]` to success Output Format |

### NOT changed

- lumii-agent-keeper (lak) — zero changes
- goldenyears-agent Go code — zero changes
- Bridge protocol — zero changes
