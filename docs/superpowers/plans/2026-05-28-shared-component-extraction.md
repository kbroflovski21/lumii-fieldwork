# Shared Component Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 13 reusable components, hooks, and utilities from duplicated code across Area files into `src/shared/`, eliminating redundancy while preserving identical behavior.

**Architecture:** Pure extraction refactor. For each shared item: write failing test → create shared file → replace all call sites → verify all tests pass → commit. No new features, no behavior changes.

**Tech Stack:** React 18, TypeScript, Vitest + @testing-library/react, react-router-dom v6, lucide-react icons, existing `sw-*` CSS classes.

---

## File Map

### New files (create)
- `src/shared/components/StatusBadge.tsx`
- `src/shared/components/AvatarInitial.tsx`
- `src/shared/components/FilterDropdown.tsx`
- `src/shared/components/EmptyState.tsx`
- `src/shared/components/OperationalBanner.tsx`
- `src/shared/components/ConfirmAction.tsx`
- `src/shared/components/ListToolbar.tsx`
- `src/shared/hooks/useInlineEdit.ts`
- `src/shared/hooks/useEscClose.ts` (moved from features)
- `src/shared/hooks/useFetch.ts`
- `src/shared/hooks/useCopyToClipboard.ts`
- `src/shared/hooks/useRouteDetail.ts`
- `src/shared/utils/dateTimeUtils.ts`
- `src/shared/utilities.css`
- `src/shared/__tests__/StatusBadge.test.tsx`
- `src/shared/__tests__/AvatarInitial.test.tsx`
- `src/shared/__tests__/FilterDropdown.test.tsx`
- `src/shared/__tests__/dateTimeUtils.test.ts`
- `src/shared/__tests__/EmptyState.test.tsx`
- `src/shared/__tests__/OperationalBanner.test.tsx`
- `src/shared/__tests__/ConfirmAction.test.tsx`
- `src/shared/__tests__/ListToolbar.test.tsx`
- `src/shared/__tests__/useInlineEdit.test.ts`
- `src/shared/__tests__/useFetch.test.ts`
- `src/shared/__tests__/useCopyToClipboard.test.ts`
- `src/shared/__tests__/useRouteDetail.test.ts`

### Modified files (replace inline code with shared imports)
- `src/features/siteOperations/SocialWorkersArea.tsx`
- `src/features/siteOperations/SmartBadgesArea.tsx`
- `src/features/siteOperations/SchedulesArea.tsx`
- `src/features/siteOperations/ServiceObjectsArea.tsx`
- `src/features/siteOperations/RecordsArea.tsx`
- `src/quality/QualityPage.tsx`

### Deleted files
- `src/features/siteOperations/useEscClose.ts` (moved to shared/hooks/)

---

## Phase 1: High Priority

### Task 1: StatusBadge

**Files:**
- Create: `src/shared/components/StatusBadge.tsx`
- Test: `src/shared/__tests__/StatusBadge.test.tsx`
- Modify: `SocialWorkersArea.tsx`, `SmartBadgesArea.tsx`, `SchedulesArea.tsx`, `ServiceObjectsArea.tsx`, `RecordsArea.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/StatusBadge.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../components/StatusBadge";

describe("StatusBadge", () => {
  it("renders children text", () => {
    render(<StatusBadge tone="success">在职</StatusBadge>);
    expect(screen.getByText("在职")).toBeInTheDocument();
  });

  it("sets data-tone attribute", () => {
    render(<StatusBadge tone="warning">待补全</StatusBadge>);
    const el = screen.getByText("待补全");
    expect(el).toHaveAttribute("data-tone", "warning");
  });

  it("uses sw-status-badge class", () => {
    render(<StatusBadge tone="muted">已归档</StatusBadge>);
    expect(screen.getByText("已归档")).toHaveClass("sw-status-badge");
  });

  it("forwards style prop", () => {
    render(<StatusBadge tone="accent" style={{ fontSize: 10 }}>进行中</StatusBadge>);
    expect(screen.getByText("进行中")).toHaveStyle({ fontSize: "10px" });
  });

  it("renders all tone values correctly", () => {
    const tones = ["success", "warning", "danger", "accent", "info", "muted"];
    tones.forEach(tone => {
      const { unmount } = render(<StatusBadge tone={tone}>{tone}</StatusBadge>);
      expect(screen.getByText(tone)).toHaveAttribute("data-tone", tone);
      unmount();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/StatusBadge.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement StatusBadge**

```tsx
// src/shared/components/StatusBadge.tsx
import type { ReactNode, CSSProperties } from "react";

interface StatusBadgeProps {
  tone: string;
  children: ReactNode;
  style?: CSSProperties;
}

export function StatusBadge({ tone, children, style }: StatusBadgeProps) {
  return (
    <span className="sw-status-badge" data-tone={tone} style={style}>
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/StatusBadge.test.tsx`
Expected: 5 tests PASS

- [ ] **Step 5: Replace call sites in all Area files**

In every Area file, add import at the top:
```tsx
import { StatusBadge } from "../shared/components/StatusBadge";
```

Then replace every instance of the pattern:
```tsx
// BEFORE:
<span className="sw-status-badge" data-tone={TONE}>{TEXT}</span>
// or with style:
<span className="sw-status-badge" data-tone={TONE} style={STYLE}>{TEXT}</span>

// AFTER:
<StatusBadge tone={TONE}>{TEXT}</StatusBadge>
// or with style:
<StatusBadge tone={TONE} style={STYLE}>{TEXT}</StatusBadge>
```

Files and approximate line locations (25 replacements total):
- `SocialWorkersArea.tsx`: lines 418, 445, 599, 640
- `SmartBadgesArea.tsx`: lines 295, 326, 430
- `SchedulesArea.tsx`: lines 241, 252, 541, 721
- `ServiceObjectsArea.tsx`: lines 311, 327, 810, 878, 1006, 1225, 1226
- `RecordsArea.tsx`: lines 287, 305, 395, 406, 412

**Important:** Some instances use inline `style` props (e.g., `style={{ fontSize: 10, padding: "2px 6px" }}`). Keep those by passing `style` to `StatusBadge`.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS (existing + new)

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/StatusBadge.tsx src/shared/__tests__/StatusBadge.test.tsx src/features/siteOperations/SocialWorkersArea.tsx src/features/siteOperations/SmartBadgesArea.tsx src/features/siteOperations/SchedulesArea.tsx src/features/siteOperations/ServiceObjectsArea.tsx src/features/siteOperations/RecordsArea.tsx
git commit -m "refactor: extract StatusBadge shared component, replace 25 call sites"
```

---

### Task 2: AvatarInitial

**Files:**
- Create: `src/shared/components/AvatarInitial.tsx`
- Test: `src/shared/__tests__/AvatarInitial.test.tsx`
- Modify: `SocialWorkersArea.tsx`, `SchedulesArea.tsx`, `RecordsArea.tsx`, `ServiceObjectsArea.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/AvatarInitial.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvatarInitial, avatarColor } from "../components/AvatarInitial";

describe("avatarColor", () => {
  it("returns an object with bg and text properties", () => {
    const result = avatarColor("张三");
    expect(result).toHaveProperty("bg");
    expect(result).toHaveProperty("text");
  });

  it("returns consistent color for the same name", () => {
    expect(avatarColor("张三")).toEqual(avatarColor("张三"));
  });

  it("returns a color from the 6-color palette", () => {
    const palette = ["#EEF2FF", "#F0FDF4", "#FFF7ED", "#FDF2F8", "#ECFEFF", "#F5F3FF"];
    const result = avatarColor("李明");
    expect(palette).toContain(result.bg);
  });
});

describe("AvatarInitial", () => {
  it("renders first character of name", () => {
    render(<AvatarInitial name="张三" />);
    expect(screen.getByText("张")).toBeInTheDocument();
  });

  it("applies sw-avatar class", () => {
    const { container } = render(<AvatarInitial name="李明" />);
    expect(container.querySelector(".sw-avatar")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(<AvatarInitial name="王五" className="my-class" />);
    expect(container.querySelector(".sw-avatar.my-class")).toBeTruthy();
  });

  it("renders medium (36px) by default", () => {
    const { container } = render(<AvatarInitial name="赵六" />);
    const el = container.querySelector(".sw-avatar") as HTMLElement;
    expect(el.style.width).toBe("36px");
    expect(el.style.height).toBe("36px");
  });

  it("renders small (28px) with size=sm", () => {
    const { container } = render(<AvatarInitial name="赵六" size="sm" />);
    const el = container.querySelector(".sw-avatar") as HTMLElement;
    expect(el.style.width).toBe("28px");
    expect(el.style.height).toBe("28px");
  });

  it("renders large (48px) with size=lg", () => {
    const { container } = render(<AvatarInitial name="赵六" size="lg" />);
    const el = container.querySelector(".sw-avatar") as HTMLElement;
    expect(el.style.width).toBe("48px");
    expect(el.style.height).toBe("48px");
  });

  it("sets background and text color from avatarColor", () => {
    const { container } = render(<AvatarInitial name="张三" />);
    const el = container.querySelector(".sw-avatar") as HTMLElement;
    const color = avatarColor("张三");
    expect(el.style.background).toBe(color.bg);
    expect(el.style.color).toBe(color.text);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/AvatarInitial.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AvatarInitial**

```tsx
// src/shared/components/AvatarInitial.tsx
const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#4F46E5" },
  { bg: "#F0FDF4", text: "#16A34A" },
  { bg: "#FFF7ED", text: "#EA580C" },
  { bg: "#FDF2F8", text: "#DB2777" },
  { bg: "#ECFEFF", text: "#0891B2" },
  { bg: "#F5F3FF", text: "#7C3AED" },
];

const SIZES = { sm: 28, md: 36, lg: 48 } as const;
const FONT_SIZES = { sm: 12, md: 14, lg: 18 } as const;
const RADII = { sm: 8, md: 10, lg: 12 } as const;

export function avatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface AvatarInitialProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarInitial({ name, size = "md", className }: AvatarInitialProps) {
  const color = avatarColor(name);
  const px = SIZES[size];
  return (
    <div
      className={`sw-avatar${className ? ` ${className}` : ""}`}
      style={{
        background: color.bg,
        color: color.text,
        width: px,
        height: px,
        fontSize: FONT_SIZES[size],
        borderRadius: RADII[size],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {name.slice(0, 1)}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/AvatarInitial.test.tsx`
Expected: 10 tests PASS

- [ ] **Step 5: Replace call sites**

In each Area file, add import and remove local `avatarColor`/`getInitials` functions:

```tsx
import { AvatarInitial } from "../shared/components/AvatarInitial";
```

Delete the local `avatarColor` and `getInitials` functions from:
- `SocialWorkersArea.tsx` (lines 59-75)
- `SchedulesArea.tsx` (lines 39-50)
- `RecordsArea.tsx` (lines 99-109)
- `ServiceObjectsArea.tsx` (lines 92-103)

Replace call sites (7 total):
```tsx
// BEFORE (default 36px):
<div className="sw-avatar" style={{ background: color.bg, color: color.text }}>{getInitials(worker.name)}</div>
// AFTER:
<AvatarInitial name={worker.name} />

// BEFORE (28px variant):
<div className="sw-avatar" style={{ background: color.bg, color: color.text, width: 28, height: 28, fontSize: 12, borderRadius: 8 }}>{getInitials(name)}</div>
// AFTER:
<AvatarInitial name={name} size="sm" />
```

Also remove the now-unused `const color = avatarColor(...)` lines that computed color for each avatar.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/AvatarInitial.tsx src/shared/__tests__/AvatarInitial.test.tsx src/features/siteOperations/SocialWorkersArea.tsx src/features/siteOperations/SchedulesArea.tsx src/features/siteOperations/RecordsArea.tsx src/features/siteOperations/ServiceObjectsArea.tsx
git commit -m "refactor: extract AvatarInitial shared component, remove 4 duplicate avatarColor functions"
```

---

### Task 3: dateTimeUtils

**Files:**
- Create: `src/shared/utils/dateTimeUtils.ts`
- Test: `src/shared/__tests__/dateTimeUtils.test.ts`
- Modify: `SocialWorkersArea.tsx`, `SmartBadgesArea.tsx`, `SchedulesArea.tsx`, `RecordsArea.tsx`, `ServiceObjectsArea.tsx`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/__tests__/dateTimeUtils.test.ts
import { describe, it, expect } from "vitest";
import { formatDateWithDay, formatDateShort, formatSyncTime, formatTime, toBjStr, formatWindow } from "../utils/dateTimeUtils";

describe("formatDateWithDay", () => {
  it("formats date with Chinese day-of-week", () => {
    const result = formatDateWithDay("2026-05-28");
    expect(result).toMatch(/5\/28/);
    expect(result).toMatch(/周/);
  });

  it("returns raw string for invalid date", () => {
    expect(formatDateWithDay("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateShort", () => {
  it("formats as M/D", () => {
    expect(formatDateShort("2026-05-28")).toBe("5/28");
  });

  it("returns raw string for invalid date", () => {
    expect(formatDateShort("bad")).toBe("bad");
  });
});

describe("formatSyncTime", () => {
  it("returns empty string for undefined", () => {
    expect(formatSyncTime(undefined)).toBe("");
    expect(formatSyncTime("")).toBe("");
  });

  it("formats ISO string to zh-CN locale", () => {
    const result = formatSyncTime("2026-05-28T14:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("2026-05-28T14:30:00Z");
  });

  it("returns raw string for invalid ISO", () => {
    expect(formatSyncTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatTime", () => {
  it("returns empty string for undefined", () => {
    expect(formatTime(undefined)).toBe("");
  });

  it("formats ISO string with Asia/Shanghai timezone", () => {
    const result = formatTime("2026-05-28T06:30:00Z");
    expect(result).toBeTruthy();
  });

  it("returns raw string for invalid ISO", () => {
    expect(formatTime("not-a-date")).toBe("not-a-date");
  });
});

describe("toBjStr", () => {
  it("returns date, time, and full strings in Beijing time", () => {
    const d = new Date("2026-05-28T06:30:00Z"); // 14:30 in Beijing
    const result = toBjStr(d);
    expect(result.date).toBe("5/28");
    expect(result.time).toBe("14:30");
    expect(result.full).toMatch(/2026-05-28 14:30/);
  });
});

describe("formatWindow", () => {
  it("returns timeWindow label if available", () => {
    expect(formatWindow({ timeWindow: { label: "上午" } })).toBe("上午");
  });

  it("returns start-end range from timeWindow", () => {
    expect(formatWindow({ timeWindow: { start: "09:00", end: "12:00" } })).toBe("09:00-12:00");
  });

  it("falls back to startTime/endTime", () => {
    expect(formatWindow({ startTime: "14:00", endTime: "17:00" })).toBe("14:00-17:00");
  });

  it("handles missing values", () => {
    expect(formatWindow({})).toBe("-");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/dateTimeUtils.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement dateTimeUtils**

```ts
// src/shared/utils/dateTimeUtils.ts

export function formatDateWithDay(d: string): string {
  const date = new Date(`${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getMonth() + 1}/${date.getDate()} 周${days[date.getDay()]}`;
}

export function formatDateShort(d: string): string {
  const date = new Date(`${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatSyncTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function toBjStr(d: Date): { date: string; time: string; full: string } {
  const bj = new Date(d.getTime() + 8 * 3600000);
  return {
    date: `${bj.getUTCMonth() + 1}/${bj.getUTCDate()}`,
    time: `${bj.getUTCHours().toString().padStart(2, "0")}:${bj.getUTCMinutes().toString().padStart(2, "0")}`,
    full: bj.toISOString().replace("T", " ").slice(0, 16),
  };
}

export function formatWindow(s: {
  timeWindow?: { label?: string; start?: string; end?: string };
  startTime?: string;
  endTime?: string;
}): string {
  if (s.timeWindow?.label) return s.timeWindow.label;
  return `${s.startTime ?? s.timeWindow?.start ?? ""}-${s.endTime ?? s.timeWindow?.end ?? ""}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/dateTimeUtils.test.ts`
Expected: All PASS

- [ ] **Step 5: Replace call sites**

Add import in each file:
```tsx
import { formatSyncTime } from "../shared/utils/dateTimeUtils";
// or whichever functions that file uses
```

Delete local function definitions:
- `SocialWorkersArea.tsx`: delete `formatSyncTime` (~lines 52-57)
- `SmartBadgesArea.tsx`: delete `formatSyncTime` (~lines 53-58)
- `SchedulesArea.tsx`: delete `formatDate` (~lines 27-32), `formatWindow` (~lines 34-37); import `formatDateWithDay` (rename usages of `formatDate` to `formatDateWithDay`) and `formatWindow`
- `RecordsArea.tsx`: delete `formatDate` (~lines 77-81), `formatTime` (~lines 83-88), `toBjStr` (~lines 90-97); import `formatDateShort` (rename usages of `formatDate` to `formatDateShort`), `formatTime`, `toBjStr`
- `ServiceObjectsArea.tsx`: delete `formatTime` (~lines 105-110); import `formatTime`

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/utils/dateTimeUtils.ts src/shared/__tests__/dateTimeUtils.test.ts src/features/siteOperations/SocialWorkersArea.tsx src/features/siteOperations/SmartBadgesArea.tsx src/features/siteOperations/SchedulesArea.tsx src/features/siteOperations/RecordsArea.tsx src/features/siteOperations/ServiceObjectsArea.tsx
git commit -m "refactor: extract dateTimeUtils shared module, consolidate 7 format functions"
```

---

### Task 4: FilterDropdown

**Files:**
- Create: `src/shared/components/FilterDropdown.tsx`
- Test: `src/shared/__tests__/FilterDropdown.test.tsx`
- Modify: `SocialWorkersArea.tsx`, `SmartBadgesArea.tsx`, `RecordsArea.tsx`, `ServiceObjectsArea.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/FilterDropdown.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterDropdown } from "../components/FilterDropdown";

const options = [
  { label: "全部", value: "" },
  { label: "在职", value: "active" },
  { label: "已归档", value: "archived" },
];

describe("FilterDropdown", () => {
  it("renders all options", () => {
    render(<FilterDropdown onChange={() => {}} options={options} value="" />);
    expect(screen.getByText("全部")).toBeInTheDocument();
    expect(screen.getByText("在职")).toBeInTheDocument();
    expect(screen.getByText("已归档")).toBeInTheDocument();
  });

  it("uses sw-filter class", () => {
    const { container } = render(<FilterDropdown onChange={() => {}} options={options} value="" />);
    expect(container.querySelector(".sw-filter")).toBeTruthy();
  });

  it("does not add active class when value is empty", () => {
    const { container } = render(<FilterDropdown onChange={() => {}} options={options} value="" />);
    expect(container.querySelector(".sw-filter--active")).toBeNull();
  });

  it("adds active class when value is non-empty", () => {
    const { container } = render(<FilterDropdown onChange={() => {}} options={options} value="active" />);
    expect(container.querySelector(".sw-filter--active")).toBeTruthy();
  });

  it("calls onChange with selected value", async () => {
    const onChange = vi.fn();
    render(<FilterDropdown onChange={onChange} options={options} value="" />);
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "active");
    expect(onChange).toHaveBeenCalledWith("active");
  });

  it("renders ChevronDown icon", () => {
    const { container } = render(<FilterDropdown onChange={() => {}} options={options} value="" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/FilterDropdown.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement FilterDropdown**

```tsx
// src/shared/components/FilterDropdown.tsx
import { ChevronDown } from "lucide-react";

interface FilterDropdownProps {
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}

export function FilterDropdown({ onChange, options, value }: FilterDropdownProps) {
  return (
    <div className="sw-filter">
      <select
        className={value ? "sw-filter--active" : ""}
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/FilterDropdown.test.tsx`
Expected: 6 tests PASS

- [ ] **Step 5: Replace call sites**

In each file, add import:
```tsx
import { FilterDropdown } from "../shared/components/FilterDropdown";
```

Delete the local `FilterDropdown` function definitions from:
- `SocialWorkersArea.tsx` (~lines 232-256)
- `SmartBadgesArea.tsx` (~lines 217-230)
- `RecordsArea.tsx` (~lines 337-339)
- `ServiceObjectsArea.tsx` (~lines 252-261)

All call sites (`<FilterDropdown onChange={...} options={...} value={...} />`) stay the same — only the import changes.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/FilterDropdown.tsx src/shared/__tests__/FilterDropdown.test.tsx src/features/siteOperations/SocialWorkersArea.tsx src/features/siteOperations/SmartBadgesArea.tsx src/features/siteOperations/RecordsArea.tsx src/features/siteOperations/ServiceObjectsArea.tsx
git commit -m "refactor: extract FilterDropdown shared component, remove 4 duplicate definitions"
```

---

## Phase 2: Medium Priority

### Task 5: EmptyState

**Files:**
- Create: `src/shared/components/EmptyState.tsx`
- Test: `src/shared/__tests__/EmptyState.test.tsx`
- Modify: All 5 Area files

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/EmptyState.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserRound, Search, X } from "lucide-react";
import { EmptyState } from "../components/EmptyState";

describe("EmptyState", () => {
  it("renders with description only", () => {
    render(<EmptyState icon={UserRound} description="加载中..." />);
    expect(screen.getByText("加载中...")).toBeInTheDocument();
  });

  it("renders with title and description", () => {
    render(<EmptyState icon={UserRound} title="暂无数据" description="点击新增创建记录" />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
    expect(screen.getByText("点击新增创建记录")).toBeInTheDocument();
  });

  it("renders action slot", () => {
    render(<EmptyState icon={UserRound} title="暂无数据" action={<button>新增</button>} />);
    expect(screen.getByText("新增")).toBeInTheDocument();
  });

  it("uses sw-empty class structure", () => {
    const { container } = render(<EmptyState icon={UserRound} description="test" />);
    expect(container.querySelector(".sw-empty")).toBeTruthy();
    expect(container.querySelector(".sw-empty__icon")).toBeTruthy();
  });

  it("adds error class when isError is true", () => {
    const { container } = render(<EmptyState icon={X} description="出错了" isError />);
    expect(container.querySelector(".sw-empty__icon--error")).toBeTruthy();
  });

  it("does not add error class when isError is false", () => {
    const { container } = render(<EmptyState icon={UserRound} description="test" />);
    expect(container.querySelector(".sw-empty__icon--error")).toBeNull();
  });

  it("renders icon at size 32", () => {
    const { container } = render(<EmptyState icon={Search} description="无匹配" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/EmptyState.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement EmptyState**

```tsx
// src/shared/components/EmptyState.tsx
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
  isError?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, isError }: EmptyStateProps) {
  return (
    <div className="sw-empty">
      <div className={`sw-empty__icon${isError ? " sw-empty__icon--error" : ""}`}>
        <Icon size={32} />
      </div>
      {title && <strong>{title}</strong>}
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/EmptyState.test.tsx`
Expected: 7 tests PASS

- [ ] **Step 5: Replace call sites in all Area files**

Add import:
```tsx
import { EmptyState } from "../shared/components/EmptyState";
```

Replace pattern (loading example):
```tsx
// BEFORE:
<div className="sw-empty"><div className="sw-empty__icon"><UserRound size={32} /></div><span>服务人员数据加载中...</span></div>
// AFTER:
<EmptyState icon={UserRound} description="服务人员数据加载中..." />

// BEFORE (error):
<div className="sw-empty"><div className="sw-empty__icon sw-empty__icon--error"><X size={32} /></div><span>{error}</span></div>
// AFTER:
<EmptyState icon={X} description={error} isError />

// BEFORE (empty with button):
<div className="sw-empty"><div className="sw-empty__icon"><UserRound size={32} /></div><strong>暂无服务人员</strong><span>点击新增创建第一条记录</span><button ...>新增服务人员</button></div>
// AFTER:
<EmptyState icon={UserRound} title="暂无服务人员" description="点击新增创建第一条记录" action={<button ...>新增服务人员</button>} />

// BEFORE (no match):
<div className="sw-empty"><div className="sw-empty__icon"><Search size={32} /></div><span>没有匹配的人员</span></div>
// AFTER:
<EmptyState icon={Search} description="没有匹配的人员" />
```

Apply to all 5 Area files (25+ replacements).

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/EmptyState.tsx src/shared/__tests__/EmptyState.test.tsx src/features/siteOperations/*.tsx
git commit -m "refactor: extract EmptyState shared component, replace 25+ empty state blocks"
```

---

### Task 6: OperationalBanner

**Files:**
- Create: `src/shared/components/OperationalBanner.tsx`
- Test: `src/shared/__tests__/OperationalBanner.test.tsx`
- Modify: All 5 Area files

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/OperationalBanner.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OperationalBanner } from "../components/OperationalBanner";

describe("OperationalBanner", () => {
  it("returns null for normal state", () => {
    const { container } = render(<OperationalBanner state={{ permission: "full" }} resourceLabel="服务人员" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders unavailable banner with resource label", () => {
    render(<OperationalBanner state={{ unavailableMessage: "系统维护中" }} resourceLabel="设备" />);
    expect(screen.getByText("设备暂不可用")).toBeInTheDocument();
    expect(screen.getByText("系统维护中")).toBeInTheDocument();
  });

  it("renders unavailable banner with danger style", () => {
    const { container } = render(<OperationalBanner state={{ unavailableMessage: "error" }} resourceLabel="X" />);
    expect(container.querySelector(".sw-banner--danger")).toBeTruthy();
  });

  it("renders read-only banner with default hint", () => {
    render(<OperationalBanner state={{ permission: "read_only" }} resourceLabel="长者" />);
    expect(screen.getByText("只读模式")).toBeInTheDocument();
    expect(screen.getByText("可查看数据，新增、编辑等操作已禁用。")).toBeInTheDocument();
  });

  it("renders read-only banner with custom hint", () => {
    render(<OperationalBanner state={{ permission: "read_only" }} resourceLabel="排期" readOnlyHint="可查看数据，调整和取消操作已禁用。" />);
    expect(screen.getByText("可查看数据，调整和取消操作已禁用。")).toBeInTheDocument();
  });

  it("renders restricted banner with default hint", () => {
    render(<OperationalBanner state={{ permission: "restricted" }} resourceLabel="记录" />);
    expect(screen.getByText("权限受限")).toBeInTheDocument();
    expect(screen.getByText("敏感信息已隐藏，部分操作不可用。")).toBeInTheDocument();
  });

  it("renders restricted banner with custom hint", () => {
    render(<OperationalBanner state={{ permission: "restricted" }} resourceLabel="记录" restrictedHint="原始音频不可播放，敏感信息已隐藏。" />);
    expect(screen.getByText("原始音频不可播放，敏感信息已隐藏。")).toBeInTheDocument();
  });

  it("has role=status for accessibility", () => {
    const { container } = render(<OperationalBanner state={{ unavailableMessage: "err" }} resourceLabel="X" />);
    expect(container.querySelector("[role='status']")).toBeTruthy();
  });

  it("prioritizes unavailable over read_only", () => {
    render(<OperationalBanner state={{ unavailableMessage: "down", permission: "read_only" }} resourceLabel="X" />);
    expect(screen.getByText("X暂不可用")).toBeInTheDocument();
    expect(screen.queryByText("只读模式")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/OperationalBanner.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement OperationalBanner**

```tsx
// src/shared/components/OperationalBanner.tsx
import { Shield } from "lucide-react";

interface WorkAreaOperationalState {
  unavailableMessage?: string;
  permission?: string;
}

interface OperationalBannerProps {
  state: WorkAreaOperationalState;
  resourceLabel: string;
  readOnlyHint?: string;
  restrictedHint?: string;
}

export function OperationalBanner({
  state,
  resourceLabel,
  readOnlyHint = "可查看数据，新增、编辑等操作已禁用。",
  restrictedHint = "敏感信息已隐藏，部分操作不可用。",
}: OperationalBannerProps) {
  if (state.unavailableMessage) {
    return (
      <div className="sw-banner sw-banner--danger" role="status">
        <Shield size={16} />
        <div>
          <strong>{resourceLabel}暂不可用</strong>
          <span>{state.unavailableMessage}</span>
        </div>
      </div>
    );
  }
  if (state.permission === "read_only") {
    return (
      <div className="sw-banner sw-banner--warning" role="status">
        <Shield size={16} />
        <div>
          <strong>只读模式</strong>
          <span>{readOnlyHint}</span>
        </div>
      </div>
    );
  }
  if (state.permission === "restricted") {
    return (
      <div className="sw-banner sw-banner--warning" role="status">
        <Shield size={16} />
        <div>
          <strong>权限受限</strong>
          <span>{restrictedHint}</span>
        </div>
      </div>
    );
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/OperationalBanner.test.tsx`
Expected: 9 tests PASS

- [ ] **Step 5: Replace call sites**

Add import in each Area file:
```tsx
import { OperationalBanner } from "../shared/components/OperationalBanner";
```

Delete the local `OperationalBanner` function from each Area file and replace the usage with the shared version, passing appropriate props:

- `SocialWorkersArea.tsx`: `<OperationalBanner state={state} resourceLabel="服务人员" />`
- `SmartBadgesArea.tsx`: `<OperationalBanner state={state} resourceLabel="设备" readOnlyHint="可查看数据，激活和生命周期动作已禁用。" />`
- `SchedulesArea.tsx`: `<OperationalBanner state={state} resourceLabel="服务排期" readOnlyHint="可查看数据，调整和取消操作已禁用。" />`
- `ServiceObjectsArea.tsx`: `<OperationalBanner state={state} resourceLabel="长者" readOnlyHint="可查看数据，新增、编辑和归档操作已禁用。" />`
- `RecordsArea.tsx`: `<OperationalBanner state={state} resourceLabel="服务记录" readOnlyHint="可查看数据，复核和导出操作已禁用。" restrictedHint="原始音频不可播放，敏感信息已隐藏。" />`

Remove `Shield` import from Area files if it was only used by the local OperationalBanner.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/OperationalBanner.tsx src/shared/__tests__/OperationalBanner.test.tsx src/features/siteOperations/*.tsx
git commit -m "refactor: extract OperationalBanner shared component, remove 5 duplicate definitions"
```

---

### Task 7: ConfirmAction

**Files:**
- Create: `src/shared/components/ConfirmAction.tsx`
- Test: `src/shared/__tests__/ConfirmAction.test.tsx`
- Modify: `SocialWorkersArea.tsx`, `SmartBadgesArea.tsx`, `SchedulesArea.tsx`, `ServiceObjectsArea.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/ConfirmAction.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmAction } from "../components/ConfirmAction";

describe("ConfirmAction", () => {
  it("renders trigger button with label", () => {
    render(<ConfirmAction label="归档" onConfirm={() => {}} />);
    expect(screen.getByText("归档")).toBeInTheDocument();
  });

  it("shows confirmation on click", async () => {
    render(<ConfirmAction label="归档" onConfirm={() => {}} />);
    await userEvent.click(screen.getByText("归档"));
    expect(screen.getByText("确认归档？")).toBeInTheDocument();
    expect(screen.getByText("确认归档")).toBeInTheDocument();
    expect(screen.getByText("取消")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmAction label="停用" onConfirm={onConfirm} />);
    await userEvent.click(screen.getByText("停用"));
    await userEvent.click(screen.getByText("确认停用"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("resets on cancel", async () => {
    render(<ConfirmAction label="删除" onConfirm={() => {}} />);
    await userEvent.click(screen.getByText("删除"));
    expect(screen.getByText("确认删除？")).toBeInTheDocument();
    await userEvent.click(screen.getByText("取消"));
    expect(screen.queryByText("确认删除？")).toBeNull();
    expect(screen.getByText("删除")).toBeInTheDocument();
  });

  it("uses danger tone by default", () => {
    const { container } = render(<ConfirmAction label="归档" onConfirm={() => {}} />);
    expect(container.querySelector(".sw-btn--danger-ghost")).toBeTruthy();
  });

  it("respects disabled prop", () => {
    render(<ConfirmAction label="归档" onConfirm={() => {}} disabled />);
    expect(screen.getByText("归档")).toBeDisabled();
  });

  it("uses custom confirmLabel", async () => {
    render(<ConfirmAction label="通过" confirmLabel="确认通过审核" onConfirm={() => {}} />);
    await userEvent.click(screen.getByText("通过"));
    expect(screen.getByText("确认通过审核")).toBeInTheDocument();
  });

  it("passes buttonStyle to trigger button", () => {
    render(<ConfirmAction label="归档" onConfirm={() => {}} buttonStyle={{ height: 28 }} />);
    expect(screen.getByText("归档")).toHaveStyle({ height: "28px" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/ConfirmAction.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ConfirmAction**

```tsx
// src/shared/components/ConfirmAction.tsx
import { useState, type CSSProperties } from "react";

interface ConfirmActionProps {
  label: string;
  confirmLabel?: string;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  disabled?: boolean;
  buttonStyle?: CSSProperties;
}

export function ConfirmAction({
  label,
  confirmLabel,
  tone = "danger",
  onConfirm,
  disabled,
  buttonStyle,
}: ConfirmActionProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const effectiveConfirmLabel = confirmLabel ?? `确认${label}`;

  if (showConfirm) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: tone === "danger" ? "#B54E34" : "#C4893A" }}>
          {effectiveConfirmLabel}？
        </span>
        <button
          className={`sw-btn sw-btn--${tone}`}
          style={buttonStyle}
          type="button"
          onClick={() => { onConfirm(); setShowConfirm(false); }}
        >
          {effectiveConfirmLabel}
        </button>
        <button
          className="sw-btn sw-btn--secondary"
          style={buttonStyle}
          type="button"
          onClick={() => setShowConfirm(false)}
        >
          取消
        </button>
      </span>
    );
  }

  return (
    <button
      className={`sw-btn sw-btn--${tone}-ghost`}
      style={buttonStyle}
      type="button"
      disabled={disabled}
      onClick={() => setShowConfirm(true)}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/ConfirmAction.test.tsx`
Expected: 8 tests PASS

- [ ] **Step 5: Replace call sites**

Replace inline confirmation patterns in Area files with `<ConfirmAction>`. Example:

```tsx
// BEFORE (SocialWorkersArea.tsx ~lines 565-570):
{showArchiveConfirm ? (
  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ fontSize: 13, color: "#B54E34" }}>确认归档？</span>
    <button className="sw-btn sw-btn--danger" style={{ height: 28, fontSize: 12 }} type="button" onClick={handleArchive}>确认归档</button>
    <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} type="button" onClick={() => setShowArchiveConfirm(false)}>取消</button>
  </span>
) : (
  <button className="sw-btn sw-btn--danger-ghost" style={{ height: 28, fontSize: 12 }} type="button" onClick={() => setShowArchiveConfirm(true)}>归档</button>
)}

// AFTER:
<ConfirmAction label="归档" onConfirm={handleArchive} buttonStyle={{ height: 28, fontSize: 12 }} />
```

Also remove the `showArchiveConfirm`/`showDisableConfirm`/etc. state variables that are no longer needed.

Apply similar replacements in SmartBadgesArea (停用, 丢失), SchedulesArea (取消), ServiceObjectsArea (归档, 停用, 删除).

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/ConfirmAction.tsx src/shared/__tests__/ConfirmAction.test.tsx src/features/siteOperations/*.tsx
git commit -m "refactor: extract ConfirmAction shared component, replace 12+ inline confirm patterns"
```

---

### Task 8: useInlineEdit

**Files:**
- Create: `src/shared/hooks/useInlineEdit.ts`
- Test: `src/shared/__tests__/useInlineEdit.test.ts`
- Modify: Area files with inline edit patterns

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/useInlineEdit.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInlineEdit } from "../hooks/useInlineEdit";

describe("useInlineEdit", () => {
  it("starts in non-editing state", () => {
    const { result } = renderHook(() => useInlineEdit("hello", vi.fn()));
    expect(result.current.editing).toBe(false);
    expect(result.current.draft).toBe("hello");
    expect(result.current.saving).toBe(false);
  });

  it("startEdit sets editing to true", () => {
    const { result } = renderHook(() => useInlineEdit("hello", vi.fn()));
    act(() => result.current.startEdit());
    expect(result.current.editing).toBe(true);
  });

  it("setDraft updates draft value", () => {
    const { result } = renderHook(() => useInlineEdit("hello", vi.fn()));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("world"));
    expect(result.current.draft).toBe("world");
  });

  it("cancel resets draft and exits editing", () => {
    const { result } = renderHook(() => useInlineEdit("hello", vi.fn()));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("world"));
    act(() => result.current.cancel());
    expect(result.current.editing).toBe(false);
    expect(result.current.draft).toBe("hello");
  });

  it("save calls onSave with draft and exits editing on success", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useInlineEdit("hello", onSave));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("world"));
    await act(async () => { await result.current.save(); });
    expect(onSave).toHaveBeenCalledWith("world");
    expect(result.current.editing).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it("save keeps editing on rejection", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useInlineEdit("hello", onSave));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("world"));
    await act(async () => { await result.current.save(); });
    expect(result.current.editing).toBe(true);
    expect(result.current.saving).toBe(false);
  });

  it("syncs draft when initialValue changes and not editing", () => {
    const { result, rerender } = renderHook(
      ({ initial }) => useInlineEdit(initial, vi.fn()),
      { initialProps: { initial: "hello" } }
    );
    expect(result.current.draft).toBe("hello");
    rerender({ initial: "updated" });
    expect(result.current.draft).toBe("updated");
  });

  it("does not sync draft when editing", () => {
    const { result, rerender } = renderHook(
      ({ initial }) => useInlineEdit(initial, vi.fn()),
      { initialProps: { initial: "hello" } }
    );
    act(() => result.current.startEdit());
    act(() => result.current.setDraft("my-edit"));
    rerender({ initial: "updated" });
    expect(result.current.draft).toBe("my-edit");
  });

  it("works with object values", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const initial = { name: "张三", phone: "123" };
    const { result } = renderHook(() => useInlineEdit(initial, onSave));
    act(() => result.current.startEdit());
    act(() => result.current.setDraft({ name: "李四", phone: "456" }));
    await act(async () => { await result.current.save(); });
    expect(onSave).toHaveBeenCalledWith({ name: "李四", phone: "456" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/useInlineEdit.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement useInlineEdit**

```ts
// src/shared/hooks/useInlineEdit.ts
import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from "react";

export function useInlineEdit<T>(
  initialValue: T,
  onSave: (value: T) => Promise<void>,
): {
  editing: boolean;
  draft: T;
  setDraft: Dispatch<SetStateAction<T>>;
  startEdit: () => void;
  cancel: () => void;
  save: () => Promise<void>;
  saving: boolean;
} {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(initialValue);
  }, [initialValue, editing]);

  const startEdit = useCallback(() => {
    setDraft(initialValue);
    setEditing(true);
  }, [initialValue]);

  const cancel = useCallback(() => {
    setDraft(initialValue);
    setEditing(false);
  }, [initialValue]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // keep editing on failure
    } finally {
      setSaving(false);
    }
  }, [draft, onSave]);

  return { editing, draft, setDraft, startEdit, cancel, save, saving };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/useInlineEdit.test.ts`
Expected: 9 tests PASS

- [ ] **Step 5: Replace select call sites (incremental)**

Replace the most straightforward inline edit patterns first. Example from SocialWorkersArea (basic info edit):

```tsx
// BEFORE: manual state management
const [editingBasic, setEditingBasic] = useState(false);
const [editName, setEditName] = useState(worker.name);
const [editPhone, setEditPhone] = useState(worker.phone);
// ... save handler with try/catch/finally

// AFTER: use hook
const basicEdit = useInlineEdit(
  { name: worker.name, phone: worker.phone },
  async (draft) => { /* existing PATCH call */ }
);
// Use: basicEdit.editing, basicEdit.draft.name, basicEdit.setDraft, basicEdit.save, basicEdit.cancel
```

Apply to the clearest cases in SocialWorkersArea, SmartBadgesArea, ServiceObjectsArea. Leave complex multi-field patterns that don't fit the hook cleanly.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/hooks/useInlineEdit.ts src/shared/__tests__/useInlineEdit.test.ts src/features/siteOperations/*.tsx
git commit -m "refactor: extract useInlineEdit hook, replace inline edit state patterns"
```

---

### Task 9: ListToolbar

**Files:**
- Create: `src/shared/components/ListToolbar.tsx`
- Test: `src/shared/__tests__/ListToolbar.test.tsx`
- Modify: All 5 Area files

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/ListToolbar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListToolbar } from "../components/ListToolbar";

describe("ListToolbar", () => {
  it("renders search input with placeholder", () => {
    render(<ListToolbar searchValue="" onSearchChange={() => {}} searchPlaceholder="搜索姓名..." />);
    expect(screen.getByPlaceholderText("搜索姓名...")).toBeInTheDocument();
  });

  it("uses default placeholder", () => {
    render(<ListToolbar searchValue="" onSearchChange={() => {}} />);
    expect(screen.getByPlaceholderText("搜索...")).toBeInTheDocument();
  });

  it("calls onSearchChange when typing", async () => {
    const onChange = vi.fn();
    render(<ListToolbar searchValue="" onSearchChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText("搜索..."), "test");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders filters slot", () => {
    render(<ListToolbar searchValue="" onSearchChange={() => {}} filters={<div data-testid="filters">filters</div>} />);
    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("renders actions slot", () => {
    render(<ListToolbar searchValue="" onSearchChange={() => {}} actions={<button>新增</button>} />);
    expect(screen.getByText("新增")).toBeInTheDocument();
  });

  it("uses sw-toolbar and sw-search classes", () => {
    const { container } = render(<ListToolbar searchValue="" onSearchChange={() => {}} />);
    expect(container.querySelector(".sw-toolbar")).toBeTruthy();
    expect(container.querySelector(".sw-search")).toBeTruthy();
  });

  it("does not render filters wrapper when no filters", () => {
    const { container } = render(<ListToolbar searchValue="" onSearchChange={() => {}} />);
    expect(container.querySelector(".sw-toolbar__filters")).toBeNull();
  });

  it("renders filters wrapper when filters provided", () => {
    const { container } = render(<ListToolbar searchValue="" onSearchChange={() => {}} filters={<span>f</span>} />);
    expect(container.querySelector(".sw-toolbar__filters")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/ListToolbar.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ListToolbar**

```tsx
// src/shared/components/ListToolbar.tsx
import type { ReactNode } from "react";
import { Search } from "lucide-react";

interface ListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function ListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "搜索...",
  filters,
  actions,
}: ListToolbarProps) {
  return (
    <div className="sw-toolbar">
      <label className="sw-search">
        <Search size={16} />
        <input
          aria-label={searchPlaceholder}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          value={searchValue}
        />
      </label>
      {filters && <div className="sw-toolbar__filters">{filters}</div>}
      {actions}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/ListToolbar.test.tsx`
Expected: 8 tests PASS

- [ ] **Step 5: Replace call sites**

In each Area file, replace the `sw-toolbar` block with `<ListToolbar>`:

```tsx
// BEFORE (SocialWorkersArea.tsx):
<div className="sw-toolbar">
  <label className="sw-search">
    <Search size={16} />
    <input aria-label="搜索服务人员" onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索姓名或电话..." value={searchQuery} />
  </label>
  <div className="sw-toolbar__filters">
    <FilterDropdown ... />
    <FilterDropdown ... />
  </div>
</div>

// AFTER:
<ListToolbar
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  searchPlaceholder="搜索姓名或电话..."
  filters={<>
    <FilterDropdown ... />
    <FilterDropdown ... />
  </>}
/>
```

Apply to all 5 Area files. Note: SchedulesArea and RecordsArea have `sch-date-btns` inside the filters slot — those go into the `filters` prop as-is.

Remove `Search` import from Area files if it was only used by the toolbar.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/ListToolbar.tsx src/shared/__tests__/ListToolbar.test.tsx src/features/siteOperations/*.tsx
git commit -m "refactor: extract ListToolbar shared component, replace 5 toolbar layouts"
```

---

## Phase 3: Low Priority

### Task 10: useFetch

**Files:**
- Create: `src/shared/hooks/useFetch.ts`
- Test: `src/shared/__tests__/useFetch.test.ts`
- Modify: Area files with simple GET fetch patterns

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/useFetch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFetch } from "../hooks/useFetch";

const mockAuthFetch = vi.fn();
vi.mock("../../features/siteOperations/api", () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
}));

describe("useFetch", () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it("starts with loading=true when url is provided", () => {
    mockAuthFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFetch("/api/test"));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("skips fetch when url is null", () => {
    const { result } = renderHook(() => useFetch(null));
    expect(result.current.loading).toBe(false);
    expect(mockAuthFetch).not.toHaveBeenCalled();
  });

  it("sets data on success", async () => {
    mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [1, 2] }) });
    const { result } = renderHook(() => useFetch<{ items: number[] }>("/api/test"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ items: [1, 2] });
    expect(result.current.error).toBeNull();
  });

  it("sets error on HTTP error", async () => {
    mockAuthFetch.mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(() => useFetch("/api/test"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });

  it("sets error on network failure", async () => {
    mockAuthFetch.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useFetch("/api/test"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("network");
  });

  it("re-fetches when deps change", async () => {
    mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve("a") });
    const { result, rerender } = renderHook(
      ({ dep }) => useFetch<string>("/api/test", [dep]),
      { initialProps: { dep: 1 } }
    );
    await waitFor(() => expect(result.current.data).toBe("a"));
    mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve("b") });
    rerender({ dep: 2 });
    await waitFor(() => expect(result.current.data).toBe("b"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/useFetch.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement useFetch**

```ts
// src/shared/hooks/useFetch.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { authFetch } from "../../features/siteOperations/api";

export function useFetch<T>(
  url: string | null,
  deps: unknown[] = [],
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(url !== null);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);

  const doFetch = useCallback(() => {
    if (!url) { setLoading(false); return; }
    const version = ++versionRef.current;
    setLoading(true);
    setError(null);
    authFetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (version === versionRef.current) {
          setData(json as T);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (version === versionRef.current) {
          setError(err instanceof Error ? err.message : String(err));
          setData(null);
          setLoading(false);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => { doFetch(); }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/useFetch.test.ts`
Expected: 6 tests PASS

- [ ] **Step 5: Replace simple GET fetch patterns**

Replace straightforward `authFetch(url).then(r => r.json()).then(data => setX(data))` chains with `useFetch`. Only replace simple GET patterns — leave POST/PATCH/DELETE mutations alone.

Example from SmartBadgesArea:
```tsx
// BEFORE:
const [allWorkers, setAllWorkers] = useState<SocialWorker[]>([]);
useEffect(() => {
  authFetch("/api/social-workers").then(r => r.json()).then(data => setAllWorkers(data.socialWorkers ?? []));
}, []);

// AFTER:
const { data: workersData } = useFetch<{ socialWorkers: SocialWorker[] }>("/api/social-workers");
const allWorkers = workersData?.socialWorkers ?? [];
```

Apply selectively to the clearest GET patterns. Keep the replacement minimal and safe.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/hooks/useFetch.ts src/shared/__tests__/useFetch.test.ts src/features/siteOperations/*.tsx
git commit -m "refactor: extract useFetch hook, replace simple GET fetch chains"
```

---

### Task 11: useCopyToClipboard

**Files:**
- Create: `src/shared/hooks/useCopyToClipboard.ts`
- Test: `src/shared/__tests__/useCopyToClipboard.test.ts`
- Modify: `SocialWorkersArea.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/useCopyToClipboard.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.execCommand = vi.fn().mockReturnValue(true);
  });

  it("starts with copied=false", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied).toBe(false);
  });

  it("sets copied=true after copy()", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    act(() => result.current.copy("hello"));
    expect(result.current.copied).toBe(true);
  });

  it("resets copied after 1.5s", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    act(() => result.current.copy("hello"));
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.copied).toBe(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/useCopyToClipboard.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement useCopyToClipboard**

```ts
// src/shared/hooks/useCopyToClipboard.ts
import { useState, useCallback, useRef, useEffect } from "react";

export function useCopyToClipboard(): { copy: (text: string) => void; copied: boolean } {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const copy = useCallback((text: string) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      navigator.clipboard?.writeText(text);
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  }, []);

  return { copy, copied };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/useCopyToClipboard.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Replace call site in SocialWorkersArea**

```tsx
// Add import:
import { useCopyToClipboard } from "../shared/hooks/useCopyToClipboard";

// Replace the local copyText function (~lines 515-530) and copied state:
// BEFORE:
const [copied, setCopied] = useState(false);
const copyText = (text: string) => { ... };

// AFTER:
const { copy: copyText, copied } = useCopyToClipboard();
```

Delete the local `copyText` function body and `copied` state. Call sites (`copyText(...)` and `{copied ? "✓ 已复制" : "复制"}`) remain identical.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/hooks/useCopyToClipboard.ts src/shared/__tests__/useCopyToClipboard.test.ts src/features/siteOperations/SocialWorkersArea.tsx
git commit -m "refactor: extract useCopyToClipboard hook"
```

---

### Task 12: CSS Utility Classes + Move useEscClose

**Files:**
- Create: `src/shared/utilities.css`
- Move: `src/features/siteOperations/useEscClose.ts` → `src/shared/hooks/useEscClose.ts`
- Modify: All Area files (import path change for useEscClose)

- [ ] **Step 1: Create utilities.css**

```css
/* src/shared/utilities.css */
.btn--compact { height: 28px; font-size: 12px; }
.btn--xs { height: 26px; font-size: 11px; padding: 0 10px; }
.flex-end { display: flex; justify-content: flex-end; }
.flex-end-gap-8 { display: flex; gap: 8px; justify-content: flex-end; }
.flex-center-gap-8 { display: flex; align-items: center; gap: 8px; }
.mt-12 { margin-top: 12px; }
```

- [ ] **Step 2: Import utilities.css in main entry**

Add to the root CSS import chain (e.g., in `siteOperations.css` or the main App entry):
```tsx
import "../shared/utilities.css";
```

- [ ] **Step 3: Move useEscClose**

Copy `src/features/siteOperations/useEscClose.ts` to `src/shared/hooks/useEscClose.ts` with no code changes.

Delete the original file.

- [ ] **Step 4: Update all useEscClose imports**

In all 5 Area files and QualityPage, change:
```tsx
// BEFORE:
import { useEscClose } from "./useEscClose";

// AFTER:
import { useEscClose } from "../shared/hooks/useEscClose";
```

For QualityPage.tsx (different relative path):
```tsx
import { useEscClose } from "../shared/hooks/useEscClose";
```

- [ ] **Step 5: Replace select inline styles with utility classes**

Example replacements:
```tsx
// BEFORE:
style={{ height: 28, fontSize: 12 }}
// AFTER:
className="btn--compact"

// BEFORE:
style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}
// AFTER:
className="flex-end-gap-8 mt-12"
```

Apply selectively to the most common patterns. Don't force every inline style into a utility class — only replace exact matches.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/utilities.css src/shared/hooks/useEscClose.ts src/features/siteOperations/*.tsx src/quality/QualityPage.tsx
git rm src/features/siteOperations/useEscClose.ts
git commit -m "refactor: add CSS utility classes, move useEscClose to shared/hooks"
```

---

### Task 13: useRouteDetail

**Files:**
- Create: `src/shared/hooks/useRouteDetail.ts`
- Test: `src/shared/__tests__/useRouteDetail.test.ts`
- Modify: Area files with route→drawer sync patterns

- [ ] **Step 1: Write the failing test**

```tsx
// src/shared/__tests__/useRouteDetail.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useRouteDetail } from "../hooks/useRouteDetail";

const mockNavigate = vi.fn();
let mockParams: Record<string, string> = {};
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  };
});

const items = [
  { id: "w-001", name: "张三" },
  { id: "w-002", name: "李四" },
];

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("useRouteDetail", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockParams = {};
  });

  it("returns no selection when no route id", () => {
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    expect(result.current.routeId).toBeUndefined();
    expect(result.current.selectedItem).toBeUndefined();
    expect(result.current.isCreate).toBe(false);
  });

  it("selects item by route id", () => {
    mockParams = { id: "w-001" };
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    expect(result.current.routeId).toBe("w-001");
    expect(result.current.selectedItem).toEqual({ id: "w-001", name: "张三" });
  });

  it("detects create mode", () => {
    mockParams = { id: "new" };
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    expect(result.current.isCreate).toBe(true);
    expect(result.current.selectedItem).toBeUndefined();
  });

  it("close navigates to basePath", () => {
    mockParams = { id: "w-001" };
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    act(() => result.current.close());
    expect(mockNavigate).toHaveBeenCalledWith("/workers");
  });

  it("open navigates to item path", () => {
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    act(() => result.current.open("w-002"));
    expect(mockNavigate).toHaveBeenCalledWith("/workers/w-002");
  });

  it("openCreate navigates to new path", () => {
    const { result } = renderHook(() => useRouteDetail("/workers", items, (i) => i.id), { wrapper });
    act(() => result.current.openCreate());
    expect(mockNavigate).toHaveBeenCalledWith("/workers/new");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/__tests__/useRouteDetail.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement useRouteDetail**

```ts
// src/shared/hooks/useRouteDetail.ts
import { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

export function useRouteDetail<T>(
  basePath: string,
  items: T[],
  getId: (item: T) => string,
): {
  routeId: string | undefined;
  selectedItem: T | undefined;
  isCreate: boolean;
  close: () => void;
  open: (id: string) => void;
  openCreate: () => void;
} {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const selectedItem = useMemo(
    () => (routeId && routeId !== "new" ? items.find((i) => getId(i) === routeId) : undefined),
    [routeId, items, getId],
  );

  const isCreate = routeId === "new";

  const close = useCallback(() => navigate(basePath), [navigate, basePath]);
  const open = useCallback((id: string) => navigate(`${basePath}/${id}`), [navigate, basePath]);
  const openCreate = useCallback(() => navigate(`${basePath}/new`), [navigate, basePath]);

  return { routeId, selectedItem, isCreate, close, open, openCreate };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/__tests__/useRouteDetail.test.ts`
Expected: 6 tests PASS

- [ ] **Step 5: Replace route sync patterns in Area files (incremental)**

Replace the `useParams` + `useNavigate` + `useEffect` drawer sync pattern. Example:

```tsx
// BEFORE (SocialWorkersArea.tsx):
const { id: routeId } = useParams();
const navigate = useNavigate();
// ... useEffect for URL→drawer sync
const openDrawer = (worker: SocialWorker) => navigate(`/workers/${worker.id}`);
const closeDrawer = () => navigate("/workers");

// AFTER:
const { routeId, selectedItem: selectedWorker, isCreate, close: closeDrawer, open: openWorker, openCreate } = useRouteDetail("/workers", workers, w => w.id);
```

Apply to the Area files where the pattern is straightforward. Leave complex patterns with additional sync logic (e.g., drawer with sub-states) as-is.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/hooks/useRouteDetail.ts src/shared/__tests__/useRouteDetail.test.ts src/features/siteOperations/*.tsx
git commit -m "refactor: extract useRouteDetail hook, simplify route-drawer sync"
```

---

## Task 14: E2E Browser Verification

**Files:** None (read-only verification)

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: All PASS (existing + ~80 new tests)

- [ ] **Step 2: Build the project**

Run: `npx vite build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Deploy to staging**

Run: `./deploy.sh`
Expected: Deploy succeeds

- [ ] **Step 4: E2E browser verification — site operations pages**

Using the browse tool, verify each page renders correctly with no visual regressions:

1. **服务人员** (`/workers`) — list view with avatars, status badges, toolbar filters
2. **服务人员详情** (`/workers/:id`) — detail page with dp-card, inline edit
3. **设备** (`/badges`) — list view with status badges, filter dropdowns
4. **设备详情** (`/badges/:id`) — detail page with badge info
5. **长者** (`/elders`) — list view with avatars, state badges
6. **长者详情** (`/elders/:id`) — detail page with tabs, inline edit
7. **服务排期** (`/schedules`) — list view with schedule status
8. **服务排期详情** (`/schedules/:id`) — detail page with inline edit popovers
9. **服务记录** (`/records`) — list view with review status badges
10. **服务记录详情** (`/records/:id`) — detail page with tabs
11. **录音记录** (`/recordings`) — list view
12. **录音记录详情** (`/recordings/:id`) — detail page with chat transcript

For each page, check:
- Status badges display correctly (colors, text)
- Avatars show correct initials and colors
- Filter dropdowns work (selection changes list)
- Empty states show when no data matches
- Toolbar search works
- Detail pages load with breadcrumb navigation
- Back button returns to list

- [ ] **Step 5: E2E browser verification — org admin pages**

1. **站点管理** (`/admin/sites`) — list + detail
2. **用户管理** (`/admin/users`) — list + detail
3. **飞书管理** (`/admin/feishu`) — detail with site chips

- [ ] **Step 6: Mobile responsive check**

Check 375px viewport for at least 2 pages:
- Status badges wrap correctly
- Avatars maintain size
- Toolbars stack properly

- [ ] **Step 7: Final commit (if any E2E fixes needed)**

If any visual issues are found during E2E, fix them and commit:
```bash
git add -A
git commit -m "fix: E2E visual fixes after shared component extraction"
```
