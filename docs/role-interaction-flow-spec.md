# Role Interaction Flow Spec

状态：Production flow baseline
日期：2026-05-11
仓库：`aro-network/lumii-fieldwork`
上游方法论：[`docs/agentic-design-methodology.md`](agentic-design-methodology.md)
交互模型：[`docs/ui-interaction-model.md`](ui-interaction-model.md)

## 0. 目的

本文锁定下一版 UI mock 的设计依据：先按真实用户的 interaction flow 设计 production mode，再用 discussion mode 做设计标注。

Production mode 是真实用户进入后看到的真实业务界面。它不展示 Agent 分类解释、surface、capability、policy、flow 编号、use case 编号或权限矩阵。

Discussion mode 是产品设计评审层。它可以作为一个可折叠 panel 或 overlay，标注当前界面对应的 Agent、flow、角色和权限边界，但不得影响 production mode 的默认体验。

## 1. Production mode 验收规则

默认界面必须通过下面的检查：

- 用户一进入页面，就知道自己接下来要处理什么业务。
- 页面按用户当前任务组织，而不是按能力、模块或 Agent 结构组织。
- Agent 只表现为当前任务里的助手、提醒、草稿生成或主动追问，不解释自己的系统分类。
- 权限通过“看不到、点不了、需确认、需审批”体现，不展示权限矩阵。
- 任何 use case / flow 编号只允许出现在 discussion panel 中。

默认界面中出现以下词汇或结构，视为漂移：

- `surface`
- `capability`
- `policy`
- `flow` / `use case` 编号
- `Role entry`
- `谁在跟 Agent 说话`
- `可见数据`
- `禁止事项`
- `For discussion only`
- Agent 架构解释或模式解释

## 2. Discussion mode panel

Discussion mode 是一个产品设计里的可折叠评审 panel。

推荐形态：

- 默认隐藏或折叠。
- 只在评审链接、设计模式或 reviewer toggle 打开后出现。
- 面板不替代业务界面，只解释当前 production screen 的设计来源。
- 面板可以停靠在右侧，也可以作为可收起抽屉。

Panel 内容：

| 字段 | 用途 |
| --- | --- |
| Current role | 当前 production screen 面向哪个用户 |
| Agent coverage | 背后由哪个 Agent 或能力线支持 |
| Business flow | 对应哪条业务 flow，允许出现编号 |
| Agent behavior | Agent 在这里是响应、辅助、委托还是主动 |
| Confirmation point | 哪些动作必须人确认 |
| Permission boundary | 当前用户看不到或不能做什么 |
| Source docs | 链接到 business use case / agentic flow / methodology |

## 3. 站长 / 运营管理者 flow

### 3.1 今日进入

站长打开工作台，不先看到功能菜单，而是看到“今天需要处理什么”。

默认界面：

- 今日服务需求：待确认、待排班、已派单、异常。
- Agent 主动摘要：哪些需求来自内生规则，哪些来自电话/家属/小程序等外生触发。
- 优先处理建议：高风险老人、超时未排、凭证缺口、投诉升级。

Interaction flow：

1. 站长进入今日工作台。
2. 系统展示今日待处理队列，并按风险和时间排序。
3. Agent 主动说明“为什么这几项排在前面”。
4. 站长点开待排班队列。
5. Agent 给出排班草案、冲突和替代方案。
6. 站长确认派单或调整。
7. 派单结果下发给社工，异常和凭证后续回到同一工作台。

Agent 介入：

- 主动生成内生需求。
- 结构化外生需求。
- 生成排班草案。
- 提醒冲突、请假、培训不满足、路线不合理。
- 对派单、改派、取消等动作要求人工确认。

Discussion panel 标注：

- Agent coverage：管理 Agent
- Business flow：F01、F02、F03、F04、F10
- Confirmation point：需求入池、派单、改派、取消、凭证导出

## 4. 社工 flow

### 4.1 出发前到服务完成

社工进入 H5 或小程序后，不看到系统结构，只看到自己今天要做的服务。

默认界面：

- 今日路线和第一站任务。
- 服务前注意事项。
- 必做 SOP。
- 异常入口。
- 服务完成后的记录和凭证补充。

Interaction flow：

1. 社工打开今日任务。
2. 第一站显示老人、时间、地址和服务项目。
3. Agent 主动给出 3-5 条服务前 hint。
4. 社工确认已读并出发。
5. 到达后按 SOP 进行服务。
6. Agent 在漏项、超时、异常时提醒。
7. 社工提交服务记录、照片和异常说明。
8. Agent 生成记录草稿并提醒缺失凭证。
9. 社工补齐后提交。

Agent 介入：

- 服务前主动提醒。
- 服务中少打扰提醒。
- 异常分支引导。
- 服务记录草稿。
- 缺证据提醒。

Discussion panel 标注：

- Agent coverage：督导 Agent
- Business flow：F05、F06、F07、F08、F09
- Confirmation point：服务开始、异常类型、异常处理、服务完成提交

## 5. 服务主管 / 质检 flow

### 5.1 审核和异常闭环

服务主管进入工作台后，首先看到待审核和异常风险，而不是能力列表。

默认界面：

- 待审核服务单。
- SOP 漏项和超时。
- 异常未闭环。
- 凭证缺口。
- 可退回补充或通过审核的队列。

Interaction flow：

1. 服务主管打开审核工作台。
2. 系统按风险展示待审服务。
3. Agent 摘要每单的缺口和建议处理方式。
4. 服务主管查看服务记录和凭证。
5. 对缺项服务退回补充。
6. 对异常服务要求补充处理结论。
7. 对符合规则的服务标记审核通过。

Agent 介入：

- 汇总 SOP 完成度。
- 识别缺照片、缺备注、时长不足、异常未闭环。
- 生成审核摘要。
- 建议退回或通过。

Discussion panel 标注：

- Agent coverage：督导 Agent，合规能力
- Business flow：F06、F07、F08、F09、F10
- Confirmation point：审核通过、退回补充、异常关闭、标记导出就绪

## 6. 客服 / 家属沟通 flow

### 6.1 回访、投诉和家属报告

客服进入工作台后，看到的是家属沟通队列。

默认界面：

- 待回访。
- 投诉处理中。
- 家属消息。
- 服务报告草稿。
- 需要站长或主管介入的事项。

Interaction flow：

1. 客服打开家属沟通工作台。
2. Agent 主动列出需要回访的家庭和原因。
3. 客服点开某个家属会话。
4. Agent 提供服务摘要、近况变化和建议话术。
5. 客服编辑后发送或发起电话回访。
6. 如家属提出新需求，Agent 结构化为外生需求。
7. 如为投诉，Agent 建议升级路径并留痕。

Agent 介入：

- 主动发现高关注家属。
- 生成回访建议和话术草稿。
- 生成家属报告草稿。
- 结构化外生需求。
- 投诉升级提醒。

Discussion panel 标注：

- Agent coverage：洞察 Agent，必要时转管理 Agent
- Business flow：F01、F11、F12、F13
- Confirmation point：报告发送、投诉关闭、需求入池、升级处理

## 7. 家属 flow

### 7.1 查看服务报告和提交需求

家属进入 H5 或小程序后，只看到家属可理解和可访问的内容。

默认界面：

- 本次服务报告。
- 老人近况。
- 注意事项。
- 联系站点。
- 提交需求或投诉。

Interaction flow：

1. 家属收到服务完成推送。
2. 打开本次服务报告。
3. 页面展示服务内容、老人近况和注意事项。
4. 家属可以追问报告内容。
5. Agent 只基于脱敏、已确认内容回答。
6. 家属提交新需求或投诉。
7. Agent 将内容结构化并进入后台队列。

Agent 介入：

- 生成家属可读摘要。
- 回答家属关于本次服务的追问。
- 主动推送已确认报告。
- 收集需求和投诉。

Discussion panel 标注：

- Agent coverage：洞察 Agent
- Business flow：F11、F12、F13
- Permission boundary：不展示内部备注、质检结论、原始转写、其他老人信息

## 8. System Admin flow

### 8.1 配置、渠道和审计

System Admin 进入后台后，看到系统配置和运行状态，不参与具体服务决策。

默认界面：

- 组织和站点。
- 用户和角色。
- 渠道集成。
- Agent 开关和策略。
- 审计日志。

Interaction flow：

1. Admin 进入系统后台。
2. 看到集成状态、权限风险和审计提醒。
3. 配置机构、站点、角色和用户。
4. 配置飞书、企微、小程序、H5 等入口。
5. 调整 Agent 能力开关和输出策略。
6. 查看审计日志和敏感操作。

Agent 介入：

- 提醒渠道失败。
- 提醒权限异常。
- 解释某个 Agent 能力开关影响哪些入口。
- 帮助查审计日志。

Discussion panel 标注：

- Agent coverage：系统管理能力，不是业务 Agent
- Business flow：权限配置、渠道集成、审计日志、Agent 策略
- Permission boundary：默认不查看老人隐私业务内容

## 9. 下一版 UI mock 范围

下一版 UI mock 应优先实现：

1. 站长今日工作台 flow。
2. 社工现场服务 H5 flow。
3. 家属服务报告 flow。
4. 可折叠 Discussion panel。

服务主管、客服和 System Admin 可以先做轻量入口，但不能再以功能清单或权限矩阵作为 production mode 主体。
