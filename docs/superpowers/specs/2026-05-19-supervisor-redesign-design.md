# 规范管理页面 UI 重设计 — 设计规格

状态：设计定稿
日期：2026-05-19
基线：`docs/supervisor-page-spec.md` (v2)

## 1. 设计动机

当前规范管理页面将 SOP、服务中实时督导要求、服务后报告要求三个文档平铺展示。但三者的受众和性质完全不同：

- **SOP**：给人看的规范文本。会被引用到员工学习资料中。维护者是业务专家，操作是粘贴/编辑。
- **服务中实时督导要求 + 服务后报告要求**：给机器看的 prompt。驱动 ASR+LLM+TTS 架构的 AI 督导系统。维护者是技术/AI 专家，操作是生成、调试、审核。

将这三个文档平级摆放会让非技术人员困惑，也不符合各自的工作流。

## 2. 核心方案：双层视图

同一个目录树，两个视图层，通过内容区顶部的切换按钮切换。

### 2.1 规范文档层（默认）

- 选中任何规范目录后，展示该目录的 SOP 文档
- 纯文本阅读/编辑界面，面向业务专家和普通员工
- 保留版本历史功能（version pills，可点击切换阅读不同版本）
- 操作：复制、导出、编辑

### 2.2 AI 督导配置层（切换进入）

- 通过内容区顶部的明显切换按钮进入（按钮尺寸大、选中态醒目）
- 顶部 banner 说明这是 AI 督导系统的配置区域
- 并列展示两张卡片：「服务中实时督导要求」和「服务后报告要求」
- prompt 内容用等宽字体展示
- 每张卡片带版本历史功能（version pills）
- 操作：编辑、重新生成（需确认流程）
- 底部可展开 SOP 参考面板，方便调 prompt 时参考原文

### 2.3 层切换按钮

- 位置：内容区顶部（breadcrumb 同行右侧），不在 top bar / header 中
- 样式：pill toggle，背景色 #e8eaef，选中态带圆点指示器 + 边框 + 阴影
- 规范文档选中态：白底蓝边框蓝圆点
- AI 督导配置选中态：紫色渐变背景，白色圆点，发光阴影
- 字号 14px，font-weight 700，确保不被忽略

## 3. UI 细节约束

1. **Top bar 保持原样** — 不添加任何新按钮，保留现有统一样式
2. **正文区域纯文字** — 不引入 callout、卡片等额外 UI 结构，纯 markdown 渲染
3. **目录不用 emoji** — 使用纯文字或最小化图标（如状态圆点），不使用 emoji
4. **保留版本历史** — SOP 和两个 prompt 文档都保留 version pills，可切换阅读不同版本

## 4. 重新生成确认流程

当用户点击「重新生成」时：

```
点击「重新生成」
  → 调用 AI 生成新版本
  → 展示生成结果预览（标记为"待确认"）
  → 用户对比当前版本和新生成版本
  → 「采用此版本」→ 保存为新版本，版本号 +1
  → 「放弃」→ 丢弃生成结果，保持原版本不变
```

生成过程中显示 loading 状态。生成完成后，新旧版本应能方便对比。

## 5. 目录结构

保持现有的两级目录：

```
通用规范
  ├── 国家长期护理保险服务规范    [完整/部分/待建]
  └── 居家养老服务通用要求
服务项目规范
  ├── 清洁照护 - 口腔清洁
  ├── 基础健康观察 - 生命体征测量
  └── ...
```

状态标记（完整/部分/待建）表示该规范下三个文档的完成度：
- 完整：SOP + 督导要求 + 报告要求都已填写
- 部分：SOP 已填写，但督导要求或报告要求缺失
- 待建：SOP 尚未填写

## 6. 数据模型

沿用现有 `StdFolder` / `StdDoc` 结构，无变更：

```typescript
interface StdDoc {
  status: "complete" | "incomplete" | "empty";
  content: string;
  source: "manual" | "ai_generated";
  version: number;
  history: Array<{ version: number; date: string; summary: string }>;
}

interface StdFolder {
  id: string;
  type: "general" | "service";
  name: string;
  sop: StdDoc | null;
  supervision: StdDoc | null;
  report: StdDoc | null;
}

type DocType = "sop" | "supervision" | "report";
```

新增：生成预览的临时状态

```typescript
interface GeneratePreview {
  docType: "supervision" | "report";
  folderId: string;
  content: string;           // AI 生成的新内容
  basedOnSopVersion: number; // 基于哪个版本的 SOP 生成
  status: "generating" | "preview" | "accepted" | "discarded";
}
```

## 7. API 契约

### 7.1 现有接口（保持不变）

```
POST /api/supervisor-chat
Input: { message: string, folders: StdFolder[], chatHistory: ChatMessage[] }
Output: { reply: string, actions: Action[] }
Actions: create_folder | update_doc | delete_folder
```

### 7.2 新增接口

#### 生成督导/报告要求

```
POST /api/standards/:folderId/generate
Content-Type: application/json

Request:
{
  "docType": "supervision" | "report",
  "sopContent": string,        // 当前 SOP 内容
  "sopVersion": number,        // 当前 SOP 版本号
  "currentContent"?: string    // 当前已有的 prompt 内容（用于参考优化）
}

Response:
{
  "content": string,           // AI 生成的新内容
  "basedOnSopVersion": number,
  "summary": string            // 变更摘要（用于版本历史记录）
}
```

#### 确认采用生成结果

```
POST /api/standards/:folderId/confirm-generate
Content-Type: application/json

Request:
{
  "docType": "supervision" | "report",
  "content": string,           // 确认采用的内容
  "summary": string            // 版本变更摘要
}

Response:
{
  "version": number,           // 新版本号
  "updatedAt": string          // ISO 时间戳
}
```

#### 获取规范列表

```
GET /api/standards

Response:
{
  "folders": StdFolder[]
}
```

#### 获取单个规范详情

```
GET /api/standards/:folderId

Response:
{
  "folder": StdFolder
}
```

#### 更新文档内容（手动编辑）

```
PUT /api/standards/:folderId/docs/:docType
Content-Type: application/json

Request:
{
  "content": string,
  "summary": string            // 版本变更摘要
}

Response:
{
  "version": number,
  "updatedAt": string
}
```

#### 获取版本历史详情

```
GET /api/standards/:folderId/docs/:docType/versions/:version

Response:
{
  "content": string,
  "version": number,
  "date": string,
  "summary": string,
  "source": "manual" | "ai_generated"
}
```

## 8. 页面状态

```typescript
interface SupervisorState {
  // 目录
  folders: StdFolder[];
  selectedFolderId: string | null;

  // 视图层
  activeLayer: "sop" | "ai";

  // 文档查看
  viewingDocType: DocType;
  viewingVersion: number | null;  // null = 当前版本

  // 编辑
  editingDocType: DocType | null;
  editContent: string;

  // AI 生成预览
  generatePreview: GeneratePreview | null;
}
```

## 9. 前端文件变更范围

| 文件 | 变更 |
|------|------|
| `src/supervisor/SupervisorPage.tsx` | 重构：拆分为双层视图，添加层切换逻辑 |
| `src/supervisor/supervisor.css` | 更新样式：层切换按钮、AI 配置层卡片布局 |
| `src/supervisor/SupervisorContent.tsx` | 可能需要更新导出 |

不新建文件，在现有文件中重构。

## 10. 不在范围内

- 后端实现（本次只定义 API 契约）
- 数据库 schema 变更
- AI 聊天面板（保留现有实现，不做改动）
- 权限变更（仍然仅 org_admin 可访问）
