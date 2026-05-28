# 2026-05-25 Bug Fixes

**Date:** 2026-05-25

---

## Bug 1: Feishu user name showing as openId

- **Description:** When a Feishu user interacted with the copilot, their display name showed as the raw openId (e.g., `ou_xxxxx`) instead of their actual name.
- **Root cause:** lumii-agent-keeper (lak) did not pass `user_name` in the `scope_check` payload to the goldenyears-agent sidecar. The agent used the `actor_id` (which is the openId) as the display name fallback.
- **Fix:** Updated lak's scope_check call to include the `user_name` field from the Feishu user profile. The agent now uses `user_name` for display, falling back to `actor_id` only if `user_name` is empty.

## Bug 2: Site selection not working for multi-site operators

- **Description:** Operators assigned to multiple sites could not switch between sites. The site picker showed all sites but selecting one did not filter data correctly.
- **Root cause:** The `GET /api/admin/my-sites` endpoint used the `siteIds` array from the JWT token directly instead of querying the `siteUser` join table in the database. JWT siteIds could be stale or incomplete.
- **Fix:** Changed the my-sites API to query the `siteUser` table for the authenticated user's current site assignments, ensuring real-time accuracy regardless of JWT token age.

## Bug 3: Smart badges showing raw site IDs instead of names

- **Description:** In the smart badges list and detail views, the site column displayed raw IDs like `site-001` instead of human-readable site names like "翠苑站".
- **Root cause:** The `GET /api/smart-badges` endpoint returned badges with `siteId` but did not join/resolve the corresponding `site.name`.
- **Fix:** Added a site name lookup in the badges GET handler, resolving `siteId` to `siteName` for each badge in the response.

## Bug 4: Service schedule reassign worker dropdown showing all sites' workers

- **Description:** When reassigning a worker to a service schedule, the worker dropdown showed workers from all sites instead of only workers belonging to the schedule's site.
- **Root cause:** The worker options query did not include a `siteId` filter, fetching all social workers across the organization.
- **Fix:** Added `siteId` filter to the worker dropdown query, scoping results to the current schedule's site.

## Bug 5: Service schedule reassign worker dropdown white screen

- **Description:** Opening the reassign worker dropdown in the service schedule view caused a white screen crash.
- **Root cause:** The `workerOptions` state was defined in the wrong component (parent) and was not accessible in the child component that rendered the dropdown. This caused an undefined reference error.
- **Fix:** Moved the `workerOptions` state to the correct component where the dropdown is rendered, ensuring proper data flow.

## Bug 6: Double-click to open modal

- **Description:** List items in site operations required a double-click to open detail/edit modals, which was unintuitive.
- **Root cause:** Event handlers were bound to `onDoubleClick` instead of `onClick`.
- **Fix:** Changed all list item interactions from double-click to single-click for opening modals.

## Bug 7: AI schedule generation wrong dates

- **Description:** When using AI to generate a service schedule, saying "今天" (today) mapped to tomorrow's date, and time ranges were parsed incorrectly.
- **Root cause:** The LLM prompt did not clearly specify the current date context, and the date resolution logic had an off-by-one error. Time range parsing used ambiguous formats.
- **Fix:** Injected the exact current date into the LLM system prompt. Fixed date resolution to correctly map "今天" to the actual current date. Improved time range parsing with explicit 24-hour format handling.

## Bug 8: SOP generation "AI服务未配置"

- **Description:** Attempting to generate SOPs via the AI endpoint returned an error message "AI服务未配置" (AI service not configured).
- **Root cause:** The `LLM_API_KEY` environment variable was not set in the deployment environment. The AI route checked for this variable and returned the error when it was missing.
- **Fix:** Added `LLM_API_KEY` to the `.env` configuration on the staging server with the correct DashScope API key.

## Bug 9: Badge simulator WebSocket connection failed

- **Description:** The hardware badge simulator in the careworker page could not establish a WebSocket connection to the processor service.
- **Root cause:** The `PROCESSOR_URL` environment variable was missing the `/processor` path prefix. The simulator constructed the WebSocket URL as `ws://host:port/ws/badge` instead of `ws://host:port/processor/ws/badge`, which did not match the Caddy reverse proxy route.
- **Fix:** Updated the `PROCESSOR_URL` configuration to include the `/processor` prefix, or used the fallback `window.location.origin + "/processor"` which correctly routes through Caddy.

## Bug 10: Dashboard crash on WebSocket error

- **Description:** The dashboard server crashed when a WebSocket connection encountered a network error (e.g., client disconnect, timeout).
- **Root cause:** The WebSocket server did not have a `ws.on("error")` handler. Unhandled WebSocket errors propagated as uncaught exceptions, crashing the Node.js process.
- **Fix:** Added `ws.on("error", ...)` handler to gracefully log and close errored connections without crashing the server.

## Bug 11: Pool.ts ws error handler crash (WS_ERR_EXPECTED_MASK)

- **Description:** The WebSocket connection pool crashed with `WS_ERR_EXPECTED_MASK` errors when receiving malformed frames from clients.
- **Root cause:** The `ws` library throws `WS_ERR_EXPECTED_MASK` when it receives an unmasked frame from a client (RFC 6455 requires client-to-server frames to be masked). The pool had no error handler to catch this.
- **Fix:** Added error handling in `pool.ts` to catch `WS_ERR_EXPECTED_MASK` and similar protocol errors, closing the offending connection gracefully instead of crashing.

## Bug 12: Login doesn't clear site selection cache

- **Description:** After logging out and logging in as a different user, the site picker retained the previous user's site selection, potentially showing data from a site the new user doesn't have access to.
- **Root cause:** The `gy_current_site` localStorage key was not cleared during logout/login flow.
- **Fix:** Added `localStorage.removeItem("gy_current_site")` to the login handler, ensuring each login session starts with a fresh site selection.

## Bug 13: Service plan cross-tab refresh not working (ViewModal)

- **Description:** After editing a service plan in one browser tab, switching to another tab did not reflect the changes in the schedule view.
- **Root cause:** The `ViewModal` component called `onMutate` after a successful update, but `onMutate` was `undefined` in that context. The correct callback was `onUpdated`, which triggers a data refresh.
- **Fix:** Changed `ViewModal` to call `onUpdated` instead of `onMutate`, correctly triggering the data refresh across tabs.

## Bug 14: Projected schedule status showing "待执行" instead of "待分配"

- **Description:** Projected (future, dynamically computed) schedule occurrences displayed status "待执行" (pending execution) even when no worker was assigned. They should show "待分配" (pending assignment).
- **Root cause:** The `computeProjectedOccurrences` function hardcoded status as `"scheduled"` for all projected occurrences, regardless of whether a worker was assigned.
- **Fix:** Changed the status logic to check `plan.primarySocialWorkerId`: if a worker is assigned, status is `"scheduled"`; otherwise, status is `"unassigned"`.

## Bug 15: Browser confirm() for delete/cancel actions

- **Description:** Delete and cancel actions used the native browser `confirm()` dialog, which looks unprofessional and cannot be styled.
- **Root cause:** Legacy implementation used `window.confirm()` for destructive action confirmation.
- **Fix:** Replaced all `window.confirm()` calls with inline popover confirmation components that match the application's design system.

## Bug 16: Confirm popover clipped by modal overflow

- **Description:** The inline confirmation popover was clipped when rendered inside a modal, because the modal had `overflow: hidden` or `overflow: auto`.
- **Root cause:** The popover was positioned upward/centered, which extended beyond the modal's visible area and was clipped by the overflow property.
- **Fix:** Changed popover positioning from upward/centered to downward/left-aligned, keeping it within the modal's visible bounds.

## Bug 17: serviceFrequency field removed

- **Description:** The `serviceFrequency` field on service plans was unused but still present in the data model and UI forms, causing confusion.
- **Root cause:** The field was a remnant from an earlier design before the cadence rule system was implemented.
- **Fix:** Removed `serviceFrequency` from the schema, API responses, and frontend forms.

## Bug 18: Service plan worker changes not syncing to schedules

- **Description:** When updating the primary worker on a service plan, existing future schedules retained the old worker assignment.
- **Root cause:** The `PATCH /api/service-plans/:id` endpoint updated the plan's `primarySocialWorkerId` but did not propagate the change to future `ServiceSchedule` records.
- **Fix:** Added worker propagation logic in the PATCH handler: when `primarySocialWorkerId` changes, all future schedules (where `serviceDate >= today` and status is not completed/cancelled/suspended) are updated with the new worker assignment and appropriate status.

## Bug 19: AI schedule past dates (UTC vs CST timezone mismatch)

- **Description:** AI-generated schedules included dates in the past because the LLM received the server's UTC time (e.g., 02:11 UTC) while users operate in CST (10:11 CST). The LLM interpreted "today" relative to the wrong timezone.
- **Root cause:** The system prompt injected `new Date().toISOString()` (UTC) without converting to the user's local timezone (Asia/Shanghai, UTC+8).
- **Fix:** Updated the LLM prompt to include the current time in CST, so date/time resolution is correct for Chinese users.

## Bug 20: Schedule list not sorting by time within same date

- **Description:** Schedules on the same date were displayed in random order instead of sorted by start time.
- **Root cause:** The schedule query ordered by `serviceDate` only, without a secondary sort on `startTime`.
- **Fix:** Added `startTime` as a secondary sort key in the schedule list query.

## Bug 21: SchedulesArea white screen (missing ChevronDown import)

- **Description:** The schedules area component caused a white screen crash.
- **Root cause:** The `ChevronDown` icon was used in JSX but not imported from the icon library.
- **Fix:** Added the missing `ChevronDown` import statement.

## Bug 22: Map showing Shanghai instead of Hangzhou

- **Description:** The service object map view showed Shanghai as the default location instead of Hangzhou, even for Hangzhou-based elders.
- **Root cause:** The `mapDisplayPoint` field on `ServiceObject` was hardcoded with Shanghai coordinates. The static coordinate approach was fragile.
- **Fix:** Removed `mapDisplayPoint` from `ServiceObject` and switched to address-based geocoding for map centering.

## Bug 23: Status dropdown clipped by parent container

- **Description:** The status filter dropdown was clipped by its parent container's `overflow` property, making options invisible.
- **Root cause:** The dropdown was positioned with `position: absolute` inside a container with `overflow: hidden` or `overflow: auto`.
- **Fix:** Changed the dropdown to `position: fixed` using `getBoundingClientRect()` to calculate screen-relative coordinates.

## Bug 24: Status dropdown missing chevron arrow

- **Description:** The status filter dropdown button had no visual indicator (chevron) to signal it was a dropdown.
- **Root cause:** No arrow/chevron was included in the dropdown trigger button markup.
- **Fix:** Added an SVG chevron as a CSS `background-image` on the dropdown trigger.

## Bug 25: RecordsArea JSX syntax errors

- **Description:** The service records area had JSX compilation errors causing build failures.
- **Root cause:** Extra closing braces (`}`) in the JSX template, likely from a merge or manual edit.
- **Fix:** Removed the extra closing braces to fix the JSX syntax.

## Bug 26: Service record — new "基本信息" tab, GPS tab removed

- **Description:** The service record detail modal lacked a clear information hierarchy. GPS data was in a separate tab that added complexity without clear value.
- **Root cause:** Original design used multiple tabs including a GPS-specific tab, which fragmented the basic information view.
- **Fix:** Added a "基本信息" (basic info) tab consolidating key fields (worker, elder, address, date, time), and removed the standalone GPS tab.

## Bug 27: Service record — elder confirmation flow

- **Description:** Service records needed a way to confirm or assign the elder (service object) associated with a record, including both `elderName` and `serviceObjectId`.
- **Root cause:** The original record edit only supported worker reassignment; elder/service-object assignment was missing.
- **Fix:** Added elder confirmation fields (`elderName`, `serviceObjectId`) to the `PATCH /api/service-records/:id` endpoint. When `serviceObjectId` is set, the server auto-resolves `serviceAddress` from the service object's address.

## Bug 28: Service record — floating picker for worker/elder

- **Description:** Worker and elder selection was rendered inline in the record detail, taking up too much vertical space and disrupting layout.
- **Root cause:** Selection dropdowns were rendered as inline elements within the form layout.
- **Fix:** Changed worker and elder selection to floating picker components (positioned overlay) that appear on interaction without pushing other content.

## Bug 29: Service record — reuse CreateModal for new elder creation

- **Description:** When a service record referenced an unknown elder, operators had to navigate away to create the elder first, then come back to link it.
- **Root cause:** No in-context elder creation flow existed within the service record edit view.
- **Fix:** Reused the existing `CreateModal` component for service objects, allowing operators to create a new elder directly from the service record edit flow and automatically link the new elder to the record.

---

# 2026-05-26 ~ 2026-05-28 Bug Fixes

**Date range:** 2026-05-26 to 2026-05-28

---

## Bug 30: AI schedule not generating (staging .env overwritten)

- **Description:** AI schedule generation returned 401 errors on staging. The frontend silently returned on error, making the failure invisible to the user.
- **Root cause:** A manual rsync deployment overwrote the staging `.env` file, removing `JWT_SECRET` and `LLM_API_KEY`. The server returned 401 (no valid JWT), and the frontend `catch` block silently returned without showing an error.
- **Fix:** Restored the staging `.env` with the correct `JWT_SECRET` and `LLM_API_KEY`. Created `deploy.sh` script that excludes `.env` files from rsync to prevent future overwrites.

## Bug 31: Service content column overlapping when 5+ projects

- **Description:** When a service record had 5 or more service projects, the tags overflowed the column and overlapped adjacent columns in the record list.
- **Root cause:** The service project tags were rendered without any limit, causing layout overflow when too many tags were present.
- **Fix:** Limited the display to a maximum of 2 tags with a "+N" badge for overflow. The full list of projects is shown in a hover tooltip.

## Bug 32: Service record date filter buttons not working

- **Description:** The date filter buttons (today, this week, this month) in the service records list did not filter the records.
- **Root cause:** The `dateFilter` state variable existed in the component, but the actual filter logic that checks records against the selected date range was never implemented.
- **Fix:** Added filter logic that uses the `dateFilter` state to filter records by their `serviceDate` before rendering the list.

## Bug 33: Record list sorting wrong within same date

- **Description:** Service records on the same date appeared in random/insertion order instead of being sorted by time.
- **Root cause:** The Prisma query only ordered by `serviceDate` descending, with no secondary sort key.
- **Fix:** Added `startTime` descending as a secondary sort key in the service records list query.

## Bug 34: Elder warning icon based on assignmentConfidence instead of serviceObjectId

- **Description:** The warning icon on service records (indicating an elder needs confirmation) was based on `assignmentConfidence` value, which was unreliable.
- **Root cause:** The original logic used `assignmentConfidence < threshold` to show the warning, but confidence values were inconsistent and didn't reflect whether an elder was actually linked.
- **Fix:** Changed the warning logic to check whether `serviceObjectId` is null. A null `serviceObjectId` means no elder has been confirmed, which is the actual condition that needs attention.

## Bug 35: Service record time showing UTC instead of CST

- **Description:** Service record `sr-c99f64c4` showed start time as 02:11 instead of the correct 10:11 CST.
- **Root cause:** The record's `startTime` was stored as UTC (02:11) instead of CST (10:11, UTC+8). The badge captured the time in UTC and it was persisted without timezone conversion.
- **Fix:** Manually corrected the affected record's time in the database. (Systemic fix for new records handled by the processor's timezone-aware time capture.)

## Bug 36: Worker picker was inline expanding row height

- **Description:** Opening the worker assignment picker in the record detail expanded the row height, pushing other content down and disrupting the layout.
- **Root cause:** The worker picker dropdown was rendered inline within the table row, causing the row to grow to accommodate the dropdown content.
- **Fix:** Changed the worker picker to a floating popover using `position: absolute`, so it overlays content instead of expanding the row.

## Bug 37: Create elder modal was custom implementation

- **Description:** The "create new elder" modal in the service record flow was a separate custom implementation, duplicating logic from the existing `ServiceObjectsArea.CreateModal`.
- **Root cause:** The elder creation flow was added independently without reusing the existing component.
- **Fix:** Replaced the custom implementation with the existing `ServiceObjectsArea.CreateModal` component for consistency and reduced code duplication.

## Bug 38: Worker picker had "未分配" option

- **Description:** The worker assignment picker included an "未分配" (unassigned) option, which was confusing — clicking it would clear the worker assignment.
- **Root cause:** The picker was designed with an explicit "unassign" option.
- **Fix:** Removed the "未分配" option per user request. Worker unassignment is handled through other UI flows.

## Bug 39: Address column truncating too early

- **Description:** The service address column in the record list truncated text too aggressively, hiding useful address information.
- **Root cause:** A hardcoded `max-width: 140px` was set on the address column, which was too narrow for typical Chinese addresses.
- **Fix:** Removed the hardcoded `max-width` and let the CSS grid column definition control the width, giving the address column more space.

## Bug 40: Status dropdown chevron arrow missing

- **Description:** The status filter dropdown in the service worker section had no visual indicator that it was a clickable dropdown.
- **Root cause:** The `<select>` element's default browser chevron was hidden by custom styling, and no replacement was provided.
- **Fix:** Added an SVG chevron as a CSS `background-image` on the `.sw-filter select` element.

## Bug 41: Status dropdown clipped by container

- **Description:** The status filter dropdown options were clipped by the parent container's overflow, making some options invisible.
- **Root cause:** The dropdown was positioned with `position: absolute` inside a container with `overflow: hidden`.
- **Fix:** Changed to `position: fixed` positioning using `getBoundingClientRect()` to calculate screen-relative coordinates, ensuring the dropdown renders above all other content.

## Bug 42: Date filter buttons showing in calendar view

- **Description:** Date filter buttons (today, this week, this month) appeared in the calendar view, where they were meaningless — the calendar always shows the full month.
- **Root cause:** The date filter controls were rendered regardless of which view (list/map/calendar) was active.
- **Fix:** Added a `view !== "calendar"` guard so date filter buttons only appear in list and map views. Calendar view bypasses all date filters.

## Bug 43: Schedule list date filter visibility toggling

- **Description:** The date filter in the schedule list was shown in calendar view, then hidden, then added back, then removed again across several iterations.
- **Root cause:** Inconsistent requirements about when date filters should be visible across different schedule view modes.
- **Fix:** Final decision: date filter is hidden in calendar view (calendar shows the full month), shown in list and map views.

## Bug 44: Deploy script created to prevent .env overwrite incident

- **Description:** Manual rsync deployments could accidentally overwrite the staging `.env` file, causing service outages (see Bug 30).
- **Root cause:** No standardized deploy process existed; developers ran ad-hoc rsync commands that could include `.env` files.
- **Fix:** Created `deploy.sh` in the project root that handles the full deploy pipeline (build, rsync with `.env` exclusion, Prisma push, restart, health check). Documented in `docs/deploy-guide.md`.

---

# 2026-05-28 Bug Fixes

**Date:** 2026-05-28

---

## Bug 45: Org admin content area — CSS variables missing after routing refactor

- **Description:** After the frontend routing refactor, the org admin (QualityPage) content area lost all background colors, border colors, and styling — everything appeared transparent with oversized margins.
- **Root cause:** The QualityPage root element was changed from `className="quality-page"` to `className="quality-content"`. All child components reference CSS custom properties (`--quality-surface`, `--quality-line`, `--quality-text`, etc.) that are defined on the `.quality-page` selector. Without that class in the DOM, the variables resolved to `undefined` → transparent. Additionally, nested `.quality-content` divs caused double padding (`28px 32px` × 2).
- **Fix:** Restored `className="quality-page"` on the root element with inline style `display:flex; flex-direction:column; flex:1; height:auto; overflow:hidden` to override the grid layout (no longer needed since QualityLayout handles the outer grid). Removed the nested `.quality-content` wrapper.

## Bug 46: Profile menu cannot be dismissed — page becomes unclickable

- **Description:** After opening the profile menu in the sidebar, clicking elsewhere on the page did not close the menu; instead the page became unresponsive to clicks.
- **Root cause:** The old implementation wrapped the profile card in a `<div onClick>` that toggled the menu. When the backdrop's `onClick` fired to close the menu, the event bubbled up to the wrapping div and immediately re-opened it (click-through race condition).
- **Fix:** Refactored `ProfileMenu` to render the entire profile card (avatar + name + role) as a single `<button>` element. The menu dismissal uses a `createPortal`-based full-screen backdrop with `background: rgba(0,0,0,0.01)` for reliable click capture. No wrapping `<div onClick>` exists anymore.

## Bug 47: Profile card not spanning full sidebar width

- **Description:** The profile card at the bottom of the sidebar was centered (small circle avatar only) instead of spanning the full sidebar width like the navigation items above it. Hover effect also did not cover the full width.
- **Root cause:** `.so-shell__profile` had `justify-content: center` and `padding: 12px 0`. The collapsed-mode avatar was rendered as a `<button className="so-shell__avatar">` (circular element) rather than a full-width button. The footer had `align-items: center`.
- **Fix:** Unified both expanded and collapsed modes to use the same `<button className="site-operations-sidebar__profile-card">` wrapping. In collapsed mode, only the avatar child renders (no text). Profile card CSS now matches nav item styling: `padding: 10px 12px; gap: 10px; border-radius: 8px; width: 100%` with `background: #F1F5F9` on hover. Removed centering from footer and profile wrapper.

## Bug 48: Org admin content padding larger than site operations

- **Description:** The org admin page content area had visibly larger margins/padding than the site operations page, making them look inconsistent.
- **Root cause:** `.quality-content` CSS used `padding: 28px 32px` while site operations area components use `padding: 24px` (via `.sw-page__inner`). The SOP page (SupervisorContent) also used `padding: 28px 32px 0` for header and `margin: 16px 32px 28px` for body.
- **Fix:** Changed `.quality-content` padding to `24px`. Changed `.sv-page-header` padding to `24px 24px 0` and `.sv-content-body` margin to `16px 24px 24px`.

## Bug 49: Org admin modals do not update URL with object ID

- **Description:** Clicking a list item in the org admin pages (站点管理, 用户管理) opened a detail modal but the URL stayed at `/admin/sites` or `/admin/users` without appending the object ID. This meant modals were not deep-linkable and browser back/forward did not work.
- **Root cause:** The admin views (SitesView, UsersView) used local React state (`useState`) for modal open/close instead of URL-based navigation. The router config used a wildcard `admin/*` route with no child `:id` routes.
- **Fix:** Added explicit child routes with `:id` params in `router.tsx` (`/admin/sites/:id`, `/admin/sites/new`, `/admin/users/:id`, `/admin/users/new`). Refactored SitesView and UsersView to use `useParams()` + `useNavigate()` for modal open/close, mirroring the site operations pattern. Modal open calls `navigate('/admin/users/${id}')`, close calls `navigate('/admin/users')`.

## Bug 50: Org admin search query param not triggering filter

- **Description:** Navigating directly to `/admin/users?search=站点运营员` did not pre-fill the search box or filter the list. The search functionality was purely local state-driven.
- **Root cause:** SitesView and UsersView initialized search from an `initialSearch` prop (passed from parent component state) rather than reading the URL `?search=` query parameter. The URL search param was only used for copilot navigation, not for the views themselves.
- **Fix:** Replaced local `useState` search with `useSearchParams()` from react-router-dom. Search reads from `searchParams.get("search")` and writes back via `setSearchParams()` with `{ replace: true }`. This enables URL-based search filtering consistent with the site operations pattern.

---

# 2026-05-28 Modal-to-Detail-Page Refactor Bug Fixes

---

## Bug 51: Modal content unstyled in full-page layout

- **Description:** After converting modals to full-page detail views, the content still used modal CSS classes (`so-modal__summary`, `so-modal__tabs`, `so-modal__content`, `so-modal__footer`) which had modal-specific styling (gradient backgrounds, rounded corners, fixed positioning).
- **Root cause:** Initial refactor only replaced the outer wrapper with `DetailPageShell` but kept all inner CSS classes unchanged.
- **Fix:** Introduced new `dp-card`, `dp-tabs`, `dp-section`, `dp-fields`, `dp-field` CSS classes in `detail-page.css`. Each detail page rewritten to use card-based layout with consistent sections, field grids, and inline edit patterns.

## Bug 52: Mobile responsive layout broken on detail pages

- **Description:** Detail pages were unreadable on mobile — content pushed off-screen, fields not wrapping.
- **Root cause:** `.site-operations-main--layout` had `grid-column: 2` but mobile breakpoint changed grid to `1fr`, causing content to be placed in non-existent column 2.
- **Fix:** Added `grid-column: 1` to `.site-operations-main--layout` in mobile breakpoint. Added responsive rules for `dp-fields` (single column), header wrapping, and reduced padding.

## Bug 53: Breadcrumb back navigation not working for create/activate pages

- **Description:** Clicking breadcrumb back arrow on "新增服务人员" and "激活工牌" pages had no effect — URL changed but page stayed.
- **Root cause:** Create/activate were triggered via `setDrawer()` local state, not URL navigation. `DetailPageShell` called `navigate("/workers")` but `routeId` was already undefined, so the useEffect didn't fire.
- **Fix:** Changed create to use `navigate("/workers/new")` and activate to use `navigate("/badges/activate")`. Added `routeId === "new"` / `routeId === "activate"` handling in URL→drawer sync useEffect.

## Bug 54: `replace_all` broke useEffect URL→state sync

- **Description:** After fixing bug 53, clicking "新增人员" and "激活工牌" buttons had no effect — URL changed but page showed list.
- **Root cause:** `replace_all` for `setDrawer({ kind: "create" })` → `navigate("/workers/new")` also replaced the occurrence inside `useEffect`, creating an infinite navigation loop.
- **Fix:** Restored `setDrawer()` calls inside useEffect (URL→state direction), kept `navigate()` only in button click handlers (state→URL direction).

## Bug 55: `/elders/new` route not matching — static `path: "new"` steals from `:id`

- **Description:** Clicking "新增长者" button navigated to `/elders/new` but the create page didn't render.
- **Root cause:** Router had both `{ path: "new", element: null }` and `{ path: ":id", element: null }`. React Router v6 prioritizes static `"new"` over dynamic `:id`, so `useParams()` returned `{}` instead of `{id: "new"}`.
- **Fix:** Removed `path: "new"` static route, letting `:id` catch "new" as a param value.

## Bug 56: Cross-navigation between service records and recordings detail stuck

- **Description:** When viewing a service record detail, clicking "录音记录" sidebar item did nothing. Same in reverse.
- **Root cause:** Navigating changed `viewMode` but didn't reset the other mode's state (`drawer` for records, `selectedRecording` for recordings). The conditional rendering prioritized the stale detail state.
- **Fix:** Each viewMode sync effect now clears the other mode's state — records mode clears `selectedRecording`, recordings mode clears `drawer`.

## Bug 57: Org admin detail page layout inconsistent with site operations

- **Description:** Admin detail pages (site, user) had larger margins than site operations detail pages.
- **Root cause:** Admin detail pages were rendered inside `quality-content` wrapper (padding: 24px→16px) plus `detail-page__body` padding, creating double padding. Site operations rendered directly without the outer wrapper.
- **Fix:** QualityPage bypasses `quality-content` when `showingDetail` is true. FeishuView always renders outside `quality-content` with its own padding management.

## Bug 58: FeishuView ESC key not closing detail page

- **Description:** Pressing ESC on the feishu edit detail page did not return to the list.
- **Root cause:** Initial `useEscClose` callback had `if (editUser)` guard with `[editUser]` dependency. When `editUser` was null, callback was a no-op. The callback reference changed when `editUser` changed, but the ESC handler sometimes missed the update.
- **Fix:** Simplified to `useCallback(() => setEditUser(null), [])` — stable reference, always works. Setting null to null is harmless.

## Bug 59: Recordings list API returning 419KB response (performance)

- **Description:** "录音记录" page took 1-3 seconds to load, showing "加载中..." for several seconds.
- **Root cause:** `GET /api/recordings` returned all fields including `sopResults` (348KB), `transcriptSegments` (191KB), `transcriptText` (24KB) per record. 22 records = 419KB response.
- **Fix:** Added Prisma `select` to list API excluding heavy text/JSON fields. Detail page fetches full data from `/recordings/:id`. Response: 419KB → 15KB, latency: 0.6-3.2s → 0.27-0.44s.

## Bug 60: Missing database indexes across all tables

- **Description:** Query performance could degrade as data grows — no indexes existed on foreign key columns or common filter fields.
- **Root cause:** Initial Prisma schema only had primary keys and a few unique constraints. No composite indexes for list queries (site+date), no FK indexes for join lookups.
- **Fix:** Added 18 indexes covering all high-frequency query patterns: site-scoped list queries, FK lookups, date-sorted pagination. Migration file: `20260528160000_add_database_indexes`.
