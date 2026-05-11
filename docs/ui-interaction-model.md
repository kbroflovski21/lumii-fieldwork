# UI Interaction Model

状态：Role surface baseline
日期：2026-05-11
仓库：`aro-network/lumii-fieldwork`
上游方法论：[`docs/agentic-design-methodology.md`](agentic-design-methodology.md)
Interaction flow spec：[`docs/role-interaction-flow-spec.md`](role-interaction-flow-spec.md)
UI mock：[`ui-mock/index.html`](../ui-mock/index.html)

## 0. 参考源与防漂移约束

原始产品参考链接：

<http://124.221.48.52:3002/l/PlnMHgwtWwdW1zq7lAvUU2EQ/>

界面形态参考链接：

<http://124.221.48.52:3000/agent>

本文只定义 UI / interaction model，不替代 business use case、agentic use case analysis 或 agentic flow 文档。

## 1. 核心原则

Agent 是能力和责任主体，不是固定页面、固定聊天窗口或固定飞书 bot。

UI 必须按下面的链路设计：

```text
Role / user entry
  -> Surface
  -> Agent capability
  -> Permission policy
```

同一个 Agent 面向不同角色时，必须有不同的 surface、语气、数据权限和动作边界。

默认产品 UI 不显示 use case / flow 编号。编号只允许出现在 Discussion Mode、设计评审 overlay 或内部文档中，并且必须明确标注为评审内容。

Production mode 必须是用户真实进入后看到的业务界面；Discussion mode 是可折叠的设计评审 panel，用来解释当前界面属于哪个 Agent、哪个 flow、哪个权限边界。

## 2. Role surface matrix

| 角色 | 入口 | Surface | 对应 Agent / 模式 | 可见数据 | 可执行动作 | 禁止事项 |
| --- | --- | --- | --- | --- | --- | --- |
| 站长 / 运营管理者 | Web 工作台、企业聊天 | 运营管理面板、排班面板、需求池、异常面板 | 管理 Agent / 运营模式 | 全站需求、排班、社工状态、异常摘要、凭证状态、家属反馈摘要 | 确认需求、派单、改派、关闭需求、导出凭证包、发起回访 | 不能绕过人工确认自动派单；不能看超出授权站点的数据 |
| 社工 | H5 / 小程序、企业聊天 | 今日任务、服务前 hint、现场 SOP、异常处理、服务记录 | 督导 Agent / 现场模式 | 本人任务、老人必要服务信息、SOP、家属授权可见提示 | 确认出发、执行 SOP、补记录、上传照片、标记异常、提交完成 | 不能看全局排班、其他社工任务、内部质检结论、家属敏感反馈 |
| 服务主管 / 质检 | Web 工作台、企业聊天 | SOP 质量面板、服务日志审核、异常复盘、凭证缺口 | 督导 Agent / 审核模式，合规能力 | 服务过程记录、SOP 完成度、异常记录、凭证材料、质量风险 | 审核服务日志、退回补充、确认异常处理、调整 SOP 模板 | 不能直接替站长派单；不能向家属发送未经确认的报告 |
| 客服 / 家属沟通 | Web 工作台、企业聊天 | 回访面板、投诉处理、家属消息、报告草稿 | 洞察 Agent / 客服模式 | 家属反馈、回访历史、服务摘要、老人状态摘要、投诉处理进展 | 发起回访、处理投诉、编辑/发送家属报告草稿、记录外生需求 | 不能看完整现场转写、内部质检备注、未脱敏敏感内容 |
| 家属 | H5 / 小程序、主动推送 | 家属服务报告、老人近况、需求/投诉入口、回访问答 | 洞察 Agent / 家属模式 | 脱敏服务摘要、老人近况、注意事项、已确认报告 | 查看报告、提交需求、提交投诉、回复回访 | 不能看内部备注、社工排班逻辑、其他老人信息、原始转写 |
| System Admin | Admin Console、Admin DM | 机构配置、角色权限、Agent 配置、渠道集成、审计日志 | 系统管理能力，不是业务 Agent | 租户配置、账号、权限、渠道、模型/工具配置、审计日志 | 配置组织、管理权限、配置飞书/企微/小程序、查看系统审计 | 不参与具体服务决策；默认不看老人隐私业务内容，除非有审计授权 |

## 3. Chat count rule

企业聊天通道中的 chat 不按 Agent 数量拆，而按“交互对象 + 场景 + 权限”拆。

示例：

| Chat / conversation context | Agent 模式 | 说明 |
| --- | --- | --- |
| 站长运营群或站长 DM | 管理 Agent / 运营模式 | 需求、排班、派单、异常、凭证导出 |
| 社工 DM 或任务群 | 督导 Agent / 现场模式 | 今日任务、服务前 hint、现场 SOP、异常、补记录 |
| 服务主管 / 质检群 | 督导 Agent / 审核模式 | 服务日志、SOP 漏项、异常闭环、凭证缺口 |
| 客服 / 家属沟通群 | 洞察 Agent / 客服模式 | 回访、投诉、报告草稿、家属反馈 |
| 家属 H5 / 小程序会话 | 洞察 Agent / 家属模式 | 服务报告、老人近况、需求和投诉 |
| Admin DM | 系统管理模式 | 权限、渠道、Agent 开关、审计 |

## 4. UI implications

下一版 UI mock 必须体现：

- 顶层导航按角色入口组织，不按 Agent tab 组织。
- Agent chat 是当前业务流程里的助手，不是全局装饰性浮窗。
- 同一 Agent 在不同 surface 中展示不同数据、动作和语气。
- 社工、家属、System Admin 必须有独立入口，不应看到后台全局 Agent 总览。
- Production mode 不出现 surface、capability、policy、flow 编号、权限矩阵或 Agent 架构解释。
- Use case / flow 编号默认隐藏，只在 Discussion Mode panel 中出现。
- Discussion Mode 必须显著区别于产品 UI，并作为可折叠评审 panel。
