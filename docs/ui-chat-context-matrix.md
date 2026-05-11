# UI / Chat Context Matrix

状态：Matrix baseline
日期：2026-05-12
仓库：`aro-network/lumii-fieldwork`
上游文档：

- 0 号：[`agentic-design-methodology.md`](agentic-design-methodology.md)
- 1 号：[`business-use-cases.md`](business-use-cases.md)
- 2 号：[`agentic-flows.md`](agentic-flows.md)

## 1. 规则

UI / Chat context 数量按这个矩阵定：

```text
谁 × 哪个 Agent × 什么权限/场景 × 自治等级 = 一个 UI / Chat context
```

每个矩阵项都要有对应 design spec。Production mode 是真实用户界面；Discussion mode 只是可折叠标注层。

每个 design spec 必须包含：

- Production interaction flow：真实用户从进入到完成任务的连续流程。
- Agent behavior：Agent 何时响应、何时主动提醒、何时生成草稿。
- Confirmation points：哪些动作必须人确认。
- Production UI：真实用户默认看到什么。
- Discussion mode：可折叠标注 panel 显示哪个 Agent、flow、权限边界和来源文档。

## 2. MVP 矩阵

| # | 谁 | Agent | 权限/场景 | 自治等级 | UI / Chat context | 覆盖 flow |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 机构 / 总部 | 管理 Agent / 洞察 Agent | 跨站质量、服务量、投诉率、凭证通过率 | Copilot / Delegated | 总部运营复盘 | F09-F13 |
| 2 | 站长 / 运营 | 管理 Agent | 需求、排班、派单、异常 | Copilot / Delegated / Full autonomous | 运营调度工作台 | F01-F04, F07, F10, F12 |
| 3 | 站长 / 运营 | 洞察 Agent | 老人趋势、家属反馈、回访建议 | Copilot / Full autonomous | 站长洞察面板 | F11-F13 |
| 4 | 站长 / 调度 | 管理 Agent | 社工资料、班次、请假、替班、可用性 | Copilot / Delegated | 社工管理台 | F04 |
| 5 | 站长 / 客服 | 管理 Agent | 老人档案、家属授权、服务资格、服务频次 | Copilot / Delegated | 老人 / 家属档案台 | F01-F03 |
| 6 | 服务主管 / SOP 负责人 | 督导 Agent | 服务项目、SOP、异常分支、凭证要求 | Copilot / Delegated | SOP / 服务项目规则台 | F05-F07, F14 |
| 7 | 服务主管 / 培训负责人 | 督导 Agent | 培训资料、新 SOP、新规则、培训状态 | Copilot / Delegated / Full autonomous | 培训管理台 | F14 |
| 8 | 社工 | 督导 Agent | 今日任务、服务前 hint、现场 SOP | Copilot / Full autonomous | 社工现场 H5 | F05-F08 |
| 9 | 社工 | 督导 Agent | 查手册、学习新 SOP、服务规范问答 | Copilot | 社工查手册 / 学习 Chat | F14 |
| 10 | 服务主管 / 质检 | 督导 Agent | SOP 漏项、服务日志、异常闭环 | Copilot / Delegated | 质检审核台 | F06-F08 |
| 11 | 服务主管 / 质检 | 管理 Agent / 凭证能力 | 服务凭证、导出前审核 | Copilot / Delegated | 凭证审核台 | F09-F10 |
| 12 | 客服 / 接线 | 管理 Agent | 外生需求受理、投诉入池 | Copilot / Delegated | 接线 / 需求受理台 | F01, F12 |
| 13 | 客服 / 家属沟通 | 洞察 Agent | 回访、报告草稿、投诉沟通 | Copilot / Delegated / Full autonomous | 家属沟通台 | F11-F13 |
| 14 | 家属 | 洞察 Agent | 服务报告、老人近况、提交需求 | Copilot | 家属 H5 / 小程序 | F11-F13 |
| 15 | System Admin | 系统管理能力 | 组织、账号、渠道、权限、审计 | Copilot / Delegated | Admin Console | 系统护栏 |

## 3. 不做独立 UI 的 MVP 范围

| 对象 | 原因 |
| --- | --- |
| 老人本人 | Human-only，主要通过社工现场服务表达状态和需求 |
| 保险公司 / 政府 | MVP 只导出凭证包，不直连外部核验系统 |
| 120 / 外部紧急机构 | 属于 SOP 异常分支，不做独立产品入口 |

## 4. 交叉界面规则

不同 design spec 可能共享同一类界面或组件，例如：

- 运营调度工作台、社工管理台、老人 / 家属档案台都可能在同一个站长后台里。
- 质检审核台和凭证审核台可能共享审核列表和服务单详情。
- 家属沟通台和家属 H5 可能共享报告摘要，但权限完全不同。

处理规则：

- Spec 必须按矩阵项分开写，不要因为 UI 复用就合并 spec。
- UI 可以复用同一个 shell、列表、详情页或组件。
- 复用 UI 时必须明确当前 context：谁在用、跟哪个 Agent 交互、权限/场景是什么。
- Production mode 不展示矩阵、Agent 架构或 flow 编号。
- Discussion mode 负责标注当前 UI 同时覆盖了哪些矩阵项和 flow。

## 5. 防漂移检查

每完成一个 spec 或 mock，检查：

- 是否能追溯到 3 号矩阵中的某一项。
- 是否覆盖了对应 business use case 和 agentic flow。
- 是否先写 production interaction flow，再写 UI。
- 是否把 discussion 内容放在可折叠 panel，而不是默认界面。
- 是否没有把功能清单当成真实用户界面。
