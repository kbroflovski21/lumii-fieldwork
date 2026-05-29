# lumii-goldenyears-dashboard

## Project Overview

Golden Years (金色年华) elderly care dashboard — React + TypeScript + Vite frontend with Express + Prisma backend.

## Shared Component Library

**All new UI development MUST use the shared component library in `src/shared/`.**

Before writing any UI code, check if a shared component already exists:

| Need | Use | NOT |
|------|-----|-----|
| Status label (在职/离线/待激活) | `<StatusBadge tone="success">` | inline `<span className="sw-status-badge">` |
| Name avatar circle | `<AvatarInitial name={name} size="sm">` | local `avatarColor()` + `getInitials()` |
| Filter dropdown | `<FilterDropdown onChange options value>` | local FilterDropdown component |
| Empty/loading/error state | `<EmptyState icon={Icon} description="...">` | inline `<div className="sw-empty">` |
| Permission banner | `<OperationalBanner state resourceLabel>` | local OperationalBanner component |
| Destructive action confirm | `<ConfirmAction label="归档" onConfirm={fn}>` | manual `showConfirm` state toggle |
| Search + filter toolbar | `<ListToolbar searchValue onSearchChange filters>` | inline `<div className="sw-toolbar">` |
| Detail page wrapper | `<DetailPageShell parentLabel parentPath title>` | custom breadcrumb header |
| Inline field editing | `useInlineEdit(initialValue, onSave)` | manual `editing`/`draft`/`save` state |
| URL detail sync | `useRouteDetail(basePath, items, getId)` | manual `useParams` + `useEffect` |
| ESC key close | `useEscClose(onClose)` | manual keydown listener |
| Data fetching | `useFetch<T>(url, deps, fetchFn)` | manual `fetch().then().then()` chains |
| Clipboard copy | `useCopyToClipboard()` | manual textarea + execCommand |
| Date formatting | `formatDateWithDay()` / `formatSyncTime()` etc. | local format functions |

Full component API reference: `docs/global-ui-guidance.md` Section 13.

## Detail Page Pattern

All list-to-detail navigation uses **conditional rendering** (list OR detail, not overlay):

```tsx
{routeId ? <DetailPage /> : <ListPage />}
```

Detail pages use `DetailPageShell` + `dp-card` + `dp-fields` CSS system. See `docs/global-ui-guidance.md` Section 8.1.

## Key Paths

- Frontend source: `src/`
- Shared components: `src/shared/components/`
- Shared hooks: `src/shared/hooks/`
- Shared utils: `src/shared/utils/`
- CSS systems: `src/shared/detail-page.css`
- Server: `server/`
- Database schema: `prisma/schema.prisma`
- Tests: `src/shared/__tests__/` (107 tests, `npx vitest run src/shared/`)
- Deploy: `./deploy.sh`
- Staging: `https://stage-gy.lumii-ai.cn/`

## Development Rules

- Run `npx vitest run src/shared/` before committing changes to shared components
- Run `npx vite build` to verify no TypeScript errors before deploying
- Use existing CSS class system (`sw-*`, `dp-*`), do not create new class prefixes
- CSS variables are defined in `.site-operations-root` (see `siteOperations.css`)
- Status text mappings are centralized in `src/features/siteOperations/contracts.ts`
- Tone functions (statusTone, scheduleTone, etc.) stay in their Area files — they are domain-specific
