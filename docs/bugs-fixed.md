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
