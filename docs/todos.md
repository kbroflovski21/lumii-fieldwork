# TODOs

本文是后续 session 的执行清单。先读 [`README.md`](README.md)，再按本文推进。

## 1. 当前状态

- [`prd-coverage-matrix.md`](prd-coverage-matrix.md) 是 PRD 覆盖矩阵，不是 product design。
- 当前没有有效 UI artifact。
- 红配参考案例只用于理解 Agentic shell，不可机械照搬业务内容或布局。

## 2. 下一步

先确认新的 production design 规则，再做任何页面：

- [ ] 选择一个 PRD 业务覆盖范围。
- [ ] 判断该角色是单 Agent 还是多 Agent 协作。
- [ ] 单 Agent：定义登录后直接进入的 Agent 界面。
- [ ] 多 Agent：定义独立前置页，只包含 Agent contact list 和重要消息。
- [ ] 定义重要消息来自哪个 Agent，以及点击后进入哪个 Agent 界面。
- [ ] 定义该 Agent 界面的 chat、business-specific context views / actions、当前任务和当前上下文。
- [ ] 准备对应 mockup：先落 production mode，再把矩阵项、flow、权限边界和来源文档放进 discussion mode。
- [ ] 部署第一版完整 business-flow mockup 到 staging 3004，覆盖站长 / 运营、社工、质检和审核 / 结算角色。
- [ ] 做 CC review 和 subagent review，重点看 business case 是否覆盖、是否漂移。

## 3. 防漂移要求

1. 只从当前 0/1/2/3 文档链开始。
2. 不把 PRD 覆盖项直接变成页面区块。
3. 不把所有业务信息铺成常驻界面区块。
4. 不把 Agent 做成页面附属聊天框。
5. 不把重要消息做成独立通知中心。
6. 不把部署方式写成产品形态。
