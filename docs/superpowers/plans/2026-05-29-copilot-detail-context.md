# Copilot Detail-Page Context + Agent-Triggered Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the copilot know which detail page entity the user is viewing, and auto-refresh page data when the agent modifies data via REST API.

**Architecture:** A React Context (`DetailPageContext`) publishes the current entity from detail pages. `sendWithContext` reads it to enrich the `[ctx:]` prefix with entity name/ID. Agent sub-skills include `[gy:refresh]` in mutation success output. `useAgentChat` detects this marker in real-time messages, strips it, and calls a refetch callback.

**Tech Stack:** React 18, TypeScript, Vitest + @testing-library/react, react-router-dom v6

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/shared/DetailPageContext.tsx` | NEW — React context: `DetailEntity` state + provider + hooks |
| `src/shared/__tests__/DetailPageContext.test.tsx` | NEW — Unit tests for context |
| `src/shared/__tests__/useAgentChatRefresh.test.ts` | NEW — Unit tests for `[gy:refresh]` detection |
| `src/features/siteOperations/useAgentChat.ts` | MODIFY — Add `onRefetch` option, detect/strip `[gy:refresh]` |
| `src/layouts/SiteOperationsLayout.tsx` | MODIFY — Add DetailPageProvider, upgrade sendWithContext, pass onRefetch |
| `src/layouts/QualityLayout.tsx` | MODIFY — Add DetailPageProvider, upgrade sendWithContext, add refetchKey |
| `src/features/siteOperations/SocialWorkersArea.tsx` | MODIFY — setDetailEntity on detail open/close |
| `src/features/siteOperations/SmartBadgesArea.tsx` | MODIFY — setDetailEntity on detail open/close |
| `src/features/siteOperations/SchedulesArea.tsx` | MODIFY — setDetailEntity on detail open/close |
| `src/features/siteOperations/ServiceObjectsArea.tsx` | MODIFY — setDetailEntity on detail open/close |
| `src/features/siteOperations/RecordsArea.tsx` | MODIFY — setDetailEntity on detail open/close |
| `src/quality/QualityPage.tsx` | MODIFY — setDetailEntity in SitesView/UsersView, consume refetchKey |

### Agent repo (`lumii-goldenyears-agent`)

| File | Responsibility |
|------|---------------|
| `skills/goldenyears-orchestrator/prompt.md` | MODIFY — Add context parsing section |
| `CLAUDE.md` | MODIFY — Add context parsing section |
| 15 mutation sub-skill `.md` files | MODIFY — Add `[gy:refresh]` to success Output Format |

---

### Task 1: DetailPageContext — Tests

**Files:**
- Create: `src/shared/__tests__/DetailPageContext.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { DetailPageProvider, useDetailEntity, useSetDetailEntity } from "../DetailPageContext";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <DetailPageProvider>{children}</DetailPageProvider>;
}

describe("DetailPageContext", () => {
  it("returns null when no entity is set", () => {
    const { result } = renderHook(() => useDetailEntity(), { wrapper });
    expect(result.current).toBeNull();
  });

  it("returns entity after setDetailEntity", () => {
    const { result } = renderHook(() => {
      const entity = useDetailEntity();
      const setEntity = useSetDetailEntity();
      return { entity, setEntity };
    }, { wrapper });

    act(() => {
      result.current.setEntity({ entityType: "social_worker", entityId: "w-001", entityName: "张三" });
    });

    expect(result.current.entity).toEqual({
      entityType: "social_worker",
      entityId: "w-001",
      entityName: "张三",
    });
  });

  it("clears entity when set to null", () => {
    const { result } = renderHook(() => {
      const entity = useDetailEntity();
      const setEntity = useSetDetailEntity();
      return { entity, setEntity };
    }, { wrapper });

    act(() => {
      result.current.setEntity({ entityType: "social_worker", entityId: "w-001", entityName: "张三" });
    });
    expect(result.current.entity).not.toBeNull();

    act(() => {
      result.current.setEntity(null);
    });
    expect(result.current.entity).toBeNull();
  });

  it("useDetailEntity throws outside provider", () => {
    expect(() => {
      renderHook(() => useDetailEntity());
    }).toThrow();
  });

  it("useSetDetailEntity throws outside provider", () => {
    expect(() => {
      renderHook(() => useSetDetailEntity());
    }).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/ubuntu/lumii-goldenyears-dashboard && npx vitest run src/shared/__tests__/DetailPageContext.test.tsx`
Expected: FAIL — module `../DetailPageContext` not found

---

### Task 2: DetailPageContext — Implementation

**Files:**
- Create: `src/shared/DetailPageContext.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export interface DetailEntity {
  entityType: string;
  entityId: string;
  entityName: string;
}

type SetDetailEntity = (entity: DetailEntity | null) => void;

const EntityCtx = createContext<DetailEntity | null | undefined>(undefined);
const SetEntityCtx = createContext<SetDetailEntity | undefined>(undefined);

export function DetailPageProvider({ children }: { children: ReactNode }) {
  const [entity, setEntity] = useState<DetailEntity | null>(null);
  const set = useCallback<SetDetailEntity>((e) => setEntity(e), []);
  return (
    <EntityCtx.Provider value={entity}>
      <SetEntityCtx.Provider value={set}>
        {children}
      </SetEntityCtx.Provider>
    </EntityCtx.Provider>
  );
}

export function useDetailEntity(): DetailEntity | null {
  const ctx = useContext(EntityCtx);
  if (ctx === undefined) throw new Error("useDetailEntity must be inside DetailPageProvider");
  return ctx;
}

export function useSetDetailEntity(): SetDetailEntity {
  const ctx = useContext(SetEntityCtx);
  if (ctx === undefined) throw new Error("useSetDetailEntity must be inside DetailPageProvider");
  return ctx;
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /home/ubuntu/lumii-goldenyears-dashboard && npx vitest run src/shared/__tests__/DetailPageContext.test.tsx`
Expected: 5 tests PASS

- [ ] **Step 3: Commit**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard
git add src/shared/DetailPageContext.tsx src/shared/__tests__/DetailPageContext.test.tsx
git commit -m "feat: add DetailPageContext for copilot entity awareness"
```

---

### Task 3: useAgentChat `[gy:refresh]` detection — Tests

**Files:**
- Create: `src/shared/__tests__/useAgentChatRefresh.test.ts`

This tests the strip/detect logic as a pure function extracted from useAgentChat.

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from "vitest";
import { stripRefreshMarker } from "../../features/siteOperations/useAgentChat";

describe("stripRefreshMarker", () => {
  it("strips [gy:refresh] and returns shouldRefresh true", () => {
    const input = "✅ 服务人员已更新\n姓名: 张三\n变更内容: 电话\n[gy:refresh]";
    const result = stripRefreshMarker(input);
    expect(result.shouldRefresh).toBe(true);
    expect(result.content).toBe("✅ 服务人员已更新\n姓名: 张三\n变更内容: 电话");
  });

  it("strips [gy:refresh] with surrounding whitespace", () => {
    const input = "✅ 已更新\n\n[gy:refresh]\n";
    const result = stripRefreshMarker(input);
    expect(result.shouldRefresh).toBe(true);
    expect(result.content).toBe("✅ 已更新");
  });

  it("returns shouldRefresh false when no marker present", () => {
    const input = "查询结果：张三，在职";
    const result = stripRefreshMarker(input);
    expect(result.shouldRefresh).toBe(false);
    expect(result.content).toBe("查询结果：张三，在职");
  });

  it("handles empty string", () => {
    const result = stripRefreshMarker("");
    expect(result.shouldRefresh).toBe(false);
    expect(result.content).toBe("");
  });

  it("handles marker as the only content", () => {
    const result = stripRefreshMarker("[gy:refresh]");
    expect(result.shouldRefresh).toBe(true);
    expect(result.content).toBe("");
  });

  it("strips marker mid-content", () => {
    const input = "✅ 已更新\n[gy:refresh]\n额外信息";
    const result = stripRefreshMarker(input);
    expect(result.shouldRefresh).toBe(true);
    expect(result.content).toBe("✅ 已更新\n额外信息");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/ubuntu/lumii-goldenyears-dashboard && npx vitest run src/shared/__tests__/useAgentChatRefresh.test.ts`
Expected: FAIL — `stripRefreshMarker` is not exported from `useAgentChat`

---

### Task 4: useAgentChat — Add `[gy:refresh]` detection + `onRefetch` callback

**Files:**
- Modify: `src/features/siteOperations/useAgentChat.ts`

- [ ] **Step 1: Add `stripRefreshMarker` export and `onRefetch` to the hook**

Add at the bottom of the file (before the final `toMessage` function):

```ts
export function stripRefreshMarker(content: string): { content: string; shouldRefresh: boolean } {
  const marker = "[gy:refresh]";
  if (!content.includes(marker)) return { content, shouldRefresh: false };
  const cleaned = content.replace(/\[gy:refresh\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return { content: cleaned, shouldRefresh: true };
}
```

Update the `UseAgentChatOptions` interface to add optional `onRefetch`:

```ts
interface UseAgentChatOptions {
  agentId: string;
  sessionId: string;
  siteId?: string;
  getToken: () => string;
  onRefetch?: () => void;
}
```

Update the function signature to destructure `onRefetch`:

```ts
export function useAgentChat({ agentId, sessionId, siteId, getToken, onRefetch }: UseAgentChatOptions): UseAgentChatReturn {
```

Add `onRefetch` to the `useEffect` dependency array (the main WebSocket effect at line 48):

```ts
}, [agentId, sessionId, siteId, getToken, onRefetch]);
```

In the `handleFrame` function, modify the `case "message":` block. After the line `if (frame.content?.startsWith(PROGRESS_PREFIX)) break;` (line 128), add stripping logic for assistant messages:

```ts
case "message": {
  if (frame.content?.startsWith(PROGRESS_PREFIX)) break;
  let frameContent = frame.content;
  if (frame.role === "assistant" && frameContent) {
    const { content: stripped, shouldRefresh } = stripRefreshMarker(frameContent);
    frameContent = stripped;
    if (shouldRefresh && onRefetch) onRefetch();
  }
  setMessages((prev) => {
    if (prev.some((m) => m.id === frame.id)) return prev;
    if (frame.role === "user") {
      const rawContent = (frameContent ?? "").replace(/^\[ctx:[^\]]*\]\s*/, "");
      const idx = prev.findIndex((m) => m.sendStatus === "sending" && (m.content === frameContent || m.content === rawContent) && m.role === "user");
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], id: frame.id, sendStatus: "sent", timestamp: frame.timestamp };
        return updated;
      }
    }
    return [...prev, toMessage({ ...frame, content: frameContent })];
  });
  setSending(false);
  break;
}
```

Modify the `case "stream_end":` block similarly:

```ts
case "stream_end": {
  let endContent = frame.content;
  if (endContent) {
    const { content: stripped, shouldRefresh } = stripRefreshMarker(endContent);
    endContent = stripped;
    if (shouldRefresh && onRefetch) onRefetch();
  }
  setMessages((prev) => prev.map((m) => m.id === frame.msg_id ? { ...m, content: endContent, isStreaming: false, msgType: "text" } : m));
  setSending(false);
  break;
}
```

Modify `case "init":` — strip marker from loaded history messages but do NOT call onRefetch:

```ts
case "init":
  initReceivedRef.current = true;
  turnActiveRef.current = false;
  setConnected(frame.connected);
  setWip(frame.wip);
  setMessages(frame.messages.map((m: any) => {
    if (m.role === "assistant" && m.content) {
      const { content } = stripRefreshMarker(m.content);
      return toMessage({ ...m, content });
    }
    return toMessage(m);
  }));
  break;
```

Modify `case "history":` — same strip-only treatment:

```ts
case "history":
  setMessages((prev) => [...frame.messages.map((m: any) => {
    if (m.role === "assistant" && m.content) {
      const { content } = stripRefreshMarker(m.content);
      return toMessage({ ...m, content });
    }
    return toMessage(m);
  }), ...prev]);
  break;
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /home/ubuntu/lumii-goldenyears-dashboard && npx vitest run src/shared/__tests__/useAgentChatRefresh.test.ts`
Expected: 6 tests PASS

- [ ] **Step 3: Run full shared test suite**

Run: `cd /home/ubuntu/lumii-goldenyears-dashboard && npx vitest run src/shared/`
Expected: All existing tests still pass

- [ ] **Step 4: Commit**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard
git add src/features/siteOperations/useAgentChat.ts src/shared/__tests__/useAgentChatRefresh.test.ts
git commit -m "feat: detect [gy:refresh] in agent messages and trigger onRefetch"
```

---

### Task 5: SiteOperationsLayout — Provider + sendWithContext upgrade + onRefetch

**Files:**
- Modify: `src/layouts/SiteOperationsLayout.tsx`

- [ ] **Step 1: Add imports**

At the top of the file, add:

```ts
import { DetailPageProvider, useDetailEntity } from "../shared/DetailPageContext";
```

- [ ] **Step 2: Upgrade sendWithContext**

Replace the existing `sendWithContext` callback (lines 101–107):

```ts
const sendWithContext = useCallback(
  (content: string) => {
    const label = AREA_LABELS[activeArea] ?? activeArea;
    handleSend(`[ctx:${label}] ${content}`);
  },
  [activeArea, handleSend]
);
```

with a wrapper component pattern. Since `useDetailEntity()` must be called inside the Provider, we need to restructure slightly. **Extract the body into an inner component:**

After the `SiteOperationsLayout` function, create `SiteOpsInner` that receives props. But a simpler approach: wrap just the Outlet area and pass context up.

Actually the cleanest approach: make `sendWithContext` a child component that reads the context. But since `sendWithContext` is used in the header (outside the Outlet), we need the Provider to wrap the whole layout body.

**Restructure:** Wrap the entire return JSX (the `site-operations-root` div) with `<DetailPageProvider>`. Then create a small helper hook inside the component:

Replace lines 101–107 with:

```ts
const detailEntity = useDetailEntity();
const sendWithContext = useCallback(
  (content: string) => {
    const label = AREA_LABELS[activeArea] ?? activeArea;
    if (detailEntity) {
      handleSend(`[ctx:${label}/${detailEntity.entityName}/${detailEntity.entityId}] ${content}`);
    } else {
      handleSend(`[ctx:${label}] ${content}`);
    }
  },
  [activeArea, detailEntity, handleSend]
);
```

**Wait** — `useDetailEntity()` throws outside Provider. So we need to wrap the entire component body in the Provider first. The trick: split into an outer wrapper that provides context, and inner that consumes it.

**Actual implementation:**

1. Rename existing `SiteOperationsLayout` to `SiteOperationsLayoutInner`.
2. Create new `SiteOperationsLayout` that wraps it in `<DetailPageProvider>`.
3. `SiteOperationsLayoutInner` calls `useDetailEntity()` freely.

```tsx
function SiteOperationsLayoutInner() {
  // ... existing component body, with useDetailEntity() added ...
}

export function SiteOperationsLayout() {
  return (
    <DetailPageProvider>
      <SiteOperationsLayoutInner />
    </DetailPageProvider>
  );
}
```

- [ ] **Step 3: Pass onRefetch to useAgentChat**

Replace the `useAgentChat` call (lines 83–88):

```ts
const { messages, connected, wip, handleSend, sendCardAction, endRef } = useAgentChat({
  agentId: "lumii-goldenyears",
  sessionId: "copilot",
  siteId: currentSite?.id,
  getToken,
  onRefetch: data.refetch,
});
```

Note: `data` comes from `useSiteOperationsData` (currently line 118). Move it before the `useAgentChat` call so `data.refetch` is available as the `onRefetch` argument. Hook call order change is safe since both are independent hooks.

- [ ] **Step 4: Wrap the Outlet with SiteOpsDataContext.Provider**

The `<SiteOpsDataContext.Provider value={data}>` already wraps `<Outlet />`. No change needed — `data.refetch` is already available.

- [ ] **Step 5: Verify build compiles**

Run: `cd /home/ubuntu/lumii-goldenyears-dashboard && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard
git add src/layouts/SiteOperationsLayout.tsx
git commit -m "feat: wire DetailPageContext + onRefetch in SiteOperationsLayout"
```

---

### Task 6: QualityLayout — Provider + sendWithContext upgrade + refetchKey

**Files:**
- Modify: `src/layouts/QualityLayout.tsx`
- Modify: `src/quality/QualityPage.tsx`

- [ ] **Step 1: Add imports to QualityLayout**

```ts
import { DetailPageProvider, useDetailEntity } from "../shared/DetailPageContext";
```

- [ ] **Step 2: Split QualityLayout into outer + inner (same pattern as Task 5)**

Rename `QualityLayout` to `QualityLayoutInner`. Create new export:

```tsx
export function QualityLayout() {
  return (
    <DetailPageProvider>
      <QualityLayoutInner />
    </DetailPageProvider>
  );
}
```

- [ ] **Step 3: Add refetchKey state and upgrade sendWithContext in QualityLayoutInner**

Add state:

```ts
const [refetchKey, setRefetchKey] = useState(0);
const qualityRefetch = useCallback(() => setRefetchKey(k => k + 1), []);
```

Upgrade `useAgentChat` call:

```ts
const { messages, connected, wip, handleSend, sendCardAction, endRef } = useAgentChat({
  agentId: "lumii-goldenyears",
  sessionId: "copilot:admin",
  getToken,
  onRefetch: qualityRefetch,
});
```

Upgrade `sendWithContext`:

```ts
const detailEntity = useDetailEntity();
const sendWithContext = useCallback((msg: string) => {
  const label = ADMIN_NAV.find(n => n.id === activeView)?.label ?? "质量总览";
  if (detailEntity) {
    handleSend(`[ctx:${label}/${detailEntity.entityName}/${detailEntity.entityId}] ${msg}`);
  } else {
    handleSend(`[ctx:${label}] ${msg}`);
  }
}, [activeView, detailEntity, handleSend]);
```

- [ ] **Step 4: Pass refetchKey to QualityPage**

```tsx
<QualityPage activeView={activeView} onSelectView={handleSelectView} onNavigate={handleCopilotNavigate} refetchKey={refetchKey} />
```

- [ ] **Step 5: Consume refetchKey in QualityPage**

In `QualityPage` props type, add `refetchKey?: number`.

In `SitesView` component, add `refetchKey` to the `useEffect` dependency for `fetchSites`:

```ts
useEffect(() => { fetchSites(); }, [fetchSites, refetchKey]);
```

In `UsersView` component, add `refetchKey` to the `useEffect` dependency for `fetchUsers`:

```ts
useEffect(() => { fetchUsers(); }, [fetchUsers, refetchKey]);
```

Thread `refetchKey` from `QualityPage` to `SitesView` and `UsersView` via their props.

- [ ] **Step 6: Verify build compiles**

Run: `cd /home/ubuntu/lumii-goldenyears-dashboard && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard
git add src/layouts/QualityLayout.tsx src/quality/QualityPage.tsx
git commit -m "feat: wire DetailPageContext + refetchKey in QualityLayout"
```

---

### Task 7: Wire setDetailEntity in SocialWorkersArea

**Files:**
- Modify: `src/features/siteOperations/SocialWorkersArea.tsx`

- [ ] **Step 1: Add import**

```ts
import { useSetDetailEntity } from "../../shared/DetailPageContext";
```

- [ ] **Step 2: Call hook in component body**

After `const { id: routeId } = useParams();` (line 64), add:

```ts
const setDetailEntity = useSetDetailEntity();
```

- [ ] **Step 3: Add useEffect to publish entity**

After the existing URL→drawer sync `useEffect` (lines 101–110), add:

```ts
useEffect(() => {
  if (routeId && routeId !== "new" && drawer.kind === "view") {
    setDetailEntity({ entityType: "social_worker", entityId: routeId, entityName: drawer.worker.name });
  } else {
    setDetailEntity(null);
  }
  return () => setDetailEntity(null);
}, [routeId, drawer, setDetailEntity]);
```

- [ ] **Step 4: Verify build compiles**

Run: `cd /home/ubuntu/lumii-goldenyears-dashboard && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard
git add src/features/siteOperations/SocialWorkersArea.tsx
git commit -m "feat: publish detail entity from SocialWorkersArea"
```

---

### Task 8: Wire setDetailEntity in SmartBadgesArea

**Files:**
- Modify: `src/features/siteOperations/SmartBadgesArea.tsx`

- [ ] **Step 1: Add import**

```ts
import { useSetDetailEntity } from "../../shared/DetailPageContext";
```

- [ ] **Step 2: Call hook and add useEffect**

After `const { id: routeId } = useParams();` (line 70), add:

```ts
const setDetailEntity = useSetDetailEntity();
```

After the URL→drawer sync `useEffect` (lines 107–116), add:

```ts
useEffect(() => {
  if (routeId && routeId !== "activate" && drawer.kind === "view") {
    setDetailEntity({ entityType: "smart_badge", entityId: routeId, entityName: drawer.badge.deviceCode });
  } else {
    setDetailEntity(null);
  }
  return () => setDetailEntity(null);
}, [routeId, drawer, setDetailEntity]);
```

- [ ] **Step 3: Verify build + commit**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard && npx vite build 2>&1 | tail -5
git add src/features/siteOperations/SmartBadgesArea.tsx
git commit -m "feat: publish detail entity from SmartBadgesArea"
```

---

### Task 9: Wire setDetailEntity in SchedulesArea

**Files:**
- Modify: `src/features/siteOperations/SchedulesArea.tsx`

- [ ] **Step 1: Add import**

```ts
import { useSetDetailEntity } from "../../shared/DetailPageContext";
```

- [ ] **Step 2: Call hook and add useEffect**

After `const { id: routeId } = useParams();` (line 40), add:

```ts
const setDetailEntity = useSetDetailEntity();
```

After the URL→drawer sync `useEffect` (lines 86–93), add:

```ts
useEffect(() => {
  if (routeId && drawer.kind === "view") {
    setDetailEntity({ entityType: "schedule", entityId: routeId, entityName: drawer.schedule.serviceProject });
  } else {
    setDetailEntity(null);
  }
  return () => setDetailEntity(null);
}, [routeId, drawer, setDetailEntity]);
```

- [ ] **Step 3: Verify build + commit**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard && npx vite build 2>&1 | tail -5
git add src/features/siteOperations/SchedulesArea.tsx
git commit -m "feat: publish detail entity from SchedulesArea"
```

---

### Task 10: Wire setDetailEntity in ServiceObjectsArea

**Files:**
- Modify: `src/features/siteOperations/ServiceObjectsArea.tsx`

- [ ] **Step 1: Add import**

```ts
import { useSetDetailEntity } from "../../shared/DetailPageContext";
```

- [ ] **Step 2: Call hook and add useEffect**

After `const { id: routeId } = useParams();` (line 108), add:

```ts
const setDetailEntity = useSetDetailEntity();
```

After the URL→drawer sync `useEffect` (lines 146–155), add:

```ts
useEffect(() => {
  if (routeId && routeId !== "new" && drawer.kind === "view") {
    setDetailEntity({ entityType: "service_object", entityId: routeId, entityName: drawer.object.name });
  } else {
    setDetailEntity(null);
  }
  return () => setDetailEntity(null);
}, [routeId, drawer, setDetailEntity]);
```

- [ ] **Step 3: Verify build + commit**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard && npx vite build 2>&1 | tail -5
git add src/features/siteOperations/ServiceObjectsArea.tsx
git commit -m "feat: publish detail entity from ServiceObjectsArea"
```

---

### Task 11: Wire setDetailEntity in RecordsArea

**Files:**
- Modify: `src/features/siteOperations/RecordsArea.tsx`

- [ ] **Step 1: Add import**

```ts
import { useSetDetailEntity } from "../../shared/DetailPageContext";
```

- [ ] **Step 2: Call hook and add useEffect**

After `const { id: routeId } = useParams();` (line 90), add:

```ts
const setDetailEntity = useSetDetailEntity();
```

After both URL→drawer sync `useEffect` blocks (lines 121–146), add:

```ts
useEffect(() => {
  if (viewMode === "records" && routeId && drawer.kind === "view") {
    setDetailEntity({ entityType: "service_record", entityId: routeId, entityName: drawer.record.serviceObjectName ?? "服务记录" });
  } else if (viewMode === "recordings" && routeId && selectedRecording) {
    setDetailEntity({ entityType: "recording", entityId: routeId, entityName: selectedRecording.workerName ?? selectedRecording.badgeId ?? "录音" });
  } else {
    setDetailEntity(null);
  }
  return () => setDetailEntity(null);
}, [routeId, viewMode, drawer, selectedRecording, setDetailEntity]);
```

- [ ] **Step 3: Verify build + commit**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard && npx vite build 2>&1 | tail -5
git add src/features/siteOperations/RecordsArea.tsx
git commit -m "feat: publish detail entity from RecordsArea"
```

---

### Task 12: Wire setDetailEntity in QualityPage (SitesView + UsersView)

**Files:**
- Modify: `src/quality/QualityPage.tsx`

- [ ] **Step 1: Add import**

```ts
import { useSetDetailEntity } from "../shared/DetailPageContext";
```

- [ ] **Step 2: Add to SitesView**

Inside `SitesView` function, after the `useParams()` call, add:

```ts
const setDetailEntity = useSetDetailEntity();
```

After the URL→site sync `useEffect` (lines 778–787), add:

```ts
useEffect(() => {
  if (routeId && routeId !== "new" && detailSite) {
    setDetailEntity({ entityType: "site", entityId: routeId, entityName: detailSite.name });
  } else {
    setDetailEntity(null);
  }
  return () => setDetailEntity(null);
}, [routeId, detailSite, setDetailEntity]);
```

- [ ] **Step 3: Add to UsersView**

Inside `UsersView` function, after the `useParams()` call, add:

```ts
const setDetailEntity = useSetDetailEntity();
```

After the URL→user sync `useEffect` (lines 1199–1208), add:

```ts
useEffect(() => {
  if (routeId && routeId !== "new" && detailUser) {
    setDetailEntity({ entityType: "user", entityId: routeId, entityName: detailUser.name });
  } else {
    setDetailEntity(null);
  }
  return () => setDetailEntity(null);
}, [routeId, detailUser, setDetailEntity]);
```

- [ ] **Step 4: Verify build + commit**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard && npx vite build 2>&1 | tail -5
git add src/quality/QualityPage.tsx
git commit -m "feat: publish detail entity from QualityPage SitesView/UsersView"
```

---

### Task 13: Agent prompt.md — Add context parsing section

**Files:**
- Modify: `/home/ubuntu/lumii-goldenyears-agent/skills/goldenyears-orchestrator/prompt.md`
- Modify: `/home/ubuntu/lumii-goldenyears-agent/CLAUDE.md`

- [ ] **Step 1: Add context parsing section to prompt.md**

After the "## 行为规则" section (after line 19), add:

```markdown
## 详情页上下文解析

用户消息可能包含详情页上下文前缀，格式为 `[ctx:页面/实体名称/实体ID]`：
- `[ctx:服务人员/张三/worker-abc]` — 用户正在查看 worker-abc（张三）的详情页
- `[ctx:设备/FW-030/badge-xyz]` — 用户正在查看工牌 FW-030 的详情页
- `[ctx:服务人员]` — 用户在服务人员列表页（无实体上下文）

**规则：**
1. 当消息包含三段式上下文（页面/名称/ID）时，直接使用实体 ID 执行操作，不需要再问"请问要操作哪位？"
2. 当只有页面标签（如 `[ctx:服务人员]`）时，按正常流程收集参数
3. 上下文中的实体 ID 可以直接用于 API 调用的 URL 路径参数
```

- [ ] **Step 2: Add same section to CLAUDE.md**

After the "## 判断用户角色" section, add the same "## 详情页上下文解析" block.

- [ ] **Step 3: Commit**

```bash
cd /home/ubuntu/lumii-goldenyears-agent
git add skills/goldenyears-orchestrator/prompt.md CLAUDE.md
git commit -m "feat: add detail page context parsing instructions"
```

---

### Task 14: Agent mutation sub-skills — Add `[gy:refresh]` marker

**Files:**
- Modify: 15 mutation sub-skill `.md` files in `/home/ubuntu/lumii-goldenyears-agent/skills/goldenyears-orchestrator/sub-skills/`

- [ ] **Step 1: Update sub-skills WITH existing Output Format sections (10 files)**

For each of these 10 files, add `[gy:refresh]` as the last line of the success output template (inside the code block):

**lumii-worker-create.md** — after `状态: 在职`:
```
✅ 服务人员创建成功
姓名: ${NAME}
电话: ${PHONE}
ID: ${RETURNED_ID}
状态: 在职
[gy:refresh]
```

**lumii-worker-update.md** — after `变更内容: ${CHANGED_FIELDS}`:
```
✅ 服务人员已更新
姓名: ${NAME}
变更内容: ${CHANGED_FIELDS}
[gy:refresh]
```

**lumii-badge-activate.md** — after `常用人员: ${WORKER_NAME} (如有)`:
```
✅ 工牌激活成功
设备编号: ${DEVICE_CODE}
ID: ${RETURNED_ID}
状态: 可用
站点: ${SITE_ID}
常用人员: ${WORKER_NAME} (如有)
[gy:refresh]
```

**lumii-badge-update.md** — after `常用人员: ${WORKER_NAME}`:
```
✅ 工牌已更新
设备编号: ${DEVICE_CODE}
新状态: ${STATUS_LABEL}
常用人员: ${WORKER_NAME}
[gy:refresh]
```

**lumii-elder-create.md** — after `ID: ${RETURNED_ID}`:
```
✅ 服务对象创建成功
姓名: ${NAME}
年龄: ${AGE} 岁
地址: ${ADDRESS}
资格类型: ${ELIGIBILITY_TYPE_LABEL}
服务项目: ${SERVICE_PROJECTS}
ID: ${RETURNED_ID}
[gy:refresh]
```

**lumii-elder-update.md** — after `变更内容: ${CHANGES}`:
```
✅ 服务对象已更新
对象: ${NAME}
操作: ${ACTION_LABEL}
变更内容: ${CHANGES}
[gy:refresh]
```

**lumii-schedule-create.md** — after `状态: ${STATUS_LABEL}`:
```
✅ 按次服务排期已创建
日期: ${SERVICE_DATE}
时间窗: ${START_TIME} - ${END_TIME}
服务对象: ${OBJECT_NAME}
服务项目: ${SERVICE_PROJECT}
服务人员: ${WORKER_NAME} (如有)
排期 ID: ${RETURNED_ID}
状态: ${STATUS_LABEL}
[gy:refresh]
```

**lumii-schedule-adjust.md** — after `新状态: ${STATUS_LABEL}`:
```
✅ 排期已调整
排期 ID: ${SCHEDULE_ID}
服务对象: ${OBJECT_NAME}
调整内容: ${CHANGES}
新状态: ${STATUS_LABEL}
[gy:refresh]
```

**lumii-record-review.md** — after `新导出状态: ${NEW_EXPORT_STATUS}`:
```
✅ 服务记录复核完成
记录 ID: ${RECORD_ID}
操作: ${ACTION_LABEL}
新复核状态: ${NEW_REVIEW_STATUS}
新导出状态: ${NEW_EXPORT_STATUS}
[gy:refresh]
```

**lumii-record-export.md** — after `异常标记: ${FLAGS_STATUS}`:
```
✅ 服务记录导出成功
导出 ID: ${EXPORT_ID}
版本: ${FILE_VERSION}
导出时间: ${EXPORTED_AT}
包含记录: ${RECORD_COUNT} 条
导出字段: ${FIELDS_LIST}
异常标记: ${FLAGS_STATUS}
[gy:refresh]
```

- [ ] **Step 2: Update sub-skills WITHOUT existing Output Format sections (5 files)**

These files have no Output Format section. Add one at the end of each file.

**lumii-user-create.md** — append:
```markdown
## Output Format

成功:
```
✅ 用户创建成功
用户名: ${USERNAME}
姓名: ${NAME}
角色: ${ROLE_LABEL}
[gy:refresh]
```

失败:
```
❌ 创建失败: ${ERROR_MESSAGE}
```
```

**lumii-user-update.md** — append:
```markdown
## Output Format

成功:
```
✅ 用户已更新
用户名: ${USERNAME}
变更内容: ${CHANGES}
[gy:refresh]
```

失败:
```
❌ 更新失败: ${ERROR_MESSAGE}
```
```

**lumii-site-update.md** — append:
```markdown
## Output Format

成功:
```
✅ 站点已更新
站点: ${SITE_NAME}
变更内容: ${CHANGES}
[gy:refresh]
```

失败:
```
❌ 更新失败: ${ERROR_MESSAGE}
```
```

**lumii-feishu-bind.md** — append:
```markdown
## Output Format

成功:
```
✅ 飞书用户角色已设置
用户: ${USER_NAME}
角色: ${ROLE_LABEL}
关联站点: ${SITE_NAMES}
[gy:refresh]
```

失败:
```
❌ 设置失败: ${ERROR_MESSAGE}
```
```

**lumii-feishu-unbind.md** — append:
```markdown
## Output Format

成功:
```
✅ 已解除飞书用户角色绑定
用户: ${USER_NAME}
[gy:refresh]
```

失败:
```
❌ 解除失败: ${ERROR_MESSAGE}
```
```

- [ ] **Step 3: Commit**

```bash
cd /home/ubuntu/lumii-goldenyears-agent
git add skills/goldenyears-orchestrator/sub-skills/
git commit -m "feat: add [gy:refresh] marker to all mutation sub-skill output formats"
```

---

### Task 15: Deploy + Real E2E Verification

**Files:**
- No code changes — deployment and verification only

- [ ] **Step 1: Run all tests**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard && npx vitest run src/shared/
```
Expected: All tests pass (existing + new DetailPageContext + useAgentChatRefresh)

- [ ] **Step 2: Build frontend**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard && npx vite build
```
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Deploy dashboard to staging**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard && ./deploy.sh
```
Expected: Deployed to `stage-gy.lumii-ai.cn`

- [ ] **Step 4: Push agent skill changes**

```bash
cd /home/ubuntu/lumii-goldenyears-agent && git push
```

- [ ] **Step 5: Deploy agent skills to agent VM**

```bash
ssh coder@18.142.48.45 "cd ~/lumii-goldenyears-agent && git pull"
```

CC reads skill files on session start. New sessions will automatically use the updated skills. No lak restart needed.

- [ ] **Step 6: E2E — Context enrichment**

1. Open staging dashboard, navigate to a social worker detail page
2. Open copilot, send a message
3. Verify the message received by agent contains `[ctx:服务人员/NAME/ID]` format (check via copilot response or server logs)

- [ ] **Step 7: E2E — Mutation + auto-refresh**

1. On the social worker detail page, in copilot type: "修改当前对象的电话号码为 13899990000"
2. Verify:
   - Agent uses the entity ID directly (does not ask "which worker?")
   - Agent calls `PATCH /social-workers/:id`
   - Reply text shows success message
   - `[gy:refresh]` is NOT visible in the chat bubble
   - Page data refreshes automatically showing the new phone number

- [ ] **Step 8: E2E — History replay safety**

1. Refresh the browser page
2. Copilot loads historical messages
3. Verify: the `[gy:refresh]` text is stripped from displayed messages, AND no refetch is triggered on page load

- [ ] **Step 9: E2E — List page no-refresh**

1. Navigate back to the workers list page
2. In copilot, send a read-only query like "在职人数有多少"
3. Verify: response does NOT contain `[gy:refresh]`, no page data refresh triggered

- [ ] **Step 10: Revert test data**

Restore the worker's phone number to its original value via the detail page UI or copilot.

- [ ] **Step 11: Final commit — push all dashboard changes**

```bash
cd /home/ubuntu/lumii-goldenyears-dashboard && git push
```
