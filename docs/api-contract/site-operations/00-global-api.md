# Site Operations Global API Contract

状态：后端交接契约
日期：2026-05-14
范围：`/site-operations` 跨 tab API 规则

## 1. Scope

- Surface: `/site-operations`
- Consumer role: site operator
- Purpose: define shared API conventions used by all site operations tabs.
- Product workflow and UI acceptance live in [`../../superpowers/specs/site-operations/README.md`](../../superpowers/specs/site-operations/README.md).
- Visual shell and responsive behavior live in [`../../global-ui-guidance.md`](../../global-ui-guidance.md).

## 2. Common Types

```ts
type SiteOperationsPermissionState = "full" | "read_only" | "restricted";

type ApiErrorCode =
  | "validation_error"
  | "permission_denied"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "internal_error";

type ApiError = {
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
};

type MutationResult<T> = {
  ok: boolean;
  data?: T;
  error?: ApiError;
};

type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

type ListResponse<T> = {
  items: T[];
  pageInfo: PageInfo;
  permissionState: SiteOperationsPermissionState;
};

type TimeWindow = {
  start: string;
  end: string;
  label?: string;
};

type MapDisplayPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};
```

## 3. Permission States

Every non-home work area accepts an operational permission state:

- `full`: read and write actions enabled.
- `read_only`: read actions visible; mutations require `full` permission.
- `restricted`: sensitive data protected, especially service record audio and record mutation actions.

UI behavior:

- Mutations are hidden or disabled with a reason unless permission is `full`.
- Sensitive fields may be omitted or replaced by unavailable state when permission is `restricted`.
- The API must not leak raw audio URLs, transcript content, or internal review notes through list endpoints.

## 4. Endpoint Conventions

- List endpoints use `GET`.
- Create endpoints use `POST`.
- Partial updates use `PATCH`.
- Relationship replacement uses `PUT`.
- Archive or domain actions use `POST /:id/archive` or a named action endpoint.

Query conventions:

```ts
type ListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  status?: string;
};
```

Dates and timestamps:

- Dates use `YYYY-MM-DD`.
- Times use `HH:mm`.
- Timestamps use ISO 8601 with timezone.

ID conventions:

- Backend ids are stable opaque strings.
- Human-facing device code remains `SmartBadge.deviceCode`, for example `FW-021`.
- Cross-tab links use backend ids, not display labels.

## 5. Runtime Data Rule

Design specs own product behavior and work-area requirements. API responses mirror those objects, fields, states, and flows so production frontend code can use backend responses as its data source.

Example API responses may exist in tests and docs for contract verification. Production runtime data comes from the API boundary.

## 6. Fixture Requirements

Contract examples and staging API responses must include:

- Service personnel and smart badges as separate models.
- An activated badge and an available badge.
- Service object, service plan, plan exception, and service schedule examples.
- One-time service schedule examples.
- Service records with GPS evidence, raw audio route, transcript, family contact, inferred or confirmed service personnel, badge, review status, and export history.
- Service object profiles with family subscription state and insight summary.

Fixture data must match the tab-specific API files and must not use mock-only fields in production contracts.

## 7. WebSocket 端点

### 7.1 /api/ws/chat (前端用户连接)

认证: JWT token (query param `token` 或 cookie `session`)
Session key 格式: `web:{agentId}:{userId}:{sessionId}`

init 帧:
```json
{
  "type": "init",
  "connected": true,
  "messages": [...],
  "wip": false,
  "in_flight": [],
  "capabilities": []
}
```

### 7.2 /api/ws/agent (lak 连接)

认证: ws_token (register 帧中的 `metadata.token`)
协议: Bridge protocol (register, reply, preview_start, reply_stream, update_message, stream_end, card, buttons)
