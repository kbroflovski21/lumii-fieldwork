# Agentic Service 设计方法论

状态：Methodology baseline
日期：2026-05-11
仓库：`aro-network/lumii-fieldwork`

## 0. 目的

本文锁定本项目的设计方法论，防止后续讨论漂移回传统系统设计方式。

本项目不是传统后台加聊天助手，也不是先画页面再补 AI。它是 agentic service：Agent 能响应人，也能主动发现问题、生成草案、追问缺口、推动流程，并在高后果动作前请求人工确认。

给新 session 的最短版本：

```text
先读业务用例和 agentic flow。
列矩阵：谁 × 哪个 Agent × 什么权限/场景 × 自治等级。
矩阵每一项 = 一个 UI / Chat context。
每个 UI / Chat context 先写 production interaction flow，再画 UI。
Production mode 是真实用户界面；Discussion mode 只是可折叠标注层。
```

原始产品参考链接：

<http://124.221.48.52:3002/l/PlnMHgwtWwdW1zq7lAvUU2EQ/>

界面形态参考链接：

<http://124.221.48.52:3000/agent>

## 1. 核心方法

传统系统设计通常是：

```text
业务用例 -> 系统功能 -> 页面 / 模块 -> 自动化点
```

本项目采用：

```text
业务用例
  -> 没有系统时由哪些人做
  -> 这些人承担什么责任
  -> 哪些责任可以被 Agent 响应、辅助、委托或自主推进
  -> 责任线聚合
  -> Agentic flow
  -> Agent 分类
  -> UI / dashboard / panel / H5 / chat channel
```

也就是说，Agent 不是页面里的附属助手，而是业务责任的数字化承担者。

## 2. 设计步骤

### 2.1 Business use case

先分析真实业务，不谈系统，不谈 Agent。

必须回答：

- 业务参与者是谁
- 业务目标是什么
- 触发条件是什么
- 输入是什么
- 业务过程是什么
- 产出是什么
- 异常是什么

当前基线文档：

- [`docs/business-use-cases.md`](business-use-cases.md)

### 2.2 Human-to-Agent substitution

再分析没有系统时，人类角色实际做什么。

必须回答：

- 哪些人类角色存在
- 每个角色现在做什么工作
- 哪些工作可以被 Agent 辅助
- 哪些工作可以委托给 Agent
- 哪些工作可以让 Agent 主动做
- 哪些动作必须人确认

当前基线文档：

- [`docs/human-agent-substitution.md`](human-agent-substitution.md)

### 2.3 Agentic use case analysis

然后把人类工作聚合成责任线，而不是直接按岗位或页面拆 Agent。

必须回答：

- 哪些传统人的责任可以被同一条 Agent 责任线覆盖
- 哪些责任线天然应该合并
- 哪些责任线需要强边界
- 哪些责任线不应成为业务 Agent，而应作为系统护栏

当前基线文档：

- [`docs/agentic-use-case-analysis.md`](agentic-use-case-analysis.md)

### 2.4 Agentic flow

再进入具体流程。

每条 flow 必须说明：

- 触发来源：人发起、Agent 主动发现、外部事件、定时任务
- 所属责任线
- 涉及传统角色
- 自治等级
- Agent 做什么
- 人在哪里确认
- 输出在哪里呈现
- 审计和隐私要求

### 2.5 Agent definition

等 agentic flow 稳定后，再定义可见 Agent。

每个 Agent 必须说明：

- 使命
- 覆盖责任线
- 可响应的问题
- 可主动发现的事件
- 可委托执行的任务
- 必须人工确认的动作
- 可读写的数据
- 权限和审计边界
- 在聊天通道和 web 业务界面中的表现

### 2.6 UI / interaction design

最后才设计页面、dashboard、panel、H5 和聊天入口。

UI 不是 Agent 设计的起点，而是 Agent 责任和 flow 的承载方式。

### 2.7 UI / Chat context matrix

Agent 在产品里像一个可以联系的对象，类似飞书里的联系人。

UI 数量按这个矩阵定：

```text
谁 × 哪个 Agent × 什么权限/场景 × 自治等级 = 一个 UI / Chat context
```

不要按 Agent 数量、角色数量或页面数量推导 UI。

MVP 先按 15 个 UI / Chat context 设计：

| # | 谁 | Agent | 权限/场景 | 自治等级 | UI / Chat context |
| --- | --- | --- | --- | --- | --- |
| 1 | 机构 / 总部 | 管理 Agent / 洞察 Agent | 跨站质量、服务量、投诉率、凭证通过率 | Copilot / Delegated | 总部运营复盘 |
| 2 | 站长 / 运营 | 管理 Agent | 需求、排班、派单、异常 | Copilot / Delegated / Full autonomous | 运营调度工作台 |
| 3 | 站长 / 运营 | 洞察 Agent | 老人趋势、家属反馈、回访建议 | Copilot / Full autonomous | 站长洞察面板 |
| 4 | 站长 / 调度 | 管理 Agent | 社工资料、班次、请假、替班、可用性 | Copilot / Delegated | 社工管理台 |
| 5 | 站长 / 客服 | 管理 Agent | 老人档案、家属授权、服务资格、服务频次 | Copilot / Delegated | 老人 / 家属档案台 |
| 6 | 服务主管 / SOP 负责人 | 督导 Agent | 服务项目、SOP、异常分支、凭证要求 | Copilot / Delegated | SOP / 服务项目规则台 |
| 7 | 服务主管 / 培训负责人 | 督导 Agent | 培训资料、新 SOP、新规则、培训状态 | Copilot / Delegated / Full autonomous | 培训管理台 |
| 8 | 社工 | 督导 Agent | 今日任务、服务前 hint、现场 SOP | Copilot / Full autonomous | 社工现场 H5 |
| 9 | 社工 | 督导 Agent | 查手册、学习新 SOP、服务规范问答 | Copilot | 社工查手册 / 学习 Chat |
| 10 | 服务主管 / 质检 | 督导 Agent | SOP 漏项、服务日志、异常闭环 | Copilot / Delegated | 质检审核台 |
| 11 | 服务主管 / 质检 | 管理 Agent / 凭证能力 | 服务凭证、导出前审核 | Copilot / Delegated | 凭证审核台 |
| 12 | 客服 / 接线 | 管理 Agent | 外生需求受理、投诉入池 | Copilot / Delegated | 接线 / 需求受理台 |
| 13 | 客服 / 家属沟通 | 洞察 Agent | 回访、报告草稿、投诉沟通 | Copilot / Delegated / Full autonomous | 家属沟通台 |
| 14 | 家属 | 洞察 Agent | 服务报告、老人近况、提交需求 | Copilot | 家属 H5 / 小程序 |
| 15 | System Admin | 系统管理能力 | 组织、账号、渠道、权限、审计 | Copilot / Delegated | Admin Console |

每个 UI / Chat context 都必须先设计 production interaction flow，再决定是否需要外链 panel、H5 或 dashboard。

### 2.8 Production mode and discussion mode

UI mock 必须区分 production mode 和 discussion mode。

Production mode 是真实用户进入后看到的真实业务界面。它必须按 interaction flow 组织：用户进来看到什么、下一步做什么、Agent 如何介入、哪里需要确认。Production mode 不展示功能清单、权限矩阵、Agent 架构解释、surface、capability、policy、use case 编号或 flow 编号。

Discussion mode 是产品设计评审层，可以作为可折叠 panel 或 overlay。它用于标注当前 UI / Chat context 背后的 Agent、business flow、参与者、权限边界和来源文档。Discussion mode 可以出现编号和设计解释，但必须默认隐藏或显著区别于 production UI。

判定规则：

```text
Production mode = 真实用户界面
Discussion mode = 设计评审标注层
```

如果默认界面看起来像方法论文档、功能罗列或权限矩阵，而不是用户正在完成的业务流程，则视为漂移。

## 3. 自治等级

| 等级 | 定义 | 适用范围 |
| --- | --- | --- |
| Human-only | 必须由人完成，Agent 只能提供上下文 | 线下照护、最终责任判断、高风险外部沟通 |
| Copilot | 人发起，Agent 辅助理解、查询、总结、校验、建议 | 查手册、接线结构化、审核摘要、报告解释 |
| Delegated | 人授权目标后，Agent 执行一组任务并回报结果 | 排班草案、凭证包草案、回访任务草案、运营摘要 |
| Full autonomous | Agent 主动发现、主动创建待办或低风险产物，但必须留痕 | 到期提醒、缺证据提醒、未排需求提醒、培训提醒 |

高后果动作默认需要人工确认：

- 派单、改派、取消
- SOP 发布、规则变更
- 服务结束、异常关闭
- 审核通过、退回补充、标记结算就绪
- 凭证包导出、对外提交
- 家属报告发送
- 投诉关闭
- 权限变更和敏感导出

## 4. 企业聊天通道原则

本项目需要进入飞书、企微等多个企业聊天通道，因此设计不得绑定某一个聊天平台的特定 UI 能力。

原则：

- 企业聊天通道本质是 chat-based entry point。
- Agent 在聊天通道中主要通过文字、语音、文件、链接和必要的轻量交互承载工作。
- 如果需要复杂 dashboard、control panel、审核台、排班台或凭证面板，应通过链接或快捷入口跳转到外部 web 业务界面。
- 卡片可以作为某些平台的增强体验，但不是核心依赖。
- 不能把“飞书卡片”写成核心产品假设。
- 同一条 agentic flow 应能适配飞书、企微或其他企业聊天入口。

推荐表述：

```text
企业聊天通道：用于接收提醒、自然语言交互、轻量确认和打开外部业务链接。
Web 业务界面：用于复杂配置、批量处理、审核、排班、凭证查看、报表和 dashboard。
H5：用于社工现场服务和家属报告。
```

## 5. 当前责任线建议

当前建议的责任线：

- 服务规范与现场督导
- 运营管理与调度
- 服务凭证与合规结算
- 家属沟通、回访与老人洞察
- 权限、隐私与审计护栏

当前建议的可见 Agent：

- 督导 Agent
- 管理 Agent
- 洞察 Agent

当前建议的特殊处理：

- 服务凭证与合规结算在 MVP 中先作为管理 Agent 下的强边界能力，不急于作为第四个可见 Agent。
- 如果后续直连养护险、政府接口，或凭证审核成为独立团队主流程，再考虑升级为独立合规 Agent。
- 权限、隐私与审计是系统护栏，不包装成普通业务 Agent。

## 6. 反漂移规则

后续讨论必须遵守：

- 不先按页面、菜单或后台模块拆 Agent。
- 不按角色数量推导 UI 数量；先按 UI / Chat context 拆 interaction flow。
- 不把每个功能点都升级成一个可见 Agent。
- 不把传统岗位一一映射成 Agent。
- 不因为某个能力重要就直接新增 Agent；先判断它是不是独立责任线。
- 不把飞书卡片当作核心产品依赖。
- 不让 Agent 绕过高后果动作确认。
- 不让家属看到内部服务日志、原始敏感转写、社工绩效和审核备注。
- 不让系统用例文档重新成为主线；它只作为能力参考。

## 7. 文档层级

新 session 只需要按这个顺序读：

1. [`docs/agentic-design-methodology.md`](agentic-design-methodology.md) - 方法论总锚点
2. [`docs/business-use-cases.md`](business-use-cases.md) - 业务用例基线
3. [`docs/agentic-flows.md`](agentic-flows.md) - Agentic flow baseline

必要时再查：

- [`docs/human-agent-substitution.md`](human-agent-substitution.md)
- [`docs/agentic-use-case-analysis.md`](agentic-use-case-analysis.md)

已降级为参考：

- [`docs/system-use-cases.md`](system-use-cases.md)
- [`docs/ui-interaction-model.md`](ui-interaction-model.md) - 早期 UI 交互草稿，已被本文 15 项矩阵取代
- [`docs/role-interaction-flow-spec.md`](role-interaction-flow-spec.md) - 已被 UI / Chat context 矩阵取代，保留为过程草稿

后续重写产品设计文档时，应以上述文档为上游，不应继续在旧 `docs/product-design.md` 上局部修补。
