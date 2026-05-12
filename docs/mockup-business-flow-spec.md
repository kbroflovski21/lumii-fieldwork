# Mockup Business Flow Spec

状态：mockup production design baseline
日期：2026-05-12
仓库：`aro-network/lumii-fieldwork`

上游文档：

- [`agentic-design-methodology.md`](agentic-design-methodology.md)
- [`business-use-cases.md`](business-use-cases.md)
- [`agentic-flows.md`](agentic-flows.md)
- [`prd-coverage-matrix.md`](prd-coverage-matrix.md)

UI 参考：

- 红配 Agentic UI：`http://124.221.48.52:3000/agent`

## 1. 目标

第一版 mockup 做一条完整 business flow，并且 UI / interaction design 严格 follow 红配 Agentic UI。

Mockup 必须是 production-ready shell：真实用户界面、真实业务状态、真实交互路径和高质量假数据；不接真实后端、不使用真实生产数据。

Production mode 默认呈现给业务用户，不展示矩阵项、flow 编号、Agent 架构解释或设计说明。Discussion mode 默认隐藏，只用于评审时标注当前界面覆盖的矩阵项、flow、权限边界和来源文档。

## 2. 红配 UI Contract

红配不是宽泛灵感参考，而是本 mockup 的 UI contract。

Production UI 必须 follow 红配的核心结构：

```text
左侧窄导航 / 角色或 Agent 切换
  + 顶部 Agent identity / status
  + 中央 Agent conversation stream
      - Agent 主动消息
      - Agent 生成的当前工作产出卡
      - 推送 / 待确认卡
      - 时间戳和业务进展
  + 右侧当前上下文 rail
      - 今日概览
      - 当前关注对象
      - 推荐人员 / 相关对象
      - 活动日志
  + 底部指令输入框
```

所有角色界面都必须先落在这个 Agent-first shell 上，再做业务内容替换。

不得出现：

- 传统 SaaS landing page。
- 角色卡片首页。
- 功能目录式工作台。
- 把 PRD matrix 项直接铺成页面区块。
- 把 Agent 做成页面角落里的聊天框。
- 把社工 H5 做成纯任务表单或 SOP 表格。
- 把重要消息做成独立通知中心。

## 3. 覆盖范围

本 mockup 覆盖以下 PRD matrix 项：

| 矩阵项 | 角色 | Interacting Agent | 覆盖范围 | Flow |
| --- | --- | --- | --- | --- |
| #2 | 站长 / 运营 | 管理 Agent | 需求分诊、排班派单与异常调度 | F01-F04, F07, F10, F12 |
| #8 | 社工 | 督导 Agent | 社工现场任务、服务前提醒与现场 SOP | F05-F08 |
| #10 | 服务主管 / 质检 | 督导 Agent | SOP 漏项、服务日志与异常闭环 | F06-F08 |
| #11 | 服务主管 / 质检 / 审核 / 结算人员 | 管理 Agent / 凭证能力 | 服务凭证审核、导出与结算交接 | F09-F10 |

第一版不覆盖家属 H5、老人洞察、家属报告、投诉闭环和总部复盘。它们可以在后续 mockup 扩展中接入。

## 4. Role Entry Rules

角色登录不是一个可见的卡片首页。静态 mockup 可以用左侧窄导航模拟不同登录角色，但 production mode 必须表现为“用户已登录并进入当前 Agent 工作态”。

| 登录角色 | Agent 协作类型 | 默认进入 | 红配结构中的表现 |
| --- | --- | --- | --- |
| 站长 / 运营 | 多 Agent | 管理 Agent 工作态 | 左侧可切换相关 Agent；中央是管理 Agent 对话流和分诊/排班产出卡；右侧是今日概览、重点老人、推荐社工、活动日志 |
| 社工 | 单 Agent | 督导 Agent 工作态 | 直接进入督导 Agent；中央是服务前 hint、SOP 当前步骤、异常建议和服务记录卡；右侧在桌面预览中呈现当前老人/任务上下文，移动端折叠成上下文 sheet |
| 服务主管 / 质检 | 多 Agent | 督导 Agent 工作态 | 中央是服务记录、漏项提醒、异常闭环建议；右侧是待质检队列、当前服务单证据和活动日志 |
| 审核 / 结算人员 | 单 Agent / 强边界能力 | 凭证能力工作态 | 中央是凭证审核报告、缺证据卡和导出确认卡；右侧是凭证概览、缺口列表和审核留痕 |

单 Agent 角色不得先进入前置页。多 Agent 角色也不得进入传统功能首页；如果需要多 Agent 切换，只能通过红配式左侧窄导航和 Agent 联系人/重要消息进入当前 Agent 工作态。

## 5. 主业务流

第一版 business flow：

```text
管理 Agent 汇总待分诊需求
  -> 站长确认需求进入待排班池
  -> 管理 Agent 生成排班草案
  -> 站长确认派单
  -> 督导 Agent 给社工推送服务前 hint
  -> 社工按督导 Agent 的当前 SOP 执行服务
  -> 督导 Agent 发现 SOP 漏项或异常并提示
  -> 异常升级回站长 / 服务主管
  -> 社工提交服务事实记录草稿
  -> 服务主管 / 质检在督导 Agent 中确认服务记录、证据和异常闭环
  -> 管理 Agent / 凭证能力生成凭证包草案
  -> 审核 / 结算人员处理缺证据、退回或通过
  -> 人工确认后标记结算就绪或导出凭证包
```

Flow 的每一步都要表现为 Agent 推动业务，而不是用户从模块列表里找功能。

## 6. Production UI Surfaces

### 6.1 站长 / 运营：管理 Agent

必须严格 follow 红配：

- 左侧窄导航用于 Agent / 角色切换。
- 顶部显示 `Lumii 管理 Agent`、运行状态和已处理事项。
- 中央是管理 Agent 的消息流：
  - 主动问候和当前批次说明。
  - 分诊报告卡。
  - 排班草案卡。
  - 异常回流卡。
  - 需要人确认的按钮。
- 右侧是当前上下文：
  - 今日概览。
  - 重点老人。
  - 推荐社工。
  - 活动日志。
- 底部是指令输入框，例如“把今天高风险需求优先排给熟悉社工”。

不得做成传统排班后台、需求列表页、dashboard 首页或模块菜单。

### 6.2 社工：督导 Agent

社工是单 Agent 场景，登录后直接进入 `Lumii 督导 Agent`。

必须严格 follow 红配的 Agent-first 结构，并做移动端适配：

- 顶部显示 `Lumii 督导 Agent`、当前服务状态和当前任务。
- 中央是督导 Agent 的消息流：
  - 服务前主动提醒。
  - 服务前 hint 卡。
  - 当前 SOP 卡。
  - 服务中漏项提醒。
  - 异常处理建议卡。
  - 服务事实记录草稿卡。
- 底部是输入/语音入口，例如“老人说头晕，我该怎么处理？”
- 桌面 staging 可以保留右侧上下文 rail；移动端 production view 必须把右侧上下文折叠为当前任务上下文 sheet。

社工界面不得是“今日任务列表 + SOP 表单”。它必须表现为督导 Agent 正在陪社工完成当前这一次上门服务。

### 6.3 服务主管 / 质检：督导 Agent

必须严格 follow 红配：

- 顶部显示 `Lumii 督导 Agent` 和审核状态。
- 中央是督导 Agent 对服务记录的主动汇报：
  - 服务记录摘要卡。
  - SOP 漏项卡。
  - 异常闭环卡。
  - 退回补充 / 确认通过动作。
- 右侧是当前上下文：
  - 待质检队列。
  - 当前服务单证据。
  - 异常处理链路。
  - 活动日志。

不得做成普通质检列表或证据表格。

### 6.4 审核 / 结算：凭证能力

必须严格 follow 红配：

- 顶部显示 `Lumii 凭证能力` 和凭证审核状态。
- 中央是凭证能力的消息流：
  - 凭证审核报告卡。
  - 缺证据卡。
  - 可结算包建议卡。
  - 导出前人工确认卡。
- 右侧是当前上下文：
  - 凭证概览。
  - 缺口列表。
  - 审核留痕。
  - 导出日志。

不得自动对外提交给保险公司或政府。导出、结算就绪和人工豁免都必须明确要求人确认。

## 7. Visual Design Rules

UI design 必须 follow 红配的视觉和布局原则：

- 画面是轻量 Agent workbench，不是传统后台。
- 左侧窄 rail 固定，图标或短字标即可，不显示长菜单。
- 顶部白色 Agent header 固定，强调 Agent identity 和运行状态。
- 中央浅色工作区承载对话流，卡片像 Agent 推送出来的当前工作产出。
- 右侧浅色 context rail 只服务当前 Agent 当前任务。
- 底部输入框常驻，允许用户继续指挥、追问、改指令。
- 卡片圆角、阴影、间距、信息密度要贴近红配，不做营销页、数据大屏或传统 CRM。
- 色彩可以适配 Lumii，但页面结构和交互节奏必须贴红配。

## 8. Data And State

第一版只使用假数据，但假数据必须像生产数据：

- 站点：滨江长者服务站。
- 老人：至少 3 位，包含普通任务、风险任务和异常任务。
- 社工：至少 3 位，包含可用、路线冲突、技能不匹配或请假状态。
- 服务需求：至少 5 条，覆盖电话需求、周期到期、异常复访。
- 上门任务：至少 2 条，覆盖正常服务和现场异常。
- 凭证包：至少 1 个完整、1 个缺证据、1 个异常未闭环。

状态必须贯穿 Agent 消息和卡片：

- 需求从待分诊变为待排班。
- 排班草案变为已派单。
- 社工任务从服务前变为服务中，再变为待质检。
- 异常从待处理变为已升级或已闭环。
- 凭证包从草案变为待审核，再变为结算就绪或退回补充。

## 9. Discussion Mode

Discussion mode 是评审层，不是业务用户默认界面。

Discussion mode 可以作为右侧 rail 的隐藏块，打开后标注：

- 覆盖的 PRD matrix 项。
- 覆盖的 agentic flow。
- 当前登录角色。
- interacting agent。
- 权限边界。
- 来源文档。
- 为什么该界面是单 Agent 或多 Agent。

Production mode 默认不得出现上述设计标注。

## 10. Staging And Deployment

Mockup artifact 放在 `deploy/current/`。

Staging 使用 [`deploy-guide.md`](deploy-guide.md) 中定义的 `http://124.221.48.52:3004/`。`3004` 是本项目 staging 端口。

第一版可以是静态 HTML/CSS/JS，不要求后端服务。页面必须在 staging 上可直接访问，并能通过左侧窄 rail 体验不同角色的 Agent 工作态。

## 11. Acceptance Criteria

- 默认打开 staging 后就是红配式 Agent shell，不是角色卡片首页。
- 站长 / 运营视角像红配：Agent 顶栏、中央消息流/报告卡、右侧上下文、底部指令输入。
- 社工视角仍然 follow 红配：督导 Agent 主导当前服务，不是任务表单。
- 服务主管 / 质检视角仍然 follow 红配：督导 Agent 主动汇报服务记录和异常闭环。
- 审核 / 结算视角仍然 follow 红配：凭证能力主动生成审核报告和导出确认。
- 每个高后果动作都必须人工确认。
- Production mode 不展示设计说明。
- Discussion mode 默认隐藏且可以打开查看覆盖关系。
- 数据是假数据，但状态变化和业务命名像真实生产环境。
