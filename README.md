# Lumii Fieldwork — 金色年华养老智慧服务平台

智能工牌驱动的社区养老服务管理平台原型。包含多角色页面、AI 语音督导、服务规范管理和质量监控。

## 仓库结构

```
lumii-fieldwork/
├── docs/                          ← 产品设计文档
│   ├── README.md                  ← 文档导航
│   ├── supervisor-page-spec.md    ← 服务主管页面设计规格
│   ├── careworker-page-spec.md    ← 社工/上门服务人员页面设计规格
│   ├── family-page-spec.md        ← 家属页面设计规格
│   ├── quality-manager-page-spec.md ← 集团质量管理页面设计规格
│   ├── global-ui-guidance.md      ← 全局 UI 视觉规范（颜色、字号、组件）
│   ├── system-architecture.md     ← 系统架构
│   ├── business-use-cases.md      ← 业务用例基线
│   ├── agentic-flows.md           ← 智能工牌 Agentic Flow
│   ├── role-ui-design.md          ← 角色 UI 设计（早期版本）
│   ├── demo-spec.md               ← Demo 完整规格
│   ├── product-changes.md         ← 产品变更记录
│   ├── pending-discussion-0517.md ← 待讨论事项
│   ├── deploy-guide.md            ← 部署指南
│   ├── api-contract/              ← API 契约文档
│   ├── domain-knowledge/          ← 领域知识（长护险服务项目等）
│   └── superpowers/               ← 扩展能力规格
│
├── pages/                         ← 各角色独立页面（源代码）
│   ├── supervisor/                ← 服务主管
│   │   ├── supervisor.html        ← 入口
│   │   ├── src/pages/SupervisorPage.tsx  ← 主组件
│   │   ├── src/shared-store.ts    ← 跨页面状态共享
│   │   ├── src/data/              ← Mock 数据
│   │   ├── vite.config.ts         ← 含 LLM API 中间件
│   │   └── README.md
│   │
│   ├── careworker/                ← 社工/上门服务人员
│   │   ├── careworker.html        ← 社工主页入口
│   │   ├── careworkerhardware.html ← 工牌硬件模拟器入口
│   │   ├── src/pages/CareworkerPage.tsx  ← 主组件
│   │   ├── src/pages/hardware.tsx ← 硬件模拟器
│   │   ├── src/components/        ← 10 个子组件
│   │   └── README.md
│   │
│   ├── family/                    ← 家属（移动端 H5）
│   │   ├── index.html             ← 入口
│   │   ├── src/FamilyPage.tsx     ← 主组件
│   │   └── README.md
│   │
│   └── quality/                   ← 集团质量管理
│       ├── index.html             ← 入口
│       ├── src/QMPage.tsx         ← 主组件
│       └── README.md
│
└── README.md                      ← 本文件
```

## 页面一览

| 角色 | 目标用户 | 核心功能 | 在线页面 |
|------|---------|---------|---------|
| **服务主管** | 服务规范管理者 | 管理通用规范和服务项目规范（SOP → 督导要求 → 报告要求），AI 辅助文档管理 | [打开](https://kbroflovski21.github.io/lumii-fieldwork/pages/supervisor/) |
| **社工人员** | 上门服务社工 | 查看任务、语音录音+AI 实时督导、SOP 自动检查、服务报告生成 | [打开](https://kbroflovski21.github.io/lumii-fieldwork/careworker/careworker.html) |
| **工牌模拟器** | （配合社工页面） | 模拟智能工牌硬件行为 | [打开](https://kbroflovski21.github.io/lumii-fieldwork/careworker/careworkerhardware.html) |
| **家属** | 服务对象家属 | 查看服务动态推送、反馈建议（微信 H5 风格） | [打开](https://kbroflovski21.github.io/lumii-fieldwork/pages/family/) |
| **集团质量管理** | 集团质量管控人员 | KPI 监测、站点对比、SOP 完成率、服务记录、AI 质量分析 | [打开](https://kbroflovski21.github.io/lumii-fieldwork/pages/quality/) |

## 设计文档导航

### 页面设计规格（每个页面一份）

- [服务主管](docs/supervisor-page-spec.md) — 三文件结构（SOP/督导/报告）、双路径交互（直接操作+AI 对话）、版本管理
- [社工人员](docs/careworker-page-spec.md) — 任务管理、语音督导、工牌联动
- [家属](docs/family-page-spec.md) — 微信服务号风格推送、客服对话反馈
- [集团质量管理](docs/quality-manager-page-spec.md) — KPI 仪表盘、站点对比、服务记录表格、AI 助手

### 全局规范

- [全局 UI 视觉规范](docs/global-ui-guidance.md) — 颜色 token、字号、间距、阴影、组件定义（Button/Badge/Table/Rich Row/Chat/Drawer 等）
- [系统架构](docs/system-architecture.md) — 整体技术架构

### 业务基线

- [业务用例](docs/business-use-cases.md) — 15 个业务用例，覆盖社区居家养老完整链路
- [Agentic Flow](docs/agentic-flows.md) — 智能工牌驱动的 9 个 Agentic Flow（F01-F09）
- [领域知识](docs/domain-knowledge/) — 长护险 36 项服务技能映射等

### 其他

- [产品变更记录](docs/product-changes.md) — 历次产品评审的变更决策
- [待讨论事项](docs/pending-discussion-0517.md) — 开放讨论事项（工牌状态、AI 助手、通知中心、家属管理等）
- [API 契约](docs/api-contract/) — 前后端接口约定

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | React 18 + TypeScript + Vite |
| 样式 | Tailwind CSS（supervisor/careworker）/ 内联样式（family/quality） |
| LLM | 阿里云 DashScope Qwen3-max（对话、SOP 分析、实时督导） |
| TTS | 阿里云 DashScope CosyVoice V2（语音督导播报） |
| ASR | Web Speech API（浏览器端语音识别） |
| 部署 | GitHub Pages（静态），Vite Dev Server（开发时含 API 中间件） |
| 跨页面状态 | localStorage + BroadcastChannel（shared-store.ts） |

## 本地运行

每个页面是独立的 Vite 项目，进入对应目录即可运行：

```bash
cd pages/supervisor   # 或 careworker / family / quality
npm install
npm run dev
```

服务主管和社工页面在开发模式下通过 Vite 中间件提供 API 端点（`/api/tts`、`/api/supervisor-chat` 等）。

静态部署版本（GitHub Pages）直接从浏览器调用 DashScope API。

## 给 AI Agent 的说明

如果你是 AI 阅读本仓库：

1. **页面设计规格**在 `docs/` 下，每个页面一份 `*-page-spec.md`，这是最权威的产品设计描述
2. **UI 视觉规范**统一定义在 `docs/global-ui-guidance.md`，所有页面遵循此规范
3. **页面源代码**在 `pages/<role>/` 下，每个目录是独立的 Vite 项目
4. **部署产物**在 `gh-pages` 分支，通过 GitHub Pages 提供公网访问
5. **业务用例和 Agentic Flow** 是产品的业务基线，页面设计基于这些文档演化而来
6. 如需了解某个页面的设计意图，先读对应的 spec 文档，再看代码
