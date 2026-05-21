# Copilot 智能超链接 + 操作按钮

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement.

**Goal:** CC agent 返回的消息支持可点击的应用内导航链接和确认/选择操作按钮。

**Architecture:** CC 通过 `gy://` scheme markdown 链接输出导航指令，前端 ReactMarkdown 自定义 renderer 拦截渲染；确认/选择操作通过 lak card frame 传递，前端新增 CardBubble 组件渲染按钮。

## 1. CC 输出格式约定

### 智能链接

CC 在返回的 markdown 文本中使用自定义 link 格式：

```markdown
已创建服务人员 [王丽](gy://social_workers?search=王丽)
```

- scheme `gy://` 表示应用内导航链接
- path = WorkAreaId（`home`, `social_workers`, `smart_badges`, `service_objects`, `service_schedules`, `service_records`）
- query params：`search=关键词` 用于筛选
- 普通 `http://` / `https://` 链接照常渲染为外链

### 操作按钮（Card Frame）

CC 在需要确认或选择时，通过 lak 的 card frame 返回结构化按钮：

```json
{
  "elements": [
    { "type": "markdown", "content": "确认要归档服务人员 **王丽** 吗？此操作不可撤销。" },
    { "type": "actions", "buttons": [
      { "text": "确认归档", "btn_type": "danger", "value": "confirm_archive:w1" },
      { "text": "取消", "btn_type": "default", "value": "cancel" }
    ]}
  ]
}
```

多选场景（如搜索到多个匹配结果）：

```json
{
  "elements": [
    { "type": "markdown", "content": "找到 3 个匹配的服务人员，请选择：" },
    { "type": "actions", "buttons": [
      { "text": "王丽 (翠苑站)", "btn_type": "default", "value": "select:w1" },
      { "text": "王芳 (三墩站)", "btn_type": "default", "value": "select:w2" },
      { "text": "王明 (古荡站)", "btn_type": "default", "value": "select:w3" }
    ]}
  ]
}
```

### btn_type 值

- `primary` — 蓝色，主操作
- `danger` — 红色，危险操作（删除、归档、停用）
- `default` — 灰色，次要操作或选项

## 2. 前端实现

### ChatStream 增强

当前 ChatStream 只渲染 text/stream 类型（ReactMarkdown）。增强后：

- `msgType === "text"` / `"stream"` → ReactMarkdown，自定义 `components.a` 拦截 `gy://` 链接
- `msgType === "card"` → CardBubble 组件渲染 `cardData.elements`
- `msgType === "buttons"` → 简单按钮列表（带可选 content 文本）

新增 `onNavigate` prop：
```typescript
interface ChatStreamProps {
  // ... existing props
  onNavigate?: (area: string, params: Record<string, string>) => void;
  onCardAction?: (msgId: string | number, value: string) => void;
}
```

### gy:// Link Renderer

ReactMarkdown `components.a` 自定义渲染：

```typescript
function GYLink({ href, children, onNavigate }) {
  if (!href?.startsWith("gy://")) {
    return <a href={href} target="_blank" rel="noopener">{children}</a>;
  }
  const url = new URL(href);
  const area = url.hostname || url.pathname.replace(/^\//, "");
  const params = Object.fromEntries(url.searchParams);
  return (
    <a href="#" className="gy-link" onClick={(e) => {
      e.preventDefault();
      onNavigate?.(area, params);
    }}>{children}</a>
  );
}
```

### CardBubble 组件

从 lumii-dashboard CardMessage 精简移植，支持：

- `markdown` element → 文本段落
- `divider` element → 水平分割线
- `actions` element → 按钮行
  - 按钮点击 → `onCardAction(msgId, value)` → WS `card_action` frame
  - 点击后 disabled 防重复
  - 30 秒超时恢复可点击

CSS 类使用 `cb-` 前缀（card bubble），复用 copilot panel 色系。

### 导航回调链

```
ChatStream.onNavigate(area, params)
  → CopilotPanel.onNavigate(area, params)
    → SiteOperationsShell.handleCopilotNavigate(area, params)
      → onSelectArea(area)  // 切换 tab
      → setSearchFilter(params.search)  // 设置搜索关键词
```

Shell 通过新的 `searchFilter` state 传给 Area 组件（如 SocialWorkersArea），Area 组件用它初始化搜索框。

## 3. Agent Prompt 适配

CLAUDE.md 增加输出格式指引：

```markdown
## 输出格式

### 智能链接
当提到具体的业务实体时，用 gy:// 链接包裹名称：
- 服务人员：[姓名](gy://social_workers?search=姓名)
- 设备：[工牌号](gy://smart_badges?search=工牌号)
- 服务对象：[姓名](gy://service_objects?search=姓名)
- 排期：[日期](gy://service_schedules?search=日期)
- 记录：[记录ID](gy://service_records?search=ID)

### 确认操作
危险操作（归档、删除、停用、取消排期等）必须先返回确认卡片，等待用户确认后再执行。
使用 lak card frame 格式返回按钮。

### 选择操作
当搜索结果有多个匹配时，返回选项按钮让用户选择，不要猜测。
```

## 4. 文件改动

| 文件 | 改动 |
|------|------|
| `ChatStream.tsx` | 增加 `onNavigate` / `onCardAction` prop，自定义 link renderer，card/buttons 渲染分支 |
| `CardBubble.tsx` | **新建**，从 lumii-dashboard CardMessage 精简移植 |
| `CopilotPanel.tsx` | 透传 `onNavigate` / `onCardAction` |
| `SiteOperationsShell.tsx` | `handleCopilotNavigate` 回调，`searchFilter` state 传给 Area 组件 |
| `useAgentChat.ts` | `sendCardAction` 已存在，无需改动 |
| `siteOperations.css` | `gy-link` 和 `cb-*` (CardBubble) 样式 |
| agent `CLAUDE.md` | 增加智能链接和确认按钮格式说明 |

## 5. 测试策略

- **Unit**: CardBubble 渲染 markdown/actions/divider element；按钮点击调用 onCardAction；点击后 disabled
- **Unit**: gy:// link renderer 解析 area + params；普通链接渲染为外链
- **Integration**: ChatStream 根据 msgType 分别渲染 text / card / buttons
- **E2E on staging**: 发送 `/worker-create` 完成创建 → 回复包含 gy:// 链接 → 点击跳转到服务人员 tab + 搜索
