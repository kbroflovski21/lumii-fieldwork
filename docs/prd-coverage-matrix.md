# PRD Coverage Matrix

状态：PRD coverage baseline，不是 product design
日期：2026-05-12
仓库：`aro-network/lumii-fieldwork`
上游文档：

- 0 号：[`agentic-design-methodology.md`](agentic-design-methodology.md)
- 1 号：[`business-use-cases.md`](business-use-cases.md)
- 2 号：[`agentic-flows.md`](agentic-flows.md)

## 1. 用途和边界

本文是 PRD/需求覆盖矩阵，只说明谁和哪个 Agent 在什么业务场景下交互，用于追溯业务用例、权限边界、自治等级和 flow 覆盖。

本文不是产品设计，不能用于决定：

- 产品导航或信息架构
- 页面数量或页面标题
- 可见 UI 文案、按钮文案或卡片标题
- 组件布局、视觉层级或端侧页面呈现方式

需求覆盖项按这个矩阵识别：

```text
谁 × 哪个 Agent × 什么权限/场景 × 自治等级 = 一个需求覆盖项
```

每个矩阵项都必须被后续 production product design 覆盖，但矩阵项本身不是一个产品页面。Production design 的起点是：用户登录后进入哪个 Agent 的当前工作态、Agent 正在推动什么业务任务、人需要在哪一步介入，以及当前任务需要哪些业务上下文。

每个 production design 必须包含：

- Production interaction flow：真实用户从进入到完成任务的连续流程。
- Agent behavior：Agent 何时响应、何时主动提醒、何时生成草稿。
- Confirmation points：哪些动作必须人确认。
- Production UI：真实用户默认看到什么；不得照搬矩阵字段、Agent 架构词、渠道说明或 context 名。
- Discussion mode：可折叠标注 panel 显示哪个 Agent、flow、权限边界和来源文档。

## 2. Agentic interaction assumptions

这些是后续 production design 的约束，不是页面设计：

- Agent 是业务联系人和流程推动者，不是页面里的附属聊天框。
- Web、H5、飞书、企微都是同一个 Agent 工作流的不同 surface。
- Agent 可以在企业 IM 中作为联系人或群成员主动提醒、追问缺口、推送草稿、请求确认；复杂操作再打开 Web 或 H5 业务界面。
- 只需要和一个 Agent 协作的用户，登录后应直接进入该 Agent 界面：chat 是主入口，旁边或下方配该业务场景 specific context views / actions。
- 需要和多个 Agent 协作的用户，登录后应先进入独立前置页。前置页只显示 Agent contact list 和重要消息，不承载具体业务界面。
- Agent contact list 是联系人列表，不是功能目录。它只展示该角色可协作的 Agent、未读/待确认状态、最近推动的业务任务和进入对应 Agent 界面的入口。
- 从前置页进入某个 Agent 后，主界面只呈现该 Agent 的 chat、业务 specific context views / actions、任务产出和上下文；其他 Agent 保持为联系人、handoff 目标或后台能力，不并列铺成业务区域。
- 重要消息必然来自某个 Agent，不是独立通知中心。用户点击重要消息时，应进入来源 Agent 的对应界面，并带上该消息关联的业务任务上下文。
- 业务信息必须围绕 Agent 当前推动的任务、步骤或产出组织。不要把 PRD 覆盖项、功能清单、所有可能信息一次性铺开。
- 人的介入点是确认、补充、追问、改指令和处理高后果动作，不是从模块列表里自行寻找功能。

### 2.1 参考案例：红配运营中台派单 Agent

参考链接：<http://124.221.48.52:3000/agent>

红配案例是运营中台的 agentic UI，不是现场端 UI。它的核心逻辑是：

- 用户进入后直接看到 Agent 工作态，而不是传统后台功能目录。
- Agent 主动汇报当前批次工单处理结果，例如分拣、派单、异常识别。
- 主区域呈现 Agent 当前产出的工作结果卡，例如分拣报告。
- 右侧上下文只服务于 Agent 当前工作，例如今日概览、异常单、推荐师傅、活动日志。
- 底部输入框让人继续指挥 Agent、追问原因或调整结果。

可复用的是 agentic 结构：Agent 先推动工作，界面围绕 Agent 当前产出和上下文组织，人再确认或改指令。不可复用的是具体中台布局；不能把红配的右侧上下文和批量工单形态机械套到现场角色。

### 2.2 中台型与现场型

中台型场景适用于站长、运营、客服、质检、结算等角色，通常处理队列、批量对象、审核、调度和异常。Production design 应围绕 Agent 当前产出、待确认事项和相关业务上下文组织，例如派单、分拣、接线入池、异常处理。

现场型场景适用于社工、安装师傅、家属等端侧角色，通常面对一个当前任务或一次当前服务。Production design 应围绕 Agent 当前任务步骤和少量必要上下文组织，例如社工现场服务、安装师傅上门作业、家属查看当前报告。

## 3. MVP PRD 覆盖矩阵

| # | 谁 | Agent | 权限/场景 | 自治等级 | 业务覆盖范围 | 覆盖 flow |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 机构 / 总部 | 管理 Agent / 洞察 Agent | 跨站质量、服务量、投诉率、凭证通过率 | Copilot / Delegated | 跨站质量、服务量、投诉率与凭证通过率复盘 | F09-F13 |
| 2 | 站长 / 运营 | 管理 Agent | 需求、排班、派单、异常 | Copilot / Delegated / Full autonomous | 需求分诊、排班派单与异常调度 | F01-F04, F07, F10, F12 |
| 3 | 站长 / 运营 | 洞察 Agent | 老人趋势、家属反馈、回访建议 | Copilot / Full autonomous | 老人趋势洞察、家属反馈与回访建议 | F11-F13 |
| 4 | 站长 / 调度 | 管理 Agent | 社工资料、班次、请假、替班、可用性 | Copilot / Delegated | 社工资料、班次、请假、替班与可用性 | F04 |
| 5 | 站长 / 客服 | 管理 Agent | 老人档案、家属授权、服务资格、服务频次 | Copilot / Delegated | 老人档案、家属授权、服务资格与服务频次 | F01-F03 |
| 6 | 服务主管 / SOP 负责人 | 督导 Agent | 服务项目、SOP、异常分支、凭证要求 | Copilot / Delegated | 服务项目、SOP、异常分支与凭证规则 | F05-F07, F14 |
| 7 | 服务主管 / 培训负责人 | 督导 Agent | 培训资料、新 SOP、新规则、培训状态 | Copilot / Delegated / Full autonomous | 培训资料、新 SOP、新规则与培训状态 | F14 |
| 8 | 社工 | 督导 Agent | 今日任务、服务前 hint、现场 SOP | Copilot / Full autonomous | 社工现场任务、服务前提醒与现场 SOP | F05-F08 |
| 9 | 社工 | 督导 Agent | 查手册、学习新 SOP、服务规范问答 | Copilot | 社工规范问答与新 SOP 学习 | F14 |
| 10 | 服务主管 / 质检 | 督导 Agent | SOP 漏项、服务日志、异常闭环 | Copilot / Delegated | SOP 漏项、服务日志与异常闭环 | F06-F08 |
| 11 | 服务主管 / 质检 / 审核 / 结算人员 | 管理 Agent / 凭证能力 | 服务凭证、导出前审核、结算交接 | Copilot / Delegated | 服务凭证审核、导出与结算交接 | F09-F10 |
| 12 | 客服 / 接线 | 管理 Agent | 外生需求受理、投诉入池 | Copilot / Delegated | 外生需求受理与投诉入池 | F01, F12 |
| 13 | 客服 / 家属沟通 | 洞察 Agent | 回访、报告草稿、投诉沟通 | Copilot / Delegated / Full autonomous | 家属回访、报告草稿与投诉沟通 | F11-F13 |
| 14 | 家属 | 洞察 Agent | 服务报告、老人近况、提交需求 | Copilot | 家属服务报告、老人近况与需求提交 | F11-F13 |
| 15 | System Admin | 系统管理能力 | 站点初始化、组织、账号、渠道、权限、审计 | Copilot / Delegated | 站点初始化、组织账号、渠道权限与审计 | 系统护栏 |

## 4. 不做独立 UI 的 MVP 范围

| 对象 | 原因 |
| --- | --- |
| 老人本人 | Human-only，主要通过社工现场服务表达状态和需求 |
| 保险公司 / 政府 | MVP 只导出凭证包，不直连外部核验系统 |
| 120 / 外部紧急机构 | 属于 SOP 异常分支，不做独立产品入口 |

## 5. 交叉界面规则

不同业务覆盖范围可能落在同一个真实产品界面里，例如：

- 需求分诊、排班派单、社工可用性和老人服务资格可能由同一运营角色连续处理。
- SOP 漏项、服务日志、凭证审核和结算交接可能共享同一服务单详情。
- 家属回访、报告草稿和投诉沟通可能共享同一老人 / 家属关系上下文，但权限完全不同。

处理规则：

- Product design 可以复用同一个 shell、列表、详情页或组件。
- Spec 必须说明该真实产品界面覆盖了哪些 PRD 业务覆盖范围，但不能把矩阵项直接变成可见页面。
- 复用 UI 时必须在 spec 内部明确当前覆盖项：谁在用、跟哪个 Agent 交互、权限/场景是什么。
- Production mode 不展示矩阵、Agent 架构或 flow 编号。
- Discussion mode 负责标注当前 UI 同时覆盖了哪些矩阵项和 flow。

## 6. 防漂移检查

每完成一个 spec 或页面实现，检查：

- 是否能追溯到 3 号矩阵中的某一项。
- 是否覆盖了对应 business use case 和 agentic flow。
- 是否先写 production interaction flow，再写 UI。
- 是否把 discussion 内容放在默认界面之外，而不是混进 production UI。
- 是否没有把功能清单当成真实用户界面。
- 单 Agent 角色是否登录后直接进入该 Agent 界面，而不是先进入前置页。
- 多 Agent 角色是否先进入独立前置页，且前置页只包含 Agent contact list 和重要消息。
- 重要消息是否能追溯到来源 Agent，并点击进入该 Agent 的对应界面。
- 是否只展示当前任务、步骤或 Agent 产出需要的上下文，而不是把所有 PRD 覆盖项罗列成界面区块。
- 是否把企业 IM 理解为 Agent 的协作 surface，而不是另一个独立产品模块。
