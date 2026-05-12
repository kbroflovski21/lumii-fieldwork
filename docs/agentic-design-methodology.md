# Agentic Service 设计方法论

状态：Methodology baseline
日期：2026-05-11
仓库：`aro-network/lumii-fieldwork`

## 0. 目的

本文锁定本项目的设计方法论，防止后续讨论漂移回传统系统设计方式。

本项目不是传统后台加聊天框，也不是先画页面再补 AI。它是 agentic service：Agent 能响应人，也能主动发现问题、生成草案、追问缺口、推动流程，并在高后果动作前请求人工确认。

给新 session 的最短版本：

```text
先按 docs/README.md 的 0/1/2/3 顺序读。
列矩阵：谁 × 哪个 Agent × 什么权限/场景 × 自治等级。
矩阵每一项 = 一个 PRD 需求覆盖项，不是页面或 UI 数量。
先确认业务责任和 Agent 协作方式，再转译成真实 Agent 界面。
Production mode 是真实用户界面；Discussion mode 只是可折叠标注层。
```

原始需求链接：

<http://124.221.48.52:3002/l/PlnMHgwtWwdW1zq7lAvUU2EQ/>

Agentic shell 参考链接：

<http://124.221.48.52:3000/agent>

红配链接只作为 agentic shell / interaction structure 参考，不作为布局、颜色、panel 结构或具体页面参考。

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
  -> Agent interface / Web-H5-IM surface
```

也就是说，Agent 不是页面里的附属聊天能力，而是业务责任的数字化承担者。

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

### 2.3 Agentic use case analysis

然后把人类工作聚合成责任线，而不是直接按岗位或页面拆 Agent。

必须回答：

- 哪些传统人的责任可以被同一条 Agent 责任线覆盖
- 哪些责任线天然应该合并
- 哪些责任线需要强边界
- 哪些责任线不应成为业务 Agent，而应作为系统护栏

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

最后才设计 Agent 界面、Web/H5/IM surface 和业务上下文承载方式。

UI 不是 Agent 设计的起点，而是 Agent 责任和 flow 的承载方式。

### 2.7 PRD coverage matrix

Agent 在产品里像一个可以联系的对象，类似飞书里的联系人。

矩阵项是 PRD 需求覆盖项，不是 UI 数量或页面数量：

```text
谁 × 哪个 Agent × 什么权限/场景 × 自治等级 = 一个需求覆盖项
```

不要按 Agent 数量、角色数量、矩阵项数量或页面数量推导 UI。Production design 可以把多个业务覆盖范围转译到同一个真实界面，也可以按单 Agent / 多 Agent 入口规则分开处理。

矩阵内容不写在 methodology 里，见 3 号文档 [`docs/prd-coverage-matrix.md`](prd-coverage-matrix.md)。

### 2.8 Production mode and discussion mode

页面实现必须区分 production mode 和 discussion mode。

Production mode 是真实用户进入后看到的真实业务界面。它必须按 interaction flow 组织：用户进来看到什么、下一步做什么、Agent 如何介入、哪里需要确认。Production mode 不展示功能清单、权限矩阵、Agent 架构解释、surface、capability、policy、use case 编号或 flow 编号。

Discussion mode 是产品设计评审层，可以作为可折叠 panel 或 overlay。它用于标注当前 production UI 背后的 Agent、business flow、参与者、权限边界和来源文档。Discussion mode 可以出现编号和设计解释，但必须默认隐藏或显著区别于 production UI。

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
- 如果需要复杂批量处理、审核、排班或凭证查看，应通过链接或快捷入口跳转到外部 web 业务界面。
- 卡片可以作为某些平台的增强体验，但不是核心依赖。
- 不能把“飞书卡片”写成核心产品假设。
- 同一条 agentic flow 应能适配飞书、企微或其他企业聊天入口。

推荐表述：

```text
企业聊天通道：用于接收提醒、自然语言交互、轻量确认和打开外部业务链接。
Web 业务界面：用于复杂配置、批量处理、审核、排班、凭证查看、报表。
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

- 服务凭证与合规结算先作为管理 Agent 下的强边界能力，不急于作为第四个可见 Agent。
- 如果后续直连养护险、政府接口，或凭证审核成为独立团队主流程，再考虑升级为独立合规 Agent。
- 权限、隐私与审计是系统护栏，不包装成普通业务 Agent。

## 6. 反漂移规则

后续讨论必须遵守：

- 不先按页面、菜单或后台模块拆 Agent。
- 不按角色数量、Agent 数量或矩阵项数量推导 UI 数量；先按 PRD 覆盖项确认业务责任，再转译成真实 Agent 界面。
- 不把每个功能点都升级成一个可见 Agent。
- 不把传统岗位一一映射成 Agent。
- 不因为某个能力重要就直接新增 Agent；先判断它是不是独立责任线。
- 不把飞书卡片当作核心产品依赖。
- 不让 Agent 绕过高后果动作确认。
- 不让家属看到内部服务日志、原始敏感转写、社工绩效和审核备注。
- 不让系统用例文档重新成为主线；它只作为能力参考。

## 7. 文档层级

新 session 只需要按 [`docs/README.md`](README.md) 的 0/1/2/3 顺序读：

0. [`docs/agentic-design-methodology.md`](agentic-design-methodology.md) - methodology
1. [`docs/business-use-cases.md`](business-use-cases.md) - business case
2. [`docs/agentic-flows.md`](agentic-flows.md) - agentic flow
3. [`docs/prd-coverage-matrix.md`](prd-coverage-matrix.md) - PRD coverage matrix

当前主线只认 `docs/README.md` 里的 0/1/2/3。
